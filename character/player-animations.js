const PLAYER_SKELETON = createPlayerSkeleton();

function poseClip(name, frames, looping = true) {
    return new PoseAnimation(
        name,
        frames.map((frame) => new PoseKeyframe(frame.duration, frame.angles)),
        looping
    );
}

const PLAYER_ANIMATIONS = {
    idle: poseClip('idle', [
        {
            duration: 400,
            angles: {
                upperArmL: 2.35,
                lowerArmL: 0.35,
                upperArmR: -2.35,
                lowerArmR: -0.35,
                upperLegL: 0.24,
                lowerLegL: -0.05,
                upperLegR: -0.24,
                lowerLegR: 0.05
            }
        },
        {
            duration: 400,
            angles: {
                upperArmL: 2.28,
                lowerArmL: 0.42,
                upperArmR: -2.28,
                lowerArmR: -0.42,
                upperLegL: 0.32,
                lowerLegL: -0.1,
                upperLegR: -0.32,
                lowerLegR: 0.1
            }
        }
    ]),

    run: poseClip('run', [
        {
            duration: 100,
            angles: {
                torso: Math.PI + 0.08,
                upperArmL: 2.05,
                lowerArmL: 0.55,
                upperArmR: -1.75,
                lowerArmR: -0.45,
                upperLegL: -0.55,
                lowerLegL: 0.35,
                upperLegR: 0.65,
                lowerLegR: -0.2
            }
        },
        {
            duration: 100,
            angles: {
                torso: Math.PI + 0.04,
                upperArmL: 2.25,
                lowerArmL: 0.35,
                upperArmR: -2.05,
                lowerArmR: -0.55,
                upperLegL: 0.15,
                lowerLegL: -0.05,
                upperLegR: -0.15,
                lowerLegR: 0.05
            }
        },
        {
            duration: 100,
            angles: {
                torso: Math.PI + 0.08,
                upperArmL: 1.75,
                lowerArmL: 0.45,
                upperArmR: -2.05,
                lowerArmR: -0.55,
                upperLegL: 0.65,
                lowerLegL: -0.2,
                upperLegR: -0.55,
                lowerLegR: 0.35
            }
        },
        {
            duration: 100,
            angles: {
                torso: Math.PI + 0.04,
                upperArmL: 2.05,
                lowerArmL: 0.55,
                upperArmR: -2.25,
                lowerArmR: -0.35,
                upperLegL: -0.15,
                lowerLegL: 0.05,
                upperLegR: 0.15,
                lowerLegR: -0.05
            }
        }
    ]),

    jump: poseClip('jump', [
        {
            duration: 120,
            angles: {
                torso: Math.PI - 0.12,
                upperArmL: 2.0,
                lowerArmL: 0.15,
                upperArmR: -2.0,
                lowerArmR: -0.15,
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
                upperArmL: 1.95,
                lowerArmL: 0.2,
                upperArmR: -1.95,
                lowerArmR: -0.2,
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
                upperArmL: 2.55,
                lowerArmL: 0.1,
                upperArmR: -2.55,
                lowerArmR: -0.1,
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
                upperArmL: 2.48,
                lowerArmL: 0.18,
                upperArmR: -2.48,
                lowerArmR: -0.18,
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
                upperArmL: 1.85,
                lowerArmL: 0.25,
                upperArmR: -1.55,
                lowerArmR: -0.55,
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
                upperArmL: 1.55,
                lowerArmL: 0.55,
                upperArmR: -1.85,
                lowerArmR: -0.25,
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
                upperArmL: 2.45,
                lowerArmL: 0.35,
                upperArmR: -2.15,
                lowerArmR: -0.45,
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
                upperArmL: 2.15,
                lowerArmL: 0.45,
                upperArmR: -2.45,
                lowerArmR: -0.35,
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
