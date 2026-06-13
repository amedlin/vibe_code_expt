// Forest theme.
//
// Registers itself with the global Themes registry. Owns its own prop
// sprite cache, built once when this script loads. The procedural
// background generator is currently a stub that just fills the sky color;
// the surrounding framework (registry, level header, hook into the static
// layer, role->sprite lookup, themed platform draw) is fully wired so this
// can be filled in later without touching engine code.
(function registerForestTheme() {
    const sprites = {
        grass: buildDecorationSprite(44, 28, drawGrassSprite),
        shrub: buildDecorationSprite(52, 40, drawShrubSprite),
        tree:  buildDecorationSprite(64, 96, drawTreeSprite)
    };

    Themes.register('forest', {
        palette: {
            sky:            '#87ceeb',
            skyGradientTop: '#9ed7f0',
            skyGradientBot: '#cfe9f5',
            platformFill:   '#8b7355',
            platformEdge:   '#5d4e37',
            // Background accents: progressively darker / more saturated
            // greens convey atmospheric depth in the layered silhouettes.
            sun:            '#fff4cf',
            sunHalo:        'rgba(255, 244, 207, 0)',
            hillsFar:       '#b7d4cb',
            treesFar:       '#7fa68a',
            treesNear:      '#3f5e4a'
        },

        skyElements: {
            maxTotal: 5,
            kinds: FOREST_SKY_KINDS
        },

        particles: {
            dust: {
                color:        '#6a5a45',
                size:         5,
                sizeEnd:      1.5,
                alpha:        0.48,
                alphaEnd:     0,
                alphaJitter:  0.14,
                life:         0.42,
                emitInterval: 0.038,
                speed:        38
            },
            smoke: {
                color:       '#9aab96',
                size:        12,
                sizeEnd:     20,
                alpha:       0.38,
                alphaEnd:    0,
                life:        0.65,
                burstCount:  4,
                riseSpeed:   50
            }
        },

        // Delegated to the dedicated forest background module so the
        // theme file stays focused on palette + role->sprite mapping.
        generateBackground(ctx, width, height, rng) {
            generateForestBackground(ctx, width, height, rng, this.palette);
        },

        drawPlatform(ctx, x, y, w, h) {
            ctx.fillStyle = this.palette.platformFill;
            ctx.fillRect(x, y, w, h);
        },

        drawLadder(ctx, x, y, w, h) {
            drawThemedLadder(ctx, x, y, w, h, this.palette.platformEdge, this.palette.platformFill);
        },

        getPropSprite(role) {
            return sprites[role] ?? null;
        }
    });
})();
