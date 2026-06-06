// Desert theme sky kinds.
//
// Exports:
//   HIGH_CLOUD    — thin, slow-drifting pale strip high in the sky.
//   FLYING_INSECT — every fly spawns independently at a random screen
//                   edge with a random interior dart target and runs
//                   its own dart-and-hover loop. When two flies happen
//                   to come within SWARM_RADIUS of each other a swarm
//                   forms emergently: the lower-id one continues
//                   darting unchanged (it is the leader, and is locked
//                   in that role for as long as anyone follows it),
//                   the other switches into kinematic orbital motion
//                   around the leader on its own randomly-tilted
//                   ellipse. If the leader despawns, every follower
//                   reverts to dart mode and may re-form a new swarm
//                   with whichever flies happen to remain in range.
//                   Animator drives a quick wing buzz. Flies despawn
//                   only when their bounding box drifts off the canvas.

// ---- High cloud ---------------------------------------------------------

function _drawHighCloud(ctx, transform, _state) {
    const { x, y, width, height } = transform;
    const cy = y + height / 2;

    ctx.fillStyle = 'rgba(255, 252, 240, 0.88)';
    // Three elongated horizontal ellipses overlapping, with the middle
    // one largest, gives a wispy cirrus look.
    ctx.beginPath();
    ctx.ellipse(x + width * 0.30, cy,                  width * 0.30, height * 0.40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width * 0.55, cy + height * 0.05, width * 0.38, height * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width * 0.80, cy - height * 0.05, width * 0.22, height * 0.30, 0, 0, Math.PI * 2);
    ctx.fill();
}

const HIGH_CLOUD = {
    id: 'highCloud',
    spawnPerSecond: 0.05,
    spawn(canvasW, canvasH, offscreen) {
        const width  = randomRange(120, 200);
        const height = width * randomRange(0.08, 0.13);
        const transform = spawnAtRightEdge(
            canvasW, canvasH, width, height, [0.03, 0.18], offscreen
        );
        const state = {
            vx: randomRange(-28, -15),
            vy: 0
        };
        return { transform, state };
    },
    behavior: driftBehavior,
    render: _drawHighCloud
};

// ---- Flying insect ------------------------------------------------------
//
// At ~10 px the silhouette must read as "fly" with only a handful of
// pixels: a small dark head + slim elongated body + two translucent
// wings flashing out to the sides. The two frames swap wing positions
// quickly (40 ms each) to suggest a fast buzzing flap.

function _drawFlyWingsOut(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h * 0.55;

    // Wings stretched horizontally outward, slightly back-swept.
    ctx.fillStyle = 'rgba(225, 230, 240, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.38, cy - h * 0.05, w * 0.36, h * 0.18, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.38, cy - h * 0.05, w * 0.36, h * 0.18,  0.25, 0, Math.PI * 2);
    ctx.fill();

    // Slim elongated body (thorax + abdomen).
    ctx.fillStyle = '#161616';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.05, w * 0.13, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head dot at the front (top of body).
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.30, Math.max(1, w * 0.13), 0, Math.PI * 2);
    ctx.fill();
}

function _drawFlyWingsUp(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h * 0.55;

    // Wings raised upright (motion-blur suggestion).
    ctx.fillStyle = 'rgba(225, 230, 240, 0.40)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.18, cy - h * 0.32, w * 0.20, h * 0.20, -1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.18, cy - h * 0.32, w * 0.20, h * 0.20,  1.05, 0, Math.PI * 2);
    ctx.fill();

    // Body (slightly tucked while wings are up).
    ctx.fillStyle = '#161616';
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.05, w * 0.13, h * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.arc(cx, cy - h * 0.30, Math.max(1, w * 0.13), 0, Math.PI * 2);
    ctx.fill();
}

const INSECT_BUZZ_ANIMATION = new Animation('insectBuzz', [
    new SpriteFrame(40, _drawFlyWingsOut),
    new SpriteFrame(40, _drawFlyWingsUp)
], true);

// Dart-mode constants. Dart speed is sampled per leg (each new dart
// picks its own speed inside this range) so motion has texture; the
// minimum is well above casual eye-track speed so even slow darts feel
// snappy. Hops are short so the fly bounces around in a small
// neighborhood rather than racing across the screen.
const INSECT_MIN_DART_SPEED = 240;
const INSECT_MAX_DART_SPEED = 340;
const INSECT_MIN_DART_DIST  = 25;
const INSECT_MAX_DART_DIST  = 90;
const INSECT_ARRIVE_DIST    = 5;    // px — within this, switch to hover
const INSECT_MIN_HOVER      = 0.25; // s — minimum linger after a dart
const INSECT_MAX_HOVER      = 3.0;  // s — maximum linger after a dart

