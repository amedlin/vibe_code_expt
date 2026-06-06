// Desert theme sky kinds.
//
// Exports:
//   HIGH_CLOUD    — thin, slow-drifting pale strip high in the sky.
//   FLYING_INSECT — dual-mode: leader/follower swarm (lowest-id leader
//                   does dart-and-hover; followers track it via a
//                   critically-damped spring + separation) when two or
//                   more flies share the screen; dart-and-hover loop
//                   when alone. Animator drives a quick wing buzz.
//                   Flies always spawn offscreen with an onscreen dart
//                   target, never deliberately exit, and despawn only
//                   when their bounding box drifts off the canvas.

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

// Behavior constants. Dart speed is sampled per leg (each new dart picks
// its own speed inside this range) so motion has texture; the minimum is
// well above the player's casual eye-track speed so even slow darts feel
// snappy.
const INSECT_MIN_DART_SPEED = 240;
const INSECT_MAX_DART_SPEED = 340;

// Dart hops are now short: a fly bounces around in a small neighborhood
// rather than racing across the screen. Together with the shorter linger
// time this gives a fidgety, fly-like rhythm.
const INSECT_MIN_DART_DIST  = 25;
const INSECT_MAX_DART_DIST  = 90;

const INSECT_ARRIVE_DIST    = 5;    // px — within this, switch to hover
const INSECT_MIN_HOVER      = 0.25; // s — minimum linger after a dart
const INSECT_MAX_HOVER      = 1.5;  // s — maximum linger after a dart

// Follower-mode steering uses a critically-damped spring (no overshoot)
// around the leader's position plus a tight per-follower offset.
// SEPARATION_R is the only neighbor radius still in use; tighter than
// before so the swarm reads as a single moving cluster.
const INSECT_FOLLOW_OMEGA   = 8.0;  // rad/s — spring angular freq (stiffness)
const INSECT_SEPARATION_R   = 12;
const INSECT_MAX_SPEED      = 360;
// Lateral half-extents of the per-follower offset around the leader.
// Combined with separation forces this produces a tight ~28x20 cluster
// of flies orbiting the leader.
const INSECT_FOLLOW_HALF_X  = 14;
const INSECT_FOLLOW_HALF_Y  = 10;

