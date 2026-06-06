// Forest background generator.
//
// STUB: paints a vertical sky gradient and nothing else. The surrounding
// framework — seeded RNG, palette plumbing, theme registration, hookup
// into the engine's static-layer canvas — is fully in place so detail
// layers (parallax tree silhouettes, distant hills, sun shafts, etc.) can
// slot in here without touching engine, theme, or level-manager code.
//
// Must remain deterministic for a given rng seed: all randomness goes
// through `rng`, never Math.random.
function generateForestBackground(ctx, width, height, rng, palette) {
    fillSkyGradient(
        ctx,
        width,
        height,
        palette.skyGradientTop ?? palette.sky,
        palette.skyGradientBot ?? palette.sky
    );

    // TODO: layered tree silhouettes (back -> front, lighter -> darker),
    // distant hill bands, a sun disc with soft halo, scattered cloud
    // smudges. Each driven by `rng` so the same level looks the same on
    // every load while different levels look distinct.
    void rng;
}
