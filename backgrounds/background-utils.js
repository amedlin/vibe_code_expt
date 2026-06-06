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