function _countInsects(siblings) {
    let n = 0;
    for (const e of siblings) {
        const s = e.getComponent('SkyElement');
        if (s && s.kindId === 'flyingInsect') n++;
        if (n >= 2) break;
    }
    return n;
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

// Find the swarm leader: the insect entity with the lowest entity.id
// among all currently live flying insects. Re-evaluated every frame, so
// when the current leader despawns the next-lowest naturally takes over.
function _findLeaderEntity(siblings) {
    let leader = null;
    let leaderId = Infinity;
    for (const e of siblings) {
        const s = e.getComponent('SkyElement');
        if (!s || s.kindId !== 'flyingInsect') continue;
        if (e.id < leaderId) {
            leaderId = e.id;
            leader = e;
        }
    }
    return leader;
}

// Follower: critically-damped spring around (leader center + a small
// persistent per-follower offset), plus separation from other flies so
// they don't pile on top of each other. Followers run NO dart logic —
// they orbit the leader entirely via the spring, which by construction
// has no overshoot and so reads as smooth tracking rather than darting.
function _insectFollowBehavior(transform, state, dt, ctx, leaderEntity) {
    if (state.followOffsetX == null) {
        state.followOffsetX = randomRange(-INSECT_FOLLOW_HALF_X, INSECT_FOLLOW_HALF_X);
        state.followOffsetY = randomRange(-INSECT_FOLLOW_HALF_Y, INSECT_FOLLOW_HALF_Y);
    }
    const leaderT = leaderEntity.getComponent('Transform');
    const targetX = leaderT.x + leaderT.width  / 2 + state.followOffsetX;
    const targetY = leaderT.y + leaderT.height / 2 + state.followOffsetY;

    const myCx = transform.x + transform.width  / 2;
    const myCy = transform.y + transform.height / 2;

    // Critically-damped spring: accel = omega^2 * (target - pos) - 2*omega * vel.
    // Zero overshoot, smooth settling, frame-rate-independent at sane dt.
    const omega = INSECT_FOLLOW_OMEGA;
    let ax = (targetX - myCx) * omega * omega - state.vx * 2 * omega;
    let ay = (targetY - myCy) * omega * omega - state.vy * 2 * omega;

    // Short-range separation so two followers don't visually overlap.
    for (const e of ctx.siblings) {
        if (e === state.selfEntity) continue;
        const other = e.getComponent('SkyElement');
        if (!other || other.kindId !== 'flyingInsect') continue;
        const ot = e.getComponent('Transform');
        const ddx = myCx - (ot.x + ot.width  / 2);
        const ddy = myCy - (ot.y + ot.height / 2);
        const d2 = ddx * ddx + ddy * ddy;
        if (d2 < INSECT_SEPARATION_R * INSECT_SEPARATION_R && d2 > 0.001) {
            const inv = 1 / Math.sqrt(d2);
            ax += ddx * inv * 200;
            ay += ddy * inv * 200;
        }
    }

    state.vx += ax * dt;
    state.vy += ay * dt;

    // Speed cap so a fresh follower entering from off-screen doesn't
    // teleport in via the spring's huge initial pull.
    const vmag = Math.hypot(state.vx, state.vy);
    if (vmag > INSECT_MAX_SPEED) {
        state.vx = (state.vx / vmag) * INSECT_MAX_SPEED;
        state.vy = (state.vy / vmag) * INSECT_MAX_SPEED;
    }

    transform.x += state.vx * dt;
    transform.y += state.vy * dt;
}

function _insectBehavior(transform, state, dt, ctx) {
    // First tick: stash a reference to this insect's own entity so the
    // swarm leader lookup can identify "self", and seed a starting dart
    // target so darts don't aim at (0,0).
    if (!state.selfEntity) {
        for (const e of ctx.siblings) {
            const s = e.getComponent('SkyElement');
            if (s && s.state === state) {
                state.selfEntity = e;
                break;
            }
        }
        if (state.mode === 'dart' && state.targetX == null) {
            _insectPickNewTarget(transform, state, ctx);
        }
    }

    const insectCount = _countInsects(ctx.siblings);
    if (insectCount >= 2) {
        const leader = _findLeaderEntity(ctx.siblings);
        if (leader === state.selfEntity) {
            // I'm the leader — run the dart/hover loop.
            _insectDartBehavior(transform, state, dt, ctx);
        } else if (leader) {
            _insectFollowBehavior(transform, state, dt, ctx, leader);
        } else {
            _insectDartBehavior(transform, state, dt, ctx);
        }
    } else {
        _insectDartBehavior(transform, state, dt, ctx);
    }
}

function _renderInsect(ctx, transform, state) {
    const animator = state.animator;
    if (!animator) return;
    animator.render(ctx, transform.x, transform.y, transform.width, transform.height);
}

// Pick an offscreen spawn position and an interior initial dart target
// for a new fly. If another fly is already on screen, enter from the
// screen edge nearest that fly (aligned with its perpendicular
// coordinate) so the catchup distance is short — long cross-screen
// entries are precisely what we're avoiding. If no fly exists yet, drop
// the newcomer at a random edge with a target somewhere in the
// interior. Either way the dart target is on-screen so the fly's first
// action is to enter the canvas.
function _spawnInsectOffscreen(canvasW, canvasH, width, height, context) {
    let nearCx = null;
    let nearCy = null;
    if (context && context.entities) {
        for (const e of context.entities) {
            const s = e.getComponent('SkyElement');
            if (!s || s.kindId !== 'flyingInsect') continue;
            const t = e.getComponent('Transform');
            nearCx = t.x + t.width  / 2;
            nearCy = t.y + t.height / 2;
            break;
        }
    }

    let x, y, targetX, targetY;
    if (nearCx != null) {
        const distLeft  = nearCx;
        const distRight = canvasW - nearCx;
        const distTop   = nearCy;
        const distBot   = canvasH - nearCy;
        const minD = Math.min(distLeft, distRight, distTop, distBot);
        const jitter = 30;
        if (minD === distLeft) {
            x = -width;
            y = nearCy - height / 2 + randomRange(-jitter, jitter);
        } else if (minD === distRight) {
            x = canvasW;
            y = nearCy - height / 2 + randomRange(-jitter, jitter);
        } else if (minD === distTop) {
            x = nearCx - width / 2 + randomRange(-jitter, jitter);
            y = -height;
        } else {
            x = nearCx - width / 2 + randomRange(-jitter, jitter);
            y = canvasH;
        }
        // Aim straight at the existing fly — only the very first fly (if
        // promoted to leader after this one despawns) ever uses this
        // target; followers immediately defer to the leader.
        targetX = nearCx + randomRange(-30, 30);
        targetY = nearCy + randomRange(-20, 20);
    } else {
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
            case 0: x = randomRange(0, canvasW - width); y = -height;          break;
            case 1: x = canvasW;                          y = randomRange(0, canvasH * 0.6); break;
            case 2: x = randomRange(0, canvasW - width); y = canvasH;          break;
            default: x = -width;                          y = randomRange(0, canvasH * 0.6); break;
        }
        targetX = randomRange(canvasW * 0.25, canvasW * 0.75);
        targetY = randomRange(canvasH * 0.20, canvasH * 0.55);
    }

    return { transform: { x, y, width, height }, targetX, targetY };
}

const FLYING_INSECT = {
    id: 'flyingInsect',
    // Higher rate than other kinds so the screen reliably has enough
    // flies on it for the swarm/leader behavior to be visible.
    spawnPerSecond: 0.8,
    spawn(canvasW, canvasH, _offscreen, context) {
        // Smaller bounding box so flies read as proper flies instead of
        // chunky bugs. Width slightly larger than height keeps the wing
        // ellipses room to extend sideways.
        const width  = randomRange(8, 12);
        const height = width * 0.95;

        // Flies always spawn outside the visible canvas and dart in
        // toward an interior target; from there their standard
        // dart/hover (or follow-the-leader) behavior takes over.
        // They never deliberately exit — they leave the screen only as
        // a side effect of the leader's random walk drifting to the
        // periphery and picking an off-edge hop.
        const placement = _spawnInsectOffscreen(canvasW, canvasH, width, height, context);
        const animator  = new Animator(INSECT_BUZZ_ANIMATION);
        const state = {
            vx: 0,
            vy: 0,
            mode: 'dart',
            targetX: placement.targetX,
            targetY: placement.targetY,
            dartSpeed: randomRange(INSECT_MIN_DART_SPEED, INSECT_MAX_DART_SPEED),
            hoverTimer: 0,
            bobTime: randomRange(0, Math.PI * 2),
            followOffsetX: null,              // lazily set when first following
            followOffsetY: null,
            animator,
            selfEntity: null                  // resolved on first behavior tick
        };
        return { transform: placement.transform, state, animator };
    },
    behavior: _insectBehavior,
    render: _renderInsect
};

const DESERT_SKY_KINDS = [HIGH_CLOUD, FLYING_INSECT];
