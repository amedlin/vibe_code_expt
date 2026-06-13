// Pose keyframe angles are local to each bone's parent. Upper arms attach
// partway up the torso (see PLAYER_SHOULDER_ATTACH_T), so upperArmL/R are
// relative to the torso. World 0 = straight down (+Y). Idle rest spreads arms
// slightly outward (world ≈ ±0.45 rad) as if facing the player.

const PLAYER_SKELETON = createPlayerSkeleton();

function poseClip(name, frames, looping = true) {
    return new PoseAnimation(
        name,
        frames.map((frame) => new PoseKeyframe(frame.duration, frame.angles)),
        looping
    );
}

// One limb cycle per chain; opposite side uses the same cycle π out of phase
// (half the phase count, e.g. frame i + 4 mod 8).
function buildContralateralGaitClip(name, { arm, leg, durations, torsoLean }, looping = true) {
    const count = durations.length;
    const halfCycle = count / 2;
    const atPhase = (cycle, index) => cycle[((index % count) + count) % count];

    const frames = durations.map((duration, index) => {
        const armLeft = atPhase(arm, index);
        const armRight = atPhase(arm, index + halfCycle);
        const legLeft = atPhase(leg, index);
        const legRight = atPhase(leg, index + halfCycle);

        return {
            duration,
            angles: {
                torso: Math.PI - torsoLean[index],
                upperArmL: armLeft.upper,
                lowerArmL: armLeft.lower,
                upperArmR: armRight.upper,
                lowerArmR: armRight.lower,
                upperLegL: legLeft.upper,
                lowerLegL: legLeft.lower,
                upperLegR: legRight.upper,
                lowerLegR: legRight.lower
            }
        };
    });

    return poseClip(name, frames, looping);
}

const RUN_ARM_CYCLE = [
    { upper: -3.4516, lower: 1.5498 },
    { upper: -3.2053, lower: 1.4220 },
    { upper: -3.1216, lower: 1.3968 },
    { upper: -3.2253, lower: 1.5182 },
    { upper: -3.4516, lower: 1.6593 },
    { upper: -3.6579, lower: 1.6918 },
    { upper: -3.7616, lower: 1.6813 },
    { upper: -3.6779, lower: 1.6419 }
];

const RUN_LEG_CYCLE = [
    { upper: 0.62, lower: 0.12 },
    { upper: 0.18, lower: -0.08 },
    { upper: -0.28, lower: -0.38 },
    { upper: -0.58, lower: -0.18 },
    { upper: -0.38, lower: -0.48 },
    { upper: -0.12, lower: -0.68 },
    { upper: 0.08, lower: -0.58 },
    { upper: 0.42, lower: -0.38 }
];

const RUN_FRAME_DURATIONS = [70, 55, 50, 50, 70, 55, 50, 50];
const RUN_TORSO_LEAN = [0.14, 0.16, 0.15, 0.14, 0.14, 0.16, 0.15, 0.14];

