// Shared canvas helpers for procedural background generators.
//
// Generator contract (each theme has its own implementation):
//   function generate<Theme>Background(ctx, width, height, rng, palette)
//
//   - ctx:     2D canvas context to paint into (usually the offscreen
//              static-layer canvas owned by the engine).
//   - width,
//     height:  pixel dimensions of the target canvas.
//   - rng:     SeededRng instance. Generators MUST take all randomness
//              from this object — never Math.random — so a given seed
//              produces identical output every time.
//   - palette: the theme's palette object (sky colors, accent colors,
//              etc.). Generators read named keys with sensible fallbacks.
//
// Helpers in this file are intentionally small and theme-agnostic so any
// generator can compose them. As new themes need more vocabulary (noise
// fields, silhouette bands, parallax layers, sun discs), add it here.

// Fill the entire canvas with a top-to-bottom linear gradient.
function fillSkyGradient(ctx, width, height, topColor, botColor) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, botColor);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
}

// Pre-roll a bag of sinusoids from the seeded rng. The result is consumed
// by evaluateSines() to produce smooth, repeatable profile curves without
// drawing fresh randomness on every x sample.
//   freqRange / ampRange: [min, max] tuples sampled with rng.range.
function precomputeSines(rng, count, freqRange, ampRange) {
    const sines = [];
    for (let i = 0; i < count; i++) {
        sines.push({
            freq:  rng.range(freqRange[0], freqRange[1]),
            phase: rng.range(0, Math.PI * 2),
            amp:   rng.range(ampRange[0], ampRange[1])
        });
    }
    return sines;
}

// Sum a precomputed sinusoid bag at normalized position t in [0, 1].
// The returned value is in [-sum(amp), sum(amp)] — callers usually
// normalize by adding 1 and dividing by 2 to get a [0, 1] envelope.
function evaluateSines(sines, t) {
    let v = 0;
    for (const s of sines) {
        v += Math.sin(t * s.freq * Math.PI * 2 + s.phase) * s.amp;
    }
    return v;
}

// Draw one back-to-front silhouette layer as a single filled polygon.
// profileFn(x) returns the top y coordinate of the silhouette at that x;
// the polygon closes back down to (width, height) and (0, height).
function drawSilhouetteLayer(ctx, width, height, color, stepX, profileFn) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += stepX) {
        ctx.lineTo(x, profileFn(x));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
}

// Sun disc with soft halo: a radial gradient from hot center to a fully
// transparent halo color. `radius` controls the visible bright core; the
// halo extends a bit beyond it.
function drawSunDisc(ctx, cx, cy, radius, color, haloColor) {
    const outer = radius * 2.4;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outer);
    grad.addColorStop(0,    color);
    grad.addColorStop(0.35, color);
    grad.addColorStop(1,    haloColor);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.fill();
}
