// Forest background generator.
//
// Composes a parallax forest scene into the static-layer canvas, back to
// front:
//   1. Sky gradient (full canvas)
//   2. Sun disc with soft halo (upper third, x randomized per seed)
//   3. Far hills    — pale, low-frequency rolling profile
//   4. Mid treeline — muted sage, rolling base + soft canopy bumps
//   5. Near canopy  — deep forest green, sharper spike pattern
//
// Detail layers occupy roughly y in [0.55, 0.93] of the canvas so the upper
// ~55% stays clean sky for the platforming action. Must remain deterministic
// for a given rng seed — all randomness flows through `rng`.
function generateForestBackground(ctx, width, height, rng, palette) {
    fillSkyGradient(
        ctx, width, height,
        palette.skyGradientTop ?? palette.sky,
        palette.skyGradientBot ?? palette.sky
    );

    const sunRadius = Math.min(width, height) * 0.045;
    const sunX = rng.range(width * 0.18, width * 0.82);
    const sunY = rng.range(height * 0.10, height * 0.22);
    drawSunDisc(ctx, sunX, sunY, sunRadius, palette.sun, palette.sunHalo);

    // Far hills: 3 low-frequency sines summed for smooth rolling shape.
    const hillsSines = precomputeSines(rng, 3, [0.8, 2.2], [0.45, 1.0]);
    const hillsNorm = hillsSines.reduce((s, e) => s + e.amp, 0) || 1;
    const hillsBaseY = height * 0.72;
    const hillsAmp   = height * 0.10;
    drawSilhouetteLayer(ctx, width, height, palette.hillsFar, 12, (x) => {
        const t = x / width;
        const n = evaluateSines(hillsSines, t) / hillsNorm;
        return hillsBaseY - (n + 1) * 0.5 * hillsAmp;
    });

    // Mid treeline: rolling base + soft, periodic canopy bumps.
    const midSines = precomputeSines(rng, 4, [1.5, 3.5], [0.4, 0.9]);
    const midNorm  = midSines.reduce((s, e) => s + e.amp, 0) || 1;
    const midBaseY = height * 0.80;
    const midAmp   = height * 0.09;
    drawSilhouetteLayer(ctx, width, height, palette.treesFar, 8, (x) => {
        const t = x / width;
        const n = evaluateSines(midSines, t) / midNorm;
        const bump = Math.abs(Math.sin(t * 18 * Math.PI)) * height * 0.012;
        return midBaseY - (n + 1) * 0.5 * midAmp - bump;
    });

    // Near canopy: higher-frequency rolling + two staggered triangle waves
    // for a sharper, more individual-tree feel.
    const nearSines = precomputeSines(rng, 4, [2.5, 5.0], [0.35, 0.8]);
    const nearNorm  = nearSines.reduce((s, e) => s + e.amp, 0) || 1;
    const nearBaseY = height * 0.90;
    const nearAmp   = height * 0.10;
    drawSilhouetteLayer(ctx, width, height, palette.treesNear, 6, (x) => {
        const t = x / width;
        const n = evaluateSines(nearSines, t) / nearNorm;
        const spike1 = Math.abs(Math.sin(t * 36 * Math.PI)) * height * 0.020;
        const spike2 = Math.abs(Math.sin(t * 47 * Math.PI + 1.3)) * height * 0.012;
        return nearBaseY - (n + 1) * 0.5 * nearAmp - (spike1 + spike2) * 0.5;
    });
}
