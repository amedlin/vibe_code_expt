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

function _drawInsectBodyA(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.32, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings up
    ctx.fillStyle = 'rgba(220, 220, 230, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.25, cy - h * 0.25, w * 0.22, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.25, cy - h * 0.25, w * 0.22, h * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
}

function _drawInsectBodyB(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.fillStyle = '#1d1d1d';
    ctx.beginPath();
    ctx.ellipse(cx, cy, w * 0.32, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings down
    ctx.fillStyle = 'rgba(220, 220, 230, 0.55)';
    ctx.beginPath();
    ctx.ellipse(cx - w * 0.25, cy + h * 0.20, w * 0.22, h * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.25, cy + h * 0.20, w * 0.22, h * 0.10, 0, 0, Math.PI * 2);
    ctx.fill();
}

const INSECT_BUZZ_ANIMATION = new Animation('insectBuzz', [
    new SpriteFrame(55, _drawInsectBodyA),
    new SpriteFrame(55, _drawInsectBodyB)
], true);

// Behavior constants.
const INSECT_DART_SPEED   = 90;     // px/s while darting toward a target
const INSECT_ARRIVE_DIST  = 6;      // px — within this, switch to hover
const INSECT_NEIGHBOR_R   = 90;     // px — boids alignment/cohesion radius
const INSECT_SEPARATION_R = 28;     // px — too-close avoidance radius
const INSECT_MAX_SPEED    = 110;
const INSECT_BOIDS_ACCEL  = 60;     // px/s^2 max steering force magnitude

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
    // dart mode
    const cx = transform.x + transform.width / 2;
    const cy = transform.y + transform.height / 2;
    const dx = state.targetX - cx;
    const dy = state.targetY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < INSECT_ARRIVE_DIST) {
        state.mode = 'hover';
        state.hoverTimer = randomRange(1.0, 2.5);
        state.vx = 0;
        state.vy = 0;
        return;
    }
    const inv = INSECT_DART_SPEED / dist;
    state.vx = dx * inv;
    state.vy = dy * inv;
    transform.x += state.vx * dt;
    transform.y += state.vy * dt;
}

function _insectPickNewTarget(transform, state, ctx) {
    const pad = 30;
    state.targetX = randomRange(pad, ctx.canvasWidth  - pad);
    state.targetY = randomRange(pad, ctx.canvasHeight * 0.7);
    state.mode = 'dart';
}

