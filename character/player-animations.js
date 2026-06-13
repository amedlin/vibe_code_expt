// Pose keyframe angles are local to each bone's parent. Upper arms attach
// partway up the torso (see PLAYER_SHOULDER_ATTACH_T), so upperArmL/R are
// relative to the torso's orientation, not world space.

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
                upperArmL: 2.35 - Math.PI,
                lowerArmL: 0.35,
                upperArmR: -2.35 - Math.PI,
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
                upperArmL: 2.28 - Math.PI,
                lowerArmL: 0.42,
                upperArmR: -2.28 - Math.PI,
                lowerArmR: -0.42,
                upperLegL: 0.32,
                lowerLegL: -0.1,
                upperLegR: -0.32,
                lowerLegR: 0.1
            }
        }
    ]),

    // Eight-phase gait cycle (right foot → left foot). Contralateral arms:
    // right leg forward pairs with left arm forward, and vice versa.
    // Torso leans into travel (Math.PI - ~0.14–0.16): sin(π−θ) tips the
    // body toward +X in local space, which mirrors correctly for left runs.
    // Lower-leg angles use negative bend vs idle so knees flex toward the
    // body rather than hyper-extending (avoids the moonwalk look).
    run: poseClip('run', [
        {
            duration: 70,
            angles: {
                torso: Math.PI - 0.14,
                upperLegR: 0.62,
                lowerLegR: 0.12,
                upperLegL: -0.38,
                lowerLegL: -0.48,
                upperArmL: 1.66 - Math.PI,
                lowerArmL: 0.58,
                upperArmR: -2.74 - Math.PI,
                lowerArmR: -0.22
            }
        },
        {
            duration: 55,
            angles: {
                torso: Math.PI - 0.16,
                upperLegR: 0.18,
                lowerLegR: -0.08,
                upperLegL: -0.12,
                lowerLegL: -0.68,
                upperArmL: 1.82 - Math.PI,
                lowerArmL: 0.38,
                upperArmR: -2.26 - Math.PI,
                lowerArmR: -0.42
            }
        },
        {
            duration: 50,
            angles: {
                torso: Math.PI - 0.15,
                upperLegR: -0.28,
                lowerLegR: -0.38,
                upperLegL: 0.08,
                lowerLegL: -0.58,
                upperArmL: 2.23 - Math.PI,
                lowerArmL: 0.28,
                upperArmR: -1.93 - Math.PI,
                lowerArmR: -0.52
            }
        },
        {
            duration: 50,
            angles: {
                torso: Math.PI - 0.14,
                upperLegR: -0.58,
                lowerLegR: -0.18,
                upperLegL: 0.42,
                lowerLegL: -0.38,
                upperArmL: 2.58 - Math.PI,
                lowerArmL: 0.12,
                upperArmR: -1.68 - Math.PI,
                lowerArmR: -0.58
            }
        },
        {
            duration: 70,
            angles: {
                torso: Math.PI - 0.14,
                upperLegL: 0.62,
                lowerLegL: 0.12,
                upperLegR: -0.38,
                lowerLegR: -0.48,
                upperArmR: -1.38 - Math.PI,
                lowerArmR: 0.58,
                upperArmL: 2.74 - Math.PI,
                lowerArmL: -0.22
            }
        },
        {
            duration: 55,
            angles: {
                torso: Math.PI - 0.16,
                upperLegL: 0.18,
                lowerLegL: -0.08,
                upperLegR: -0.12,
                lowerLegR: -0.68,
                upperArmR: -1.82 - Math.PI,
                lowerArmR: 0.38,
                upperArmL: 2.26 - Math.PI,
                lowerArmL: -0.42
            }
        },
        {
            duration: 50,
            angles: {
                torso: Math.PI - 0.15,
                upperLegL: -0.28,
                lowerLegL: -0.38,
                upperLegR: 0.08,
                lowerLegR: -0.58,
                upperArmR: -2.23 - Math.PI,
                lowerArmR: 0.28,
                upperArmL: 1.93 - Math.PI,
                lowerArmL: -0.52
            }
        },
        {
            duration: 50,
            angles: {
                torso: Math.PI - 0.14,
                upperLegL: -0.58,
                lowerLegL: -0.18,
                upperLegR: 0.42,
                lowerLegR: -0.38,
                upperArmR: -2.58 - Math.PI,
                lowerArmR: 0.12,
                upperArmL: 1.68 - Math.PI,
                lowerArmL: -0.58
            }
        }
    ]),

    jump: poseClip('jump', [
        {
            duration: 120,
            angles: {
                torso: Math.PI - 0.12,
                upperArmL: 2.12 - Math.PI,
                lowerArmL: 0.15,
                upperArmR: -1.88 - Math.PI,
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
                upperArmL: 2.03 - Math.PI,
                lowerArmL: 0.2,
                upperArmR: -1.97 - Math.PI,
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
                upperArmL: 2.5 - Math.PI,
                lowerArmL: 0.1,
                upperArmR: -2.6 - Math.PI,
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
                upperArmL: 2.46 - Math.PI,
                lowerArmL: 0.18,
                upperArmR: -2.5 - Math.PI,
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
                upperArmL: 1.9 - Math.PI,
                lowerArmL: 0.25,
                upperArmR: -1.5 - Math.PI,
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
                upperArmL: 1.57 - Math.PI,
                lowerArmL: 0.55,
                upperArmR: -1.83 - Math.PI,
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
                upperArmL: 2.42 - Math.PI,
                lowerArmL: 0.35,
                upperArmR: -2.18 - Math.PI,
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
                upperArmL: 2.1 - Math.PI,
                lowerArmL: 0.45,
                upperArmR: -2.5 - Math.PI,
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
