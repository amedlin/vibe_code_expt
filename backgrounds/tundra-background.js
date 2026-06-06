// Tundra background generator.
//
// Layered cold-weather scene (back to front):
//   1. Sky gradient (cool top -> hazy near-white horizon)
//   2. Cold sun (small, pale, soft halo)
//   3. Snow mountains — jagged triangular peaks via peakProfile
//   4. Pine treeline — dark spiky silhouette
//   5. Near snowdrifts — pure white smooth rolling band
//
// Detail layers occupy roughly y in [0.55, 0.93] of the canvas; the upper
// portion stays as quiet sky for clear platforming. All randomness flows
// through the seeded `rng` so a given seed always paints the same scene.
function generateTundraBackground(ctx, width, height, rng, palette) {
    fillSkyGradient(
        ctx, width, height,
        palette.skyGradientTop ?? palette.sky,
        palette.skyGradientBot ?? palette.sky
    );

    const sunRadius = Math.min(width, height) * 0.038;
    const sunX = rng.range(width * 0.20, width * 0.80);
    const sunY = rng.range(height * 0.08, height * 0.18);
    drawSunDisc(ctx, sunX, sunY, sunRadius, palette.sun, palette.sunHalo);

    // Snow mountains: place peaks slightly off-canvas on both sides so the
    // silhouette blends past the edges instead of cutting flat at x=0/width.
    const mountainPeaks = placePeaks(
        rng, 6,
        [-width * 0.15, width * 1.15],
        [height * 0.12, height * 0.22],
        [width * 0.16, width * 0.32]
    );
    const mountBaseY = height * 0.74;
    drawSilhouetteLayer(ctx, width, height, palette.mountainsFar, 6, (x) =>
        peakProfile(x, mountainPeaks, mountBaseY)
    );

    // Mid pine treeline: high-frequency rolling base + sharp triangle spikes
    // for a recognizably evergreen silhouette.
    const pineSines = precomputeSines(rng, 3, [3.0, 5.5], [0.4, 0.8]);
    const pineNorm  = pineSines.reduce((s, e) => s + e.amp, 0) || 1;
    const pineBaseY = height * 0.84;
    const pineAmp   = height * 0.07;
    drawSilhouetteLayer(ctx, width, height, palette.pinesMid, 5, (x) => {
        const t = x / width;
        const n = evaluateSines(pineSines, t) / pineNorm;
        const spike = Math.abs(Math.sin(t * 52 * Math.PI)) * height * 0.022;
        return pineBaseY - (n + 1) * 0.5 * pineAmp - spike;
    });

    // Near snowdrifts: low-frequency rolling for a soft, smooth foreground.
    const driftSines = precomputeSines(rng, 3, [1.2, 2.8], [0.5, 1.0]);
    const driftNorm  = driftSines.reduce((s, e) => s + e.amp, 0) || 1;
    const driftBaseY = height * 0.93;
    const driftAmp   = height * 0.07;
    drawSilhouetteLayer(ctx, width, height, palette.snowdriftNear, 10, (x) => {
        const t = x / width;
        const n = evaluateSines(driftSines, t) / driftNorm;
        return driftBaseY - (n + 1) * 0.5 * driftAmp;
    });
}
