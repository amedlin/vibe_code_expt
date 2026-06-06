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
// to swarm-steer behavior. Leaders are locked at formation — once a
// fly has followers it can never become someone else's follower.
const INSECT_SWARM_RADIUS    = 55;

// Swarm-mode steering. Each follower carries its own (vx, vy) momentum
// and is pulled toward a "fuzzy target" — a point that slowly wanders
// around the leader's circle of attraction. ATTRACT_R is the max
// distance of that target from the leader's centre; SWARM_ACCEL is the
// constant-magnitude steering force; SWARM_DRAG damps velocity so the
// fly settles into a buzzy orbit instead of accelerating unbounded;
// SWARM_MAX_SPEED clamps the velocity for the inevitable spikes.
// Together with the wandering target this produces organic, momentum-
// driven motion that follows the leader but is never rigidly locked to
// it (so when the leader darts, followers curve in to catch up rather
// than teleporting in lockstep).
const INSECT_ATTRACT_R       = 32;
const INSECT_SWARM_ACCEL     = 650;     // px/s^2 — pull toward fuzzy target
const INSECT_SWARM_DRAG      = 2.5;     // 1/s   — linear velocity drag
const INSECT_SWARM_MAX_SPEED = 320;     // px/s
const INSECT_WANDER_DRIFT_MIN = 0.6;    // rad/s — slow target drift around leader
const INSECT_WANDER_DRIFT_MAX = 1.8;

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

// Swarm steering for a follower. The follower keeps its own world-
// space position and velocity (its dart-mode momentum carries straight
// through into swarm mode) and is pulled toward a "fuzzy target": a
// point that slowly wanders around the leader's circle of attraction.
// Combined with linear drag and a speed cap, this gives an organic
// momentum-driven buzz that follows the leader without being rigidly
// locked to it. When the leader darts, followers curve in to catch up
// instead of teleporting in lockstep.
function _insectSwarmBehavior(transform, state, dt, _ctx, leaderEntity) {
    const leaderT = leaderEntity.getComponent('Transform');
    const lcx = leaderT.x + leaderT.width  / 2;
    const lcy = leaderT.y + leaderT.height / 2;

    // First-time init: seed a per-follower wandering target. Each
    // follower drifts its target at a different rate / direction so
    // the swarm doesn't all chase the same point. (vx/vy carry over
    // from dart mode — momentum preserved.)
    if (state.wanderAngle == null) {
        state.wanderAngle   = Math.random() * Math.PI * 2;
        state.wanderRadius  = randomRange(INSECT_ATTRACT_R * 0.4, INSECT_ATTRACT_R);
        state.wanderDrift   = randomRange(INSECT_WANDER_DRIFT_MIN, INSECT_WANDER_DRIFT_MAX)
                            * (Math.random() < 0.5 ? -1 : 1);
        // Slow radial breathing — independent from angular drift.
        state.wanderRadialOmega = randomRange(0.5, 1.4);
        state.wanderRadialPhase = Math.random() * Math.PI * 2;
        if (state.vx == null) state.vx = 0;
        if (state.vy == null) state.vy = 0;
    }

    // Drift the target around the leader's circle and breathe its radius.
    state.wanderAngle       += state.wanderDrift       * dt;
    state.wanderRadialPhase += state.wanderRadialOmega * dt;
    const r = INSECT_ATTRACT_R * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(state.wanderRadialPhase)));
    const targetX = lcx + Math.cos(state.wanderAngle) * r;
    const targetY = lcy + Math.sin(state.wanderAngle) * r;

    // Steering force: constant-magnitude pull toward the fuzzy target.
    // Direction is normalized so the force stays meaningful even when
    // close to the target — combined with drag this means the fly
    // never quite settles, giving the buzzy quality.
    const myCx = transform.x + transform.width  / 2;
    const myCy = transform.y + transform.height / 2;
    const dx = targetX - myCx;
    const dy = targetY - myCy;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.5) {
        state.vx += (dx / dist) * INSECT_SWARM_ACCEL * dt;
        state.vy += (dy / dist) * INSECT_SWARM_ACCEL * dt;
    }

    // Linear drag — terminal speed = SWARM_ACCEL / SWARM_DRAG.
    const dragFactor = Math.max(0, 1 - INSECT_SWARM_DRAG * dt);
    state.vx *= dragFactor;
    state.vy *= dragFactor;

    const v = Math.hypot(state.vx, state.vy);
    if (v > INSECT_SWARM_MAX_SPEED) {
        state.vx = (state.vx / v) * INSECT_SWARM_MAX_SPEED;
        state.vy = (state.vy / v) * INSECT_SWARM_MAX_SPEED;
    }

    transform.x += state.vx * dt;
    transform.y += state.vy * dt;
}

