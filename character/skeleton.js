// 2D stick-figure skeleton for the player. Local bone angles use radians
// with 0 = straight down (+Y in canvas space).

const PLAYER_HEAD_RADIUS = 5;
const PLAYER_HIP_OFFSET_Y = -18;

const DEFAULT_POSE = {
    torso: Math.PI,
    head: 0,
    upperArmL: 2.35,
    lowerArmL: 0.35,
    upperArmR: -2.35,
    lowerArmR: -0.35,
    upperLegL: 0.28,
    lowerLegL: -0.08,
    upperLegR: -0.28,
    lowerLegR: 0.08
};

const ALL_BONE_NAMES = [
    'torso',
    'head',
    'upperArmL',
    'lowerArmL',
    'upperArmR',
    'lowerArmR',
    'upperLegL',
    'lowerLegL',
    'upperLegR',
    'lowerLegR'
];

function createPlayerSkeleton() {
    return {
        name: 'hips',
        length: 0,
        children: [
            {
                name: 'torso',
                length: 14,
                children: [
                    { name: 'head', length: 6, isHead: true, children: [] }
                ]
            },
            {
                name: 'upperArmL',
                length: 8,
                children: [
                    { name: 'lowerArmL', length: 7, children: [] }
                ]
            },
            {
                name: 'upperArmR',
                length: 8,
                children: [
                    { name: 'lowerArmR', length: 7, children: [] }
                ]
            },
            {
                name: 'upperLegL',
                length: 10,
                children: [
                    { name: 'lowerLegL', length: 10, children: [] }
                ]
            },
            {
                name: 'upperLegR',
                length: 10,
                children: [
                    { name: 'lowerLegR', length: 10, children: [] }
                ]
            }
        ]
    };
}

function boneAngle(pose, boneName) {
    if (pose && pose[boneName] != null) {
        return pose[boneName];
    }
    return DEFAULT_POSE[boneName] ?? 0;
}

function tipFromJoint(x, y, angle, length) {
    return {
        x: x + Math.sin(angle) * length,
        y: y + Math.cos(angle) * length
    };
}

function solveBone(bone, parentX, parentY, parentAngle, pose, result) {
    const localAngle = boneAngle(pose, bone.name);
    const worldAngle = parentAngle + localAngle;
    const startX = parentX;
    const startY = parentY;
    const end = tipFromJoint(startX, startY, worldAngle, bone.length);

    result.joints[bone.name] = { x: startX, y: startY };
    if (bone.length > 0 && !bone.isHead) {
        result.segments.push({
            name: bone.name,
            x1: startX,
            y1: startY,
            x2: end.x,
            y2: end.y
        });
        result.joints[`${bone.name}Tip`] = { x: end.x, y: end.y };
    }

    if (bone.isHead) {
        result.head = { x: end.x, y: end.y, radius: PLAYER_HEAD_RADIUS };
    }

    for (const child of bone.children ?? []) {
        solveBone(child, end.x, end.y, worldAngle, pose, result);
    }
}

function solvePose(skeleton, pose, rootX, rootY) {
    const result = {
        joints: { hips: { x: rootX, y: rootY } },
        segments: [],
        head: null
    };

    for (const child of skeleton.children ?? []) {
        solveBone(child, rootX, rootY, 0, pose, result);
    }

    return result;
}

function footSpanFromSolved(solved) {
    const leftFoot = solved.joints.lowerLegLTip;
    const rightFoot = solved.joints.lowerLegRTip;
    if (!leftFoot || !rightFoot) {
        return { left: 0, right: 0, span: 0, centerX: 0 };
    }

    const left = Math.min(leftFoot.x, rightFoot.x);
    const right = Math.max(leftFoot.x, rightFoot.x);
    return {
        left,
        right,
        span: right - left,
        centerX: (left + right) / 2
    };
}

function measureFootSpan(skeleton, pose, hipOffsetY = PLAYER_HIP_OFFSET_Y) {
    const solved = solvePose(skeleton, pose, 0, hipOffsetY);
    return footSpanFromSolved(solved);
}

function collectIdleReferencePoses(idleAnimation) {
    const poses = [mergePose(null, null)];
    if (idleAnimation && idleAnimation.keyframes) {
        for (const frame of idleAnimation.keyframes) {
            poses.push(mergePose(null, frame.angles));
        }
    }
    return poses;
}

function computePlayerColliderWidth(skeleton, idleAnimation) {
    let maxSpan = 0;
    for (const pose of collectIdleReferencePoses(idleAnimation)) {
        maxSpan = Math.max(maxSpan, measureFootSpan(skeleton, pose).span);
    }
    return Math.max(1, Math.ceil(maxSpan));
}

function mergePose(basePose, overridePose) {
    const merged = { ...DEFAULT_POSE, ...basePose };
    if (overridePose) {
        for (const name of ALL_BONE_NAMES) {
            if (overridePose[name] != null) {
                merged[name] = overridePose[name];
            }
        }
    }
    return merged;
}