// Swarm formation: two dart flies whose centres are within this
// distance emergently form a swarm. The one with the lower entity id
// becomes the leader (continues darting unchanged); the other switches
// to orbit behavior. Leaders are locked at formation — once a fly has
// followers it can never become someone else's follower.
const INSECT_SWARM_RADIUS   = 55;

// Per-follower orbit parameters, sampled once when a fly joins a
// swarm. Each follower picks its own values so the cluster looks like
// several independently-tilted electron orbits around the leader rather
// than a regimented formation. Omega is fast enough that the orbit
// reads as buzzing rather than gliding.
const INSECT_ORBIT_R_MIN         = 14;
const INSECT_ORBIT_R_MAX         = 32;
const INSECT_ORBIT_OMEGA_MIN     = 3.0;   // rad/s
const INSECT_ORBIT_OMEGA_MAX     = 5.5;
const INSECT_ORBIT_TILT_Y_MIN    = 0.35;  // ellipse squish — low = nearly edge-on
const INSECT_ORBIT_TILT_Y_MAX    = 1.0;
const INSECT_ORBIT_RADIAL_AMP_MIN  = 0.15;
const INSECT_ORBIT_RADIAL_AMP_MAX  = 0.40;
const INSECT_ORBIT_RADIAL_RATE_MIN = 0.8;
const INSECT_ORBIT_RADIAL_RATE_MAX = 1.6;

function _findEntityById(siblings, id) {
    for (const e of siblings) {
        if (e.id === id) return e;
    }
    return null;
}

// True iff any other live insect currently has me as its leader. Used
// to lock leaders in place — once you have followers, you can never
// become someone else's follower (the user's "leader cannot be
// displaced" rule).
function _hasFollowers(myId, siblings) {
    for (const e of siblings) {
        const s = e.getComponent('SkyElement');
        if (!s || s.kindId !== 'flyingInsect') continue;
        if (s.state.leaderId === myId) return true;
    }
    return false;
}

// Scan all other non-follower flies within SWARM_RADIUS. Returns the
// lowest-id eligible neighbour (i.e., the fly that should become this
// one's leader), or null if either nothing is in range or this fly
// itself has the lowest id in the local group. Followers (mode ===
// 'swarm') are skipped so chains like F -> L can't form behind the
// leader — new joiners always lock onto a fly that is itself free.
function _scanForSwarmLeader(transform, selfEntity, siblings, radius) {
    const myCx = transform.x + transform.width  / 2;
    const myCy = transform.y + transform.height / 2;
    const r2 = radius * radius;
    let bestId = selfEntity.id;
    let bestEntity = null;
    for (const e of siblings) {
        if (e === selfEntity) continue;
        const s = e.getComponent('SkyElement');
        if (!s || s.kindId !== 'flyingInsect') continue;
        if (s.state.mode === 'swarm') continue;
        const t = e.getComponent('Transform');
        const dx = (t.x + t.width  / 2) - myCx;
        const dy = (t.y + t.height / 2) - myCy;
        if (dx * dx + dy * dy <= r2 && e.id < bestId) {
            bestId = e.id;
            bestEntity = e;
        }
    }
    return bestEntity;
}

function _insectDartBehavior(transform, state, dt, ctx) {
    if (state.mode === 'hover') {
        state.hoverTimer -= dt;
        // Gentle hover bob.
        state.bobTime += dt;
        const bob = Math.sin(state.bobTime * 6) * 6 * dt;
        transform.y += bob;
        if (state.hoverTimer <= 0) {
            _insectPickNewTarget(transform, state, ctx);
        }
        return;
    }
    // Dart mode. Targets that happen to fall off the canvas (because the
    // random walk drifted the fly to the periphery and the next hop went
    // over the edge) are not special-cased — the fly just keeps moving
    // toward them, and isFullyOffscreen despawns the entity once its
    // bounding box leaves the screen.
    const cx = transform.x + transform.width / 2;
    const cy = transform.y + transform.height / 2;
    const dx = state.targetX - cx;
    const dy = state.targetY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < INSECT_ARRIVE_DIST) {
        state.mode = 'hover';
        state.hoverTimer = randomRange(INSECT_MIN_HOVER, INSECT_MAX_HOVER);
        state.vx = 0;
        state.vy = 0;
        return;
    }
    const speed = state.dartSpeed ?? INSECT_MIN_DART_SPEED;
    const inv = speed / dist;
    state.vx = dx * inv;
    state.vy = dy * inv;
    transform.x += state.vx * dt;
    transform.y += state.vy * dt;
}

