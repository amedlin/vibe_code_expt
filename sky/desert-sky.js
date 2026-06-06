// Desert theme sky kinds.
//
// Exports:
//   HIGH_CLOUD    — thin, slow-drifting pale strip high in the sky.
//   FLYING_INSECT — dual-mode: lightweight boids-flavored swarming when
//                   other insects share the screen; dart-and-hover loop
//                   when alone. Animator drives a quick wing buzz.

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
const INSECT_MIN_HOVER      = 0.15; // s — minimum linger after a dart
const INSECT_MAX_HOVER      = 0.7;  // s — maximum linger after a dart

// Follower-mode steering. Followers seek the leader (plus a small
// per-follower offset) with proportional accel and separate from each
// other; SEPARATION_R is the only neighbor radius still in use.
const INSECT_SEPARATION_R   = 18;
const INSECT_MAX_SPEED      = 360;
const INSECT_FOLLOW_ACCEL   = 220;  // px/s^2 max steering force magnitude

// Chance per pick that a solo / leader fly picks an exit target beyond
// the screen instead of an interior one, so the population turns over
// and doesn't pin itself indefinitely against the budget.
const INSECT_EXIT_PROB      = 0.30;

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
    // Dart mode. Even when the target is off-screen the arrive check
    // never fires before isFullyOffscreen despawns the entity, so exit
    // targets naturally retire the fly.
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

function _insectPickNewTarget(transform, state, ctx) {
    // Each dart leg gets its own speed so motion has texture; the
    // minimum is well above the player's casual eye-track speed.
    state.dartSpeed = randomRange(INSECT_MIN_DART_SPEED, INSECT_MAX_DART_SPEED);

    const cx = transform.x + transform.width  / 2;
    const cy = transform.y + transform.height / 2;

    // Edge-only exit: only consider exiting when the fly is already
    // close enough to an edge that the exit dart stays within
    // MAX_DART_DIST. This prevents long cross-screen exit flights —
    // flies leave the screen organically when they've drifted to its
    // periphery rather than rocketing across from the interior.
    const distLeft  = cx;
    const distRight = ctx.canvasWidth  - cx;
    const distTop   = cy;
    const distBot   = ctx.canvasHeight - cy;
    const minEdgeDist = Math.min(distLeft, distRight, distTop, distBot);
    const edgeReach   = INSECT_MAX_DART_DIST * 0.5;
    if (minEdgeDist < edgeReach && Math.random() < INSECT_EXIT_PROB) {
        const m = 40;
        const spread = INSECT_MAX_DART_DIST * 0.5;
        if (minEdgeDist === distLeft) {
            state.targetX = -m;
            state.targetY = cy + randomRange(-spread, spread);
        } else if (minEdgeDist === distRight) {
            state.targetX = ctx.canvasWidth + m;
            state.targetY = cy + randomRange(-spread, spread);
        } else if (minEdgeDist === distTop) {
            state.targetX = cx + randomRange(-spread, spread);
            state.targetY = -m;
        } else {
            state.targetX = cx + randomRange(-spread, spread);
            state.targetY = ctx.canvasHeight + m;
        }
        state.mode = 'dart';
        return;
    }

    // Short-hop interior pick: sample a point inside [MIN, MAX] from the
    // current position, retrying up to 8 angles to land inside the
    // screen. Falls back to a clamped point if every retry misses.
    const pad = 20;
    const maxY = ctx.canvasHeight * 0.7;
    for (let i = 0; i < 8; i++) {
        const angle = Math.random() * Math.PI * 2;
        const hop = randomRange(INSECT_MIN_DART_DIST, INSECT_MAX_DART_DIST);
        const tx = cx + Math.cos(angle) * hop;
        const ty = cy + Math.sin(angle) * hop;
        if (tx >= pad && tx <= ctx.canvasWidth - pad
         && ty >= pad && ty <= maxY) {
            state.targetX = tx;
            state.targetY = ty;
            state.mode = 'dart';
            return;
        }
    }
    // Fallback: clamp a hop direction to the screen.
    state.targetX = Math.max(pad, Math.min(ctx.canvasWidth - pad,
        cx + randomRange(-INSECT_MAX_DART_DIST, INSECT_MAX_DART_DIST)));
    state.targetY = Math.max(pad, Math.min(maxY,
        cy + randomRange(-INSECT_MAX_DART_DIST, INSECT_MAX_DART_DIST)));
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

// Follower: steer toward (leader center + a small persistent per-follower
// offset) with separation from other insects to avoid stacking. The
// followers don't run their own dart/hover loop — they're locked to the
// leader's wanderings.
function _insectFollowBehavior(transform, state, dt, ctx, leaderEntity) {
    if (state.followOffsetX == null) {
        state.followOffsetX = randomRange(-26, 26);
        state.followOffsetY = randomRange(-18, 18);
    }
    const leaderT = leaderEntity.getComponent('Transform');
    const targetX = leaderT.x + leaderT.width  / 2 + state.followOffsetX;
    const targetY = leaderT.y + leaderT.height / 2 + state.followOffsetY;

    const myCx = transform.x + transform.width  / 2;
    const myCy = transform.y + transform.height / 2;
    const dx = targetX - myCx;
    const dy = targetY - myCy;
    const dist = Math.hypot(dx, dy);

    let ax = 0;
    let ay = 0;
    if (dist > 0.5) {
        const inv = INSECT_FOLLOW_ACCEL / dist;
        ax += dx * inv;
        ay += dy * inv;
    }

    // Separation from other insects (including the leader) so followers
    // don't visually overlap.
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
            ax += ddx * inv * 140;
            ay += ddy * inv * 140;
        }
    }

    // Cap steering accel.
    const amag = Math.hypot(ax, ay);
    const maxAccel = INSECT_FOLLOW_ACCEL * 2;
    if (amag > maxAccel) {
        ax = (ax / amag) * maxAccel;
        ay = (ay / amag) * maxAccel;
    }

    state.vx += ax * dt;
    state.vy += ay * dt;

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

