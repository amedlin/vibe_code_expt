// Desert theme.
//
// Hot, dusty companion to the forest and tundra themes. Same structure:
// register a palette + role->sprite mapping + themed platform draw, and
// delegate the background to backgrounds/desert-background.js so this file
// stays focused on styling rather than rendering logic.
(function registerDesertTheme() {
    const sprites = {
        grass: buildDecorationSprite(44, 28, drawDesertGrassSprite),
        shrub: buildDecorationSprite(52, 40, drawDryShrubSprite),
        tree:  buildDecorationSprite(64, 96, drawPalmTreeSprite)
    };

    Themes.register('desert', {
        palette: {
            sky:            '#f4dcb8',
            skyGradientTop: '#dfc395',
            skyGradientBot: '#f9eed1',
            platformFill:   '#c89b6c',
            platformEdge:   '#8b6845',
            // Background accents — warm sands and a hazy sun, with a single
            // cool note (oasis water) for contrast against the dusty palette.
            sun:            '#fff1a8',
            sunHalo:        'rgba(255, 213, 138, 0)',
            dunesFar:       '#e8c98b',
            oasisPalms:     '#3a5a3a',
            oasisWater:     '#7da9c0',
            driftsNear:     '#d4a76a',
            platformSandTop:'#e0b27e'
        },

        skyElements: {
            maxTotal: 7,
            kinds: DESERT_SKY_KINDS
        },

        particles: {
            dust: {
                color:        '#c49a6a',
                size:         6,
                sizeEnd:      2,
                alpha:        0.52,
                alphaEnd:     0,
                alphaJitter:  0.16,
                life:         0.48,
                emitInterval: 0.035,
                speed:        42
            },
            smoke: {
                color:       '#d4a76a',
                size:        14,
                sizeEnd:     24,
                alpha:       0.42,
                alphaEnd:    0,
                life:        0.7,
                burstCount:  6,
                riseSpeed:   58
            }
        },

        generateBackground(ctx, width, height, rng) {
            generateDesertBackground(ctx, width, height, rng, this.palette);
        },

        // Platforms read as warm sandstone with a pale sand strip on the
        // walkable top edge — mirrors the tundra snow-strip cue so the
        // active theme is obvious from platforms alone.
        drawPlatform(ctx, x, y, w, h) {
            ctx.fillStyle = this.palette.platformFill;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = this.palette.platformSandTop;
            ctx.fillRect(x, y, w, Math.min(2, h));
        },

        getPropSprite(role) {
            return sprites[role] ?? null;
        }
    });
})();
