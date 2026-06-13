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

    // Eight-phase gait: one arm + one leg cycle, opposite side half a cycle
    // (4 frames) out of phase. Profile view: both arms share one shoulder, so
    // the arm cycle uses the same torso-local swing (not idle's ±spread mirror).
    // Forearms stay positive-bent like the forward-swinging side.
    run: poseClip('run', [
        {
            duration: 70,
            angles: {
                torso: Math.PI - 0.14,
                upperLegL: 0.62,
                lowerLegL: 0.12,
                upperLegR: -0.38,
                lowerLegR: -0.48,
                upperArmL: -3.4516,
                lowerArmL: 1.5498,
                upperArmR: -3.4516,
                lowerArmR: 1.6593
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
                upperArmL: -3.2053,
                lowerArmL: 1.4220,
                upperArmR: -3.6579,
                lowerArmR: 1.6918
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
                upperArmL: -3.1216,
                lowerArmL: 1.3968,
                upperArmR: -3.7616,
                lowerArmR: 1.6813
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
                upperArmL: -3.2253,
                lowerArmL: 1.5182,
                upperArmR: -3.6779,
                lowerArmR: 1.6419
            }
        },
        {
            duration: 70,
            angles: {
                torso: Math.PI - 0.14,
                upperLegL: -0.38,
                lowerLegL: -0.48,
                upperLegR: 0.62,
                lowerLegR: 0.12,
                upperArmL: -3.4516,
                lowerArmL: 1.6593,
                upperArmR: -3.4516,
                lowerArmR: 1.5498
            }
        },
        {
            duration: 55,
            angles: {
                torso: Math.PI - 0.16,
                upperLegL: -0.12,
                lowerLegL: -0.68,
                upperLegR: 0.18,
                lowerLegR: -0.08,
                upperArmL: -3.6579,
                lowerArmL: 1.6918,
                upperArmR: -3.2053,
                lowerArmR: 1.4220
            }
        },
        {
            duration: 50,
            angles: {
                torso: Math.PI - 0.15,
                upperLegL: 0.08,
                lowerLegL: -0.58,
                upperLegR: -0.28,
                lowerLegR: -0.38,
                upperArmL: -3.7616,
                lowerArmL: 1.6813,
                upperArmR: -3.1216,
                lowerArmR: 1.3968
            }
        },
        {
            duration: 50,
            angles: {
                torso: Math.PI - 0.14,
                upperLegL: 0.42,
                lowerLegL: -0.38,
                upperLegR: -0.58,
                lowerLegR: -0.18,
                upperArmL: -3.6779,
                lowerArmL: 1.6419,
                upperArmR: -3.2253,
                lowerArmR: 1.5182
            }
        }
    ]),

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
