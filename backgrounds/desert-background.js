// Desert background generator.
//
// Layered hot-day desert scene (back to front):
//   1. Sky gradient (dusty tan top -> hazy cream horizon)
//   2. Hot sun (large, pale yellow, soft warm halo)
//   3. Far dunes — smooth pale-gold rolling silhouette
//   4. Oasis cluster — water ellipse + 3-5 dark palm silhouettes at one
//      jittered mid-distance focal point
//   5. Near sand drifts — warm gold rolling foreground
//
// Detail layers occupy roughly y in [0.55, 0.93] of the canvas; the upper
// portion stays as quiet dusty sky for clear platforming. All randomness
// flows through the seeded `rng` so a given seed always paints the same
// scene.
//
// The oasis is a bespoke composite rather than a continuous silhouette
// band (deserts call for a focal point, not a uniform horizon decoration),
// so its helpers live locally below instead of in background-utils.js.
function generateDesertBackground(ctx, width, height, rng, palette) {
    fillSkyGradient(
        ctx, width, height,
        palette.skyGradientTop ?? palette.sky,
        palette.skyGradientBot ?? palette.sky
    );

    // Hot sun — larger and brighter than forest/tundra to convey heat.
    const sunRadius = Math.min(width, height) * 0.055;
    const sunX = rng.range(width * 0.18, width * 0.82);
    const sunY = rng.range(height * 0.08, height * 0.20);
    drawSunDisc(ctx, sunX, sunY, sunRadius, palette.sun, palette.sunHalo);

    // Far dunes — low-frequency rolling silhouette in pale gold.
    const duneSines = precomputeSines(rng, 3, [0.7, 1.8], [0.5, 1.0]);
    const duneNorm  = duneSines.reduce((s, e) => s + e.amp, 0) || 1;
    const duneBaseY = height * 0.76;
    const duneAmp   = height * 0.10;
    drawSilhouetteLayer(ctx, width, height, palette.dunesFar, 10, (x) => {
        const t = x / width;
        const n = evaluateSines(duneSines, t) / duneNorm;
        return duneBaseY - (n + 1) * 0.5 * duneAmp;
    });

    // Mid oasis — one cluster, randomly placed across the central band.
    const oasisX = rng.range(width * 0.25, width * 0.75);
    const oasisBaseY = height * 0.83;
    const oasisScale = Math.min(width, height) * 0.09;
    drawOasisCluster(ctx, oasisX, oasisBaseY, oasisScale, rng, palette);

    // Near sand drifts — warm gold rolling foreground.
    const driftSines = precomputeSines(rng, 3, [1.2, 2.8], [0.4, 0.9]);
    const driftNorm  = driftSines.reduce((s, e) => s + e.amp, 0) || 1;
    const driftBaseY = height * 0.93;
    const driftAmp   = height * 0.07;
    drawSilhouetteLayer(ctx, width, height, palette.driftsNear, 10, (x) => {
        const t = x / width;
        const n = evaluateSines(driftSines, t) / driftNorm;
        return driftBaseY - (n + 1) * 0.5 * driftAmp;
    });
}

// Local helper: paint an oasis (small water ellipse + a cluster of dark
// palm silhouettes) at (cx, baseY). `scale` controls overall size; the
// number and offsets of the palms are sampled from the seeded rng so the
// composition is deterministic per seed but varies between seeds.
function drawOasisCluster(ctx, cx, baseY, scale, rng, palette) {
    ctx.fillStyle = palette.oasisWater;
    ctx.beginPath();
    ctx.ellipse(cx, baseY, scale * 1.4, scale * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const palmCount = rng.intRange(3, 5);
    for (let i = 0; i < palmCount; i++) {
        const offsetX = rng.range(-scale * 1.4, scale * 1.4);
        const trunkH  = rng.range(scale * 1.5, scale * 2.4);
        drawSilhouettePalm(ctx, cx + offsetX, baseY, trunkH, palette.oasisPalms);
    }
}

// Local helper: a single dark palm silhouette anchored at (baseX, baseY),
// with a leaning trunk and a fan of five drooping fronds. Rendered as
// solid strokes in a single color so it reads as a distant silhouette.
function drawSilhouettePalm(ctx, baseX, baseY, trunkH, color) {
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';

    const topX = baseX + trunkH * 0.10;
    const topY = baseY - trunkH;

    ctx.lineWidth = trunkH * 0.05;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(baseX - trunkH * 0.06, baseY - trunkH * 0.5, topX, topY);
    ctx.stroke();

    const frondCount  = 5;
    const frondLength = trunkH * 0.45;
    ctx.lineWidth = trunkH * 0.030;
    for (let i = 0; i < frondCount; i++) {
        const angle = -Math.PI / 2 + (i - (frondCount - 1) / 2) * 0.55;
        const fx = topX + Math.cos(angle) * frondLength;
        const fy = topY + Math.sin(angle) * frondLength * 0.75;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(
            (topX + fx) / 2,
            (topY + fy) / 2 - trunkH * 0.04,
            fx, fy
        );
        ctx.stroke();
    }
}