function _insectPickNewTarget(transform, state, _ctx) {
    // Each dart leg gets its own speed so motion has texture; the
    // minimum is well above the player's casual eye-track speed.
    state.dartSpeed = randomRange(INSECT_MIN_DART_SPEED, INSECT_MAX_DART_SPEED);

    // Pure random-walk short hop: pick a random direction and hop length
    // from the current position. The fly never deliberately picks an
    // exit target — it just hops randomly, and as the random walk drifts
    // it to the periphery it eventually picks a hop that lands off the
    // canvas, at which point isFullyOffscreen despawns the entity. This
    // is the only way flies leave the screen now.
    const cx = transform.x + transform.width  / 2;
    const cy = transform.y + transform.height / 2;
    const angle = Math.random() * Math.PI * 2;
    const hop   = randomRange(INSECT_MIN_DART_DIST, INSECT_MAX_DART_DIST);
    state.targetX = cx + Math.cos(angle) * hop;
    state.targetY = cy + Math.sin(angle) * hop;
    state.mode = 'dart';
}

// Orbit behavior for a swarm follower. Each follower kinematically
// traces its own randomly-oriented elliptical orbit around the leader
// at a high angular rate, with a slow radial wobble so the path
// "breathes". The orbit center is always re-read from the leader's
// current transform, so the follower automatically inherits whatever
// the leader is doing (dart, hover, drift) — overlaid on its own
// energetic orbital motion.
function _insectOrbitBehavior(transform, state, dt, _ctx, leaderEntity) {
    const leaderT = leaderEntity.getComponent('Transform');
    const lcx = leaderT.x + leaderT.width  / 2;
    const lcy = leaderT.y + leaderT.height / 2;

    // First-time init: seed orbit params from this fly's current
    // position relative to the leader so it slides into orbit instead
    // of teleporting onto the ellipse.
    if (state.orbitRadius == null) {
        state.orbitTiltAngle   = Math.random() * Math.PI * 2;
        state.orbitTiltY       = randomRange(INSECT_ORBIT_TILT_Y_MIN, INSECT_ORBIT_TILT_Y_MAX);
        state.orbitOmega       = randomRange(INSECT_ORBIT_OMEGA_MIN, INSECT_ORBIT_OMEGA_MAX)
                               * (Math.random() < 0.5 ? -1 : 1);
        state.orbitRadialAmp   = randomRange(INSECT_ORBIT_RADIAL_AMP_MIN, INSECT_ORBIT_RADIAL_AMP_MAX);
        state.orbitRadialRate  = randomRange(INSECT_ORBIT_RADIAL_RATE_MIN, INSECT_ORBIT_RADIAL_RATE_MAX);
        state.orbitRadialPhase = Math.random() * Math.PI * 2;

        // Decompose current offset into the orbit's local (tilted)
        // frame so the starting angle and base radius match where the
        // fly actually is right now.
        const myCx = transform.x + transform.width  / 2;
        const myCy = transform.y + transform.height / 2;
        const dx = myCx - lcx;
        const dy = myCy - lcy;
        const cosT = Math.cos(-state.orbitTiltAngle);
        const sinT = Math.sin(-state.orbitTiltAngle);
        const localX = dx * cosT - dy * sinT;
        const localY = (dx * sinT + dy * cosT) / Math.max(0.01, state.orbitTiltY);
        state.orbitAngle  = Math.atan2(localY, localX);
        const startR = Math.hypot(localX, localY);
        state.orbitRadius = Math.max(INSECT_ORBIT_R_MIN,
                            Math.min(INSECT_ORBIT_R_MAX, startR || INSECT_ORBIT_R_MIN));
    }

    state.orbitAngle       += state.orbitOmega       * dt;
    state.orbitRadialPhase += state.orbitRadialRate  * dt;

    const r = state.orbitRadius
            * (1 + state.orbitRadialAmp * Math.sin(state.orbitRadialPhase));

    // Orbit ellipse in local frame, then rotate by tiltAngle into screen frame.
    const localX = Math.cos(state.orbitAngle) * r;
    const localY = Math.sin(state.orbitAngle) * r * state.orbitTiltY;
    const cosT = Math.cos(state.orbitTiltAngle);
    const sinT = Math.sin(state.orbitTiltAngle);
    const screenDx = localX * cosT - localY * sinT;
    const screenDy = localX * sinT + localY * cosT;

    transform.x = lcx + screenDx - transform.width  / 2;
    transform.y = lcy + screenDy - transform.height / 2;
}