function _insectSwarmBehavior(transform, state, dt, ctx) {
    const myCx = transform.x + transform.width / 2;
    const myCy = transform.y + transform.height / 2;

    // Accumulators for separation, alignment, cohesion.
    let sepX = 0, sepY = 0, sepN = 0;
    let aliX = 0, aliY = 0, aliN = 0;
    let cohX = 0, cohY = 0, cohN = 0;

    for (const e of ctx.siblings) {
        const other = e.getComponent('SkyElement');
        if (!other || other.kindId !== 'flyingInsect') continue;
        if (other === state.self) continue;
        const ot = e.getComponent('Transform');
        const otherCx = ot.x + ot.width / 2;
        const otherCy = ot.y + ot.height / 2;
        const dx = myCx - otherCx;
        const dy = myCy - otherCy;
        const d2 = dx * dx + dy * dy;
        if (d2 > INSECT_NEIGHBOR_R * INSECT_NEIGHBOR_R) continue;

        if (d2 < INSECT_SEPARATION_R * INSECT_SEPARATION_R && d2 > 0.001) {
            const inv = 1 / Math.sqrt(d2);
            sepX += dx * inv;
            sepY += dy * inv;
            sepN++;
        }
        aliX += other.state.vx ?? 0;
        aliY += other.state.vy ?? 0;
        aliN++;
        cohX += otherCx;
        cohY += otherCy;
        cohN++;
    }

    let ax = 0, ay = 0;
    if (sepN > 0) {
        ax += (sepX / sepN) * 2.5;
        ay += (sepY / sepN) * 2.5;
    }
    if (aliN > 0) {
        ax += ((aliX / aliN) - state.vx) * 0.6;
        ay += ((aliY / aliN) - state.vy) * 0.6;
    }
    if (cohN > 0) {
        ax += ((cohX / cohN) - myCx) * 0.02;
        ay += ((cohY / cohN) - myCy) * 0.02;
    }
    // Random jitter to keep the swarm feeling alive.
    ax += randomRange(-1, 1) * 20;
    ay += randomRange(-1, 1) * 20;

    // Cap steering accel.
    const amag = Math.hypot(ax, ay);
    if (amag > INSECT_BOIDS_ACCEL) {
        ax = (ax / amag) * INSECT_BOIDS_ACCEL;
        ay = (ay / amag) * INSECT_BOIDS_ACCEL;
    }

    state.vx += ax * dt;
    state.vy += ay * dt;

    // Cap speed.
    const vmag = Math.hypot(state.vx, state.vy);
    if (vmag > INSECT_MAX_SPEED) {
        state.vx = (state.vx / vmag) * INSECT_MAX_SPEED;
        state.vy = (state.vy / vmag) * INSECT_MAX_SPEED;
    }

    // Soft containment: nudge back toward screen interior so the swarm
    // doesn't disperse off-screen the moment it forms.
    const pad = 40;
    if (transform.x < pad)                              state.vx += 30 * dt * (pad - transform.x);
    if (transform.x + transform.width > ctx.canvasWidth - pad)
        state.vx -= 30 * dt * (transform.x + transform.width - (ctx.canvasWidth - pad));
    if (transform.y < pad)                              state.vy += 30 * dt * (pad - transform.y);
    if (transform.y + transform.height > ctx.canvasHeight * 0.75)
        state.vy -= 30 * dt * (transform.y + transform.height - ctx.canvasHeight * 0.75);

    transform.x += state.vx * dt;
    transform.y += state.vy * dt;
}

function _insectBehavior(transform, state, dt, ctx) {
    // First tick: stash a reference to "self" so swarm math can skip it,
    // and seed a starting target so darts don't go to (0,0).
    if (!state.self) {
        for (const e of ctx.siblings) {
            const s = e.getComponent('SkyElement');
            if (s && s.state === state) { state.self = s; break; }
        }
        if (state.mode === 'dart' && state.targetX == null) {
            _insectPickNewTarget(transform, state, ctx);
        }
    }
    const insectCount = _countInsects(ctx.siblings);
    if (insectCount >= 2) {
        _insectSwarmBehavior(transform, state, dt, ctx);
    } else {
        _insectDartBehavior(transform, state, dt, ctx);
    }
}

function _renderInsect(ctx, transform, state) {
    const animator = state.animator;
    if (!animator) return;
    animator.render(ctx, transform.x, transform.y, transform.width, transform.height);
}

const FLYING_INSECT = {
    id: 'flyingInsect',
    spawnPerSecond: 0.25,
    spawn(canvasW, canvasH, offscreen) {
        const size = randomRange(14, 20);
        const transform = offscreen
            ? spawnAtAnyEdge(canvasW, canvasH, size, size)
            : { x: randomRange(20, canvasW - 20 - size),
                y: randomRange(20, canvasH * 0.65),
                width: size, height: size };
        const animator = new Animator(INSECT_BUZZ_ANIMATION);
        const state = {
            vx: randomRange(-40, 40),
            vy: randomRange(-30, 30),
            mode: 'dart',
            targetX: null,
            targetY: null,
            hoverTimer: 0,
            bobTime: randomRange(0, Math.PI * 2),
            animator,
            self: null
        };
        return { transform, state, animator };
    },
    behavior: _insectBehavior,
    render: _renderInsect
};

const DESERT_SKY_KINDS = [HIGH_CLOUD, FLYING_INSECT];