const PLAYER_ANIMATIONS = {
    idle: poseClip('idle', [
        {
            duration: 400,
            angles: {
                upperArmL: -0.45 - Math.PI,
                lowerArmL: 0.28,
                upperArmR: 0.45 - Math.PI,
                lowerArmR: -0.28,
                upperLegL: 0.24,
                lowerLegL: -0.05,
                upperLegR: -0.24,
                lowerLegR: 0.05
            }
        },
        {
            duration: 400,
            angles: {
                upperArmL: -0.42 - Math.PI,
                lowerArmL: 0.25,
                upperArmR: 0.42 - Math.PI,
                lowerArmR: -0.25,
                upperLegL: 0.32,
                lowerLegL: -0.1,
                upperLegR: -0.32,
                lowerLegR: 0.1
            }
        }
    ]),

    run: buildContralateralGaitClip('run', {
        arm: RUN_ARM_CYCLE,
        leg: RUN_LEG_CYCLE,
        durations: RUN_FRAME_DURATIONS,
        torsoLean: RUN_TORSO_LEAN
    }),

    jump: poseClip('jump', [
        {
            duration: 120,
            angles: {
                torso: Math.PI - 0.12,
                upperArmL: -3.3716,
                lowerArmL: 0.35,
                upperArmR: -3.3716,
                lowerArmR: 0.35,
                upperLegL: 0.55,
                lowerLegL: -0.45,
                upperLegR: -0.55,
                lowerLegR: 0.45
            }
        },
        {
            duration: 120,
            angles: {
                torso: Math.PI - 0.08,
                upperArmL: -3.4116,
                lowerArmL: 0.38,
                upperArmR: -3.4116,
                lowerArmR: 0.38,
                upperLegL: 0.48,
                lowerLegL: -0.38,
                upperLegR: -0.48,
                lowerLegR: 0.38
            }
        }
    ]),

    fall: poseClip('fall', [
        {
            duration: 160,
            angles: {
                torso: Math.PI + 0.05,
                upperArmL: -3.6916,
                lowerArmL: 0.30,
                upperArmR: -3.6916,
                lowerArmR: 0.30,
                upperLegL: 0.35,
                lowerLegL: -0.15,
                upperLegR: -0.35,
                lowerLegR: 0.15
            }
        },
        {
            duration: 160,
            angles: {
                torso: Math.PI + 0.02,
                upperArmL: -3.6616,
                lowerArmL: 0.35,
                upperArmR: -3.6616,
                lowerArmR: 0.35,
                upperLegL: 0.42,
                lowerLegL: -0.12,
                upperLegR: -0.42,
                lowerLegR: 0.12
            }
        }
    ]),

    climbUp: poseClip('climbUp', [
        {
            duration: 140,
            angles: {
                torso: Math.PI - 0.05,
                upperArmL: -2.4416,
                lowerArmL: 0.55,
                upperArmR: -2.4416,
                lowerArmR: 0.55,
                upperLegL: 0.45,
                lowerLegL: -0.35,
                upperLegR: 0.15,
                lowerLegR: 0.05
            }
        },
        {
            duration: 140,
            angles: {
                torso: Math.PI - 0.02,
                upperArmL: -2.1116,
                lowerArmL: 0.65,
                upperArmR: -2.1116,
                lowerArmR: 0.65,
                upperLegL: 0.15,
                lowerLegL: 0.05,
                upperLegR: 0.45,
                lowerLegR: -0.35
            }
        }
    ]),

    climbDown: poseClip('climbDown', [
        {
            duration: 140,
            angles: {
                torso: Math.PI + 0.03,
                upperArmL: -3.4016,
                lowerArmL: 0.40,
                upperArmR: -3.4016,
                lowerArmR: 0.40,
                upperLegL: 0.2,
                lowerLegL: 0.1,
                upperLegR: 0.5,
                lowerLegR: -0.25
            }
        },
        {
            duration: 140,
            angles: {
                torso: Math.PI + 0.05,
                upperArmL: -3.4216,
                lowerArmL: 0.45,
                upperArmR: -3.4216,
                lowerArmR: 0.45,
                upperLegL: 0.5,
                lowerLegL: -0.25,
                upperLegR: 0.2,
                lowerLegR: 0.1
            }
        }
    ])
};

// Backward-compatible aliases for older animation ids.
PLAYER_ANIMATIONS.runningLeft = PLAYER_ANIMATIONS.run;
PLAYER_ANIMATIONS.runningRight = PLAYER_ANIMATIONS.run;
PLAYER_ANIMATIONS.jumping = PLAYER_ANIMATIONS.jump;
PLAYER_ANIMATIONS.falling = PLAYER_ANIMATIONS.fall;

// Collider width is derived from the widest idle foot span so physics
// bounds match the visible stance. Render scales every pose to this width.
const PLAYER_SPAWN_WIDTH = computePlayerColliderWidth(PLAYER_SKELETON, PLAYER_ANIMATIONS.idle);