// Pick a spawn position for a new fly. If any other fly is already on
// screen, place the newcomer within ~1.5 dart-hops of it so the swarm
// builds in place. Otherwise drop the fly at a random interior spot.
function _spawnInsectPosition(canvasW, canvasH, width, height, context) {
    let near = null;
    if (context && context.entities) {
        for (const e of context.entities) {
            const s = e.getComponent('SkyElement');
            if (!s || s.kindId !== 'flyingInsect') continue;
            const t = e.getComponent('Transform');
            near = { x: t.x + t.width / 2, y: t.y + t.height / 2 };
            break;
        }
    }
    const pad  = 10;
    const maxY = canvasH * 0.65;
    if (near) {
        const r = INSECT_MAX_DART_DIST * 1.5;
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist  = randomRange(0, r);
            const cx    = near.x + Math.cos(angle) * dist;
            const cy    = near.y + Math.sin(angle) * dist;
            const x = cx - width / 2;
            const y = cy - height / 2;
            if (x >= pad && x + width <= canvasW - pad
             && y >= pad && y + height <= maxY) {
                return { x, y, width, height };
            }
        }
        // All cluster attempts fell off-screen — fall through to random.
    }
    return {
        x: randomRange(pad, canvasW - pad - width),
        y: randomRange(pad, maxY - height),
        width, height
    };
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

        // Flies always appear inside the screen (no edge entry) — at
        // their tiny size they read as "a fly just appeared" rather than
        // popping. When other flies are already present, cluster the new
        // one near one of them so the swarm grows in place instead of
        // catching up via a long chase across the screen.
        const transform = _spawnInsectPosition(canvasW, canvasH, width, height, context);
        const animator = new Animator(INSECT_BUZZ_ANIMATION);
        const state = {
            vx: randomRange(-60, 60),
            vy: randomRange(-40, 40),
            mode: 'dart',
            targetX: null,
            targetY: null,
            dartSpeed: INSECT_MIN_DART_SPEED, // overwritten on first pick
            hoverTimer: 0,
            bobTime: randomRange(0, Math.PI * 2),
            followOffsetX: null,              // lazily set when first following
            followOffsetY: null,
            animator,
            selfEntity: null                  // resolved on first behavior tick
        };
        return { transform, state, animator };
    },
    behavior: _insectBehavior,
    render: _renderInsect
};

const DESERT_SKY_KINDS = [HIGH_CLOUD, FLYING_INSECT];
