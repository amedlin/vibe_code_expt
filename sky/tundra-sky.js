// Tundra theme sky kinds.
//
// Exports:
//   SNOW_FLURRY  — fast right-to-left wispy white streak with slight
//                  vertical drift.
//   WIND_SWIRL   — transparent curly spiral that rotates while it drifts
//                  left at a randomized speed.

// ---- Snow flurry --------------------------------------------------------

function _drawSnowFlurry(ctx, transform, state) {
    const { x, y, width, height } = transform;
    const cx = x + width / 2;
    const cy = y + height / 2;

    // Trailing line behind the head (faint, suggests motion).
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = Math.max(1, height * 0.25);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + width * 0.95, cy);
    ctx.lineTo(x + width * 0.10, cy + state.trailDrop);
    ctx.stroke();

    // Bright head ellipse at the leading (left) end.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(x + width * 0.10, cy + state.trailDrop, width * 0.10, height * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
}

const SNOW_FLURRY = {
    id: 'snowFlurry',
    spawnPerSecond: 0.8,
    spawn(canvasW, canvasH, offscreen) {
        const width  = randomRange(40, 80);
        const height = randomRange(3, 6);
        const transform = spawnAtRightEdge(
            canvasW, canvasH, width, height, [0.03, 0.55], offscreen
        );
        const state = {
            vx: randomRange(-260, -160),
            vy: randomRange(-5, 15),
            trailDrop: randomRange(-2, 2)
        };
        return { transform, state };
    },
    behavior: driftBehavior,
    render: _drawSnowFlurry
};

// ---- Wind swirl ---------------------------------------------------------

function _drawWindSwirl(ctx, transform, state) {
    const { x, y, width, height } = transform;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const r  = Math.min(width, height) * 0.5;

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.translate(cx, cy);
    ctx.rotate(state.rotation);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.2, r * 0.10);
    ctx.lineCap = 'round';
    ctx.beginPath();

    // Archimedean spiral: r = a + b*theta, ~1.75 turns from inside out.
    const turns = 1.75;
    const steps = 60;
    const a = r * 0.10;
    const b = (r - a) / (turns * Math.PI * 2);
    for (let i = 0; i <= steps; i++) {
        const theta = (i / steps) * turns * Math.PI * 2;
        const rr    = a + b * theta;
        const px = Math.cos(theta) * rr;
        const py = Math.sin(theta) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.restore();
}

function _swirlBehavior(transform, state, dt /* , ctx */) {
    transform.x   += state.vx * dt;
    transform.y   += state.vy * dt;
    state.rotation += state.rotationSpeed * dt;
}

const WIND_SWIRL = {
    id: 'windSwirl',
    spawnPerSecond: 0.3,
    spawn(canvasW, canvasH, offscreen) {
        const size = randomRange(36, 64);
        const transform = spawnAtRightEdge(
            canvasW, canvasH, size, size, [0.08, 0.55], offscreen
        );
        const state = {
            vx: randomRange(-140, -60),
            vy: randomRange(-8, 8),
            rotation: randomRange(0, Math.PI * 2),
            rotationSpeed: randomRange(-1.5, 1.5)
        };
        return { transform, state };
    },
    behavior: _swirlBehavior,
    render: _drawWindSwirl
};

const TUNDRA_SKY_KINDS = [SNOW_FLURRY, WIND_SWIRL];