// Dispatcher. State machine has two modes:
//   'dart'  — standard dart-and-hover loop, plus a per-tick scan to
//             emergently join a swarm if any other dart fly with a
//             lower entity id has come within SWARM_RADIUS. Flies with
//             at least one follower are locked here (the user's "leader
//             cannot be displaced" rule).
//   'swarm' — orbit the locked leader. If the leader despawns (its
//             entity vanishes from the sibling list), revert to dart
//             and a new swarm may emerge organically from proximity.
function _insectBehavior(transform, state, dt, ctx) {
    if (!state.selfEntity) {
        for (const e of ctx.siblings) {
            const s = e.getComponent('SkyElement');
            if (s && s.state === state) {
                state.selfEntity = e;
                break;
            }
        }
        if (!state.selfEntity) {
            _insectDartBehavior(transform, state, dt, ctx);
            return;
        }
    }

    if (state.mode === 'swarm') {
        const leader = _findEntityById(ctx.siblings, state.leaderId);
        if (leader && leader.getComponent('Transform')) {
            _insectOrbitBehavior(transform, state, dt, ctx, leader);
            return;
        }
        // Leader despawned — drop into a brief hover at the current
        // spot so we don't bolt away abruptly. From here the regular
        // dart-mode loop takes over and we may emergently re-form a
        // new swarm with whichever flies remain nearby.
        state.leaderId    = null;
        state.orbitRadius = null;
        state.mode        = 'hover';
        state.hoverTimer  = randomRange(INSECT_MIN_HOVER, INSECT_MAX_HOVER);
        state.vx = 0;
        state.vy = 0;
    }

    // dart / hover. Locked leaders skip the swarm-join check.
    if (!_hasFollowers(state.selfEntity.id, ctx.siblings)) {
        const newLeader = _scanForSwarmLeader(
            transform, state.selfEntity, ctx.siblings, INSECT_SWARM_RADIUS
        );
        if (newLeader) {
            state.mode = 'swarm';
            state.leaderId = newLeader.id;
            state.orbitRadius = null;   // re-seeded on first orbit tick
            _insectOrbitBehavior(transform, state, dt, ctx, newLeader);
            return;
        }
    }
    _insectDartBehavior(transform, state, dt, ctx);
}

function _renderInsect(ctx, transform, state) {
    const animator = state.animator;
    if (!animator) return;
    animator.render(ctx, transform.x, transform.y, transform.width, transform.height);
}

const FLYING_INSECT = {
    id: 'flyingInsect',
    // Higher rate than other kinds so the screen reliably has enough
    // flies on it for emergent swarm formation to be visible.
    spawnPerSecond: 0.8,
    spawn(canvasW, canvasH, _offscreen) {
        // Smaller bounding box so flies read as proper flies instead of
        // chunky bugs. Width slightly larger than height keeps the wing
        // ellipses room to extend sideways.
        const width  = randomRange(8, 12);
        const height = width * 0.95;

        // Purely independent spawn — no coordination with existing
        // flies. Pick any screen edge, aim at a random interior point,
        // and let the standard dart-hover loop take over. Swarms emerge
        // organically when independent flies happen to drift within
        // SWARM_RADIUS of each other.
        const transform = spawnAtAnyEdge(canvasW, canvasH, width, height);
        const targetX   = randomRange(canvasW * 0.15, canvasW * 0.85);
        const targetY   = randomRange(canvasH * 0.15, canvasH * 0.60);

        const animator = new Animator(INSECT_BUZZ_ANIMATION);
        const state = {
            mode: 'dart',
            targetX,
            targetY,
            dartSpeed: randomRange(INSECT_MIN_DART_SPEED, INSECT_MAX_DART_SPEED),
            hoverTimer: 0,
            bobTime: randomRange(0, Math.PI * 2),
            // Swarm state — null while solo, set when joining a swarm.
            leaderId: null,
            orbitRadius: null,
            animator,
            selfEntity: null    // resolved on first behavior tick
        };
        return { transform, state, animator };
    },
    behavior: _insectBehavior,
    render: _renderInsect
};

const DESERT_SKY_KINDS = [HIGH_CLOUD, FLYING_INSECT];
