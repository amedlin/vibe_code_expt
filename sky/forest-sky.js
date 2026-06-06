// Forest theme sky kinds.
//
// Exports two kind objects:
//   PUFFY_CLOUD   — straight right-to-left drift, static white puff sprite.
//   DISTANT_BIRD  — slow random walk in the top half, sinusoidal scaling
//                   for atmospheric depth, animator-driven wing flap.

// ---- Puffy cloud --------------------------------------------------------

function _drawPuffyCloud(ctx, transform, state) {
    const { x, y, width, height } = transform;
    const cx = x + width / 2;
    const cy = y + height / 2;

    // Soft drop shadow — per-cloud alpha jitter keeps a group of clouds
    // from reading as identical stamps.
    ctx.fillStyle = `rgba(120, 140, 160, ${state.shadowAlpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + height * 0.15, width * 0.45, height * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Three overlapping puffs in the cloud's individual body color
    // (subtle warm/cool tint + brightness variation per cloud).
    ctx.fillStyle = state.bodyColor;
    ctx.beginPath();
    ctx.ellipse(cx - width * 0.20, cy + height * 0.05, width * 0.28, height * 0.30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + width * 0.18, cy + height * 0.08, width * 0.26, height * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx, cy - height * 0.05, width * 0.34, height * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Pick a per-cloud body color: brightness in [0.92, 1.0] times white,
// then add a small warm or cool tint by nudging individual channels so
// some clouds read slightly cream and others slightly cool.
function _randomCloudBodyColor() {
    const brightness = randomRange(0.92, 1.0);
    const base = Math.round(255 * brightness);
    const warm = Math.random() < 0.5;
    const r = Math.min(255, base + (warm ? randomRange(0, 6)  : 0));
    const g = Math.min(255, base + (warm ? randomRange(0, 3)  : randomRange(0, 2)));
    const b = Math.min(255, base + (warm ? 0                  : randomRange(0, 8)));
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

const PUFFY_CLOUD = {
    id: 'puffyCloud',
    spawnPerSecond: 0.10,
    spawn(canvasW, canvasH, offscreen) {
        const width  = randomRange(70, 130);
        const height = width * randomRange(0.45, 0.60);
        const transform = spawnAtRightEdge(
            canvasW, canvasH, width, height, [0.05, 0.40], offscreen
        );
        const state = {
            // Halved from [-45, -25] so clouds drift at a calmer pace.
            vx: randomRange(-22, -12),
            vy: 0,
            bodyColor:   _randomCloudBodyColor(),
            shadowAlpha: randomRange(0.12, 0.22)
        };
        return { transform, state };
    },
    behavior: driftBehavior,
    render: _drawPuffyCloud
};

// ---- Distant bird -------------------------------------------------------

function _drawBirdWingsUp(ctx, x, y, w, h) {
    ctx.strokeStyle = '#1a2030';
    ctx.lineWidth = Math.max(1.2, w * 0.07);
    ctx.lineCap = 'round';
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.45, cy + h * 0.10);
    ctx.quadraticCurveTo(cx - w * 0.20, cy - h * 0.45, cx, cy - h * 0.05);
    ctx.quadraticCurveTo(cx + w * 0.20, cy - h * 0.45, cx + w * 0.45, cy + h * 0.10);
    ctx.stroke();
}

function _drawBirdWingsDown(ctx, x, y, w, h) {
    ctx.strokeStyle = '#1a2030';
    ctx.lineWidth = Math.max(1.2, w * 0.07);
    ctx.lineCap = 'round';
    const cx = x + w / 2;
    const cy = y + h / 2;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.45, cy - h * 0.10);
    ctx.quadraticCurveTo(cx - w * 0.20, cy + h * 0.30, cx, cy + h * 0.05);
    ctx.quadraticCurveTo(cx + w * 0.20, cy + h * 0.30, cx + w * 0.45, cy - h * 0.10);
    ctx.stroke();
}

const BIRD_FLAP_ANIMATION = new Animation('birdFlap', [
    new SpriteFrame(140, _drawBirdWingsUp),
    new SpriteFrame(140, _drawBirdWingsDown)
], true);

function _birdBehavior(transform, state, dt, ctx) {
    // Re-jitter velocity occasionally for a wandering feel.
    state.jitterTimer -= dt;
    if (state.jitterTimer <= 0) {
        state.jitterTimer = randomRange(0.6, 1.2);
        state.vx = randomRange(-35, 35);
        state.vy = randomRange(-12, 12);
    }
    transform.x += state.vx * dt;
    transform.y += state.vy * dt;

    // Keep the bird roughly inside the top half of the screen by nudging
    // velocity away from the bottom boundary; outer edges still allow
    // despawn so the population turns over naturally.
    const topHalfBottom = ctx.canvasHeight * 0.55;
    if (transform.y > topHalfBottom) {
        state.vy -= 12 * dt;
    }

    // Smoothly varying scale to suggest distance changes.
    state.scaleTime += dt;
    state.scale = state.scaleBase
        + state.scaleAmp * Math.sin(state.scaleTime * state.scaleFreq + state.scalePhase);
}

function _renderBird(ctx, transform, state) {
    const animator = state.animator;
    if (!animator) return;
    const scale = state.scale ?? 1;
    const w = transform.width  * scale;
    const h = transform.height * scale;
    const x = transform.x + (transform.width  - w) / 2;
    const y = transform.y + (transform.height - h) / 2;
    animator.render(ctx, x, y, w, h);
}

const DISTANT_BIRD = {
    id: 'distantBird',
    spawnPerSecond: 0.05,
    spawn(canvasW, canvasH, offscreen) {
        const baseW = randomRange(22, 34);
        const baseH = baseW * 0.55;
        // Birds can come from either horizontal edge; pre-warm puts them
        // mid-screen at a random x within the top half.
        let x, y, vxBias;
        const fromRight = Math.random() < 0.5;
        y = randomRange(canvasH * 0.05, canvasH * 0.45);
        if (offscreen) {
            x = fromRight ? canvasW : -baseW;
            vxBias = fromRight ? -1 : 1;
        } else {
            x = randomRange(0, canvasW - baseW);
            vxBias = Math.random() < 0.5 ? -1 : 1;
        }
        const animator = new Animator(BIRD_FLAP_ANIMATION);
        const state = {
            vx: vxBias * randomRange(15, 30),
            vy: randomRange(-10, 10),
            jitterTimer: randomRange(0.3, 1.0),
            scaleBase:  randomRange(0.75, 1.05),
            scaleAmp:   randomRange(0.10, 0.20),
            scaleFreq:  randomRange(0.6, 1.4),
            scalePhase: randomRange(0, Math.PI * 2),
            scaleTime:  0,
            scale:      1,
            animator
        };
        return {
            transform: { x, y, width: baseW, height: baseH },
            state,
            animator
        };
    },
    behavior: _birdBehavior,
    render: _renderBird
};

const FOREST_SKY_KINDS = [PUFFY_CLOUD, DISTANT_BIRD];