// Dispatcher. State machine has two modes:
//   'dart'  — standard dart-and-hover loop, plus a per-tick scan to
//             emergently join a swarm if any other dart fly with a
//             lower entity id has come within SWARM_RADIUS. Flies with
//             at least one follower are locked here (the user's "leader
//             cannot be displaced" rule).
//   'swarm' — momentum-driven steering toward a fuzzy point near the
//             locked leader. If the leader despawns (its entity
//             vanishes from the sibling list), revert to dart; a new
//             swarm may then emerge organically from proximity.
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
            _insectSwarmBehavior(transform, state, dt, ctx, leader);
            return;
        }
        // Leader despawned — drop into a brief hover at the current
        // spot. From here the regular dart-mode loop takes over and we
        // may emergently re-form a new swarm with whichever flies
        // remain nearby. Clear swarm state so a fresh wander seeds on
        // the next swarm join.
        state.leaderId    = null;
        state.wanderAngle = null;
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
            state.wanderAngle = null;   // re-seeded on first swarm tick
            _insectSwarmBehavior(transform, state, dt, ctx, newLeader);
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

// Spawn a fly just off one of the four screen edges and pick an
// initial dart target that lies within [MIN_DART_DIST, MAX_DART_DIST]
// of the spawn position, in a direction pointing into the screen. The
// fly's first dart is thus indistinguishable in scale from any later
// random-walk hop — no long cross-screen flights aiming at the sun.
function _spawnInsectAtEdge(canvasW, canvasH, width, height) {
    const edge = Math.floor(Math.random() * 4); // 0=top,1=right,2=bot,3=left
    let x, y, intoAxis;
    switch (edge) {
        case 0:  x = randomRange(0, canvasW - width); y = -height;  intoAxis =  Math.PI / 2; break;
        case 1:  x = canvasW; y = randomRange(0, canvasH * 0.6);    intoAxis =  Math.PI;     break;
        case 2:  x = randomRange(0, canvasW - width); y = canvasH;  intoAxis = -Math.PI / 2; break;
        default: x = -width;  y = randomRange(0, canvasH * 0.6);    intoAxis =  0;           break;
    }
    // Initial dart target: a point at a regular-hop distance from the
    // spawn centre, in a direction within ±60° of the inward normal.
    const arcHalf = Math.PI / 3;
    const angle = intoAxis + randomRange(-arcHalf, arcHalf);
    const hop   = randomRange(INSECT_MIN_DART_DIST, INSECT_MAX_DART_DIST);
    const cx = x + width  / 2;
    const cy = y + height / 2;
    return {
        transform: { x, y, width, height },
        targetX:   cx + Math.cos(angle) * hop,
        targetY:   cy + Math.sin(angle) * hop
    };
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
        // flies. Swarms emerge organically when independent flies
        // happen to drift within SWARM_RADIUS of each other.
        const placement = _spawnInsectAtEdge(canvasW, canvasH, width, height);

        const animator = new Animator(INSECT_BUZZ_ANIMATION);
        const state = {
            mode: 'dart',
            targetX: placement.targetX,
            targetY: placement.targetY,
            dartSpeed: randomRange(INSECT_MIN_DART_SPEED, INSECT_MAX_DART_SPEED),
            hoverTimer: 0,
            bobTime: randomRange(0, Math.PI * 2),
            // Momentum carried into swarm mode; seeded by dart behavior.
            vx: 0,
            vy: 0,
            // Swarm state — null while solo, set when joining a swarm.
            leaderId: null,
            wanderAngle: null,
            animator,
            selfEntity: null    // resolved on first behavior tick
        };
        return { transform: placement.transform, state, animator };
    },
    behavior: _insectBehavior,
    render: _renderInsect
};

const DESERT_SKY_KINDS = [HIGH_CLOUD, FLYING_INSECT];
