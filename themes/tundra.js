// Tundra theme.
//
// Cold, snowy companion to the forest theme. Same structure: register a
// palette + role->sprite mapping + themed platform draw, and delegate the
// background to backgrounds/tundra-background.js so the theme file stays
// focused on styling rather than rendering logic.
(function registerTundraTheme() {
    const sprites = {
        grass: buildDecorationSprite(44, 28, drawSnowTuftSprite),
        shrub: buildDecorationSprite(52, 40, drawIceRockSprite),
        tree:  buildDecorationSprite(64, 96, drawSnowPineSprite)
    };

    Themes.register('tundra', {
        palette: {
            sky:            '#dbe8ef',
            skyGradientTop: '#b6cdde',
            skyGradientBot: '#eef4f8',
            platformFill:   '#cfd9e0',
            platformEdge:   '#8aa1ad',
            // Background accents — cold, low-saturation, snow whites.
            sun:            '#fff8e8',
            sunHalo:        'rgba(255, 248, 232, 0)',
            mountainsFar:   '#cad8e2',
            pinesMid:       '#2f4a40',
            snowdriftNear:  '#f7fbfd',
            platformSnow:   '#ffffff'
        },

        skyElements: {
            maxTotal: 17,
            kinds: TUNDRA_SKY_KINDS
        },

        particles: {
            dust: {
                color:        '#b8c5cc',
                size:         5,
                sizeEnd:      1.5,
                alpha:        0.45,
                alphaEnd:     0,
                alphaJitter:  0.12,
                life:         0.4,
                emitInterval: 0.04,
                speed:        36
            },
            smoke: {
                color:       '#e8eef2',
                size:        13,
                sizeEnd:     21,
                alpha:       0.35,
                alphaEnd:    0,
                life:        0.75,
                burstCount:  5,
                riseSpeed:   45
            }
        },

        generateBackground(ctx, width, height, rng) {
            generateTundraBackground(ctx, width, height, rng, this.palette);
        },

        // Platforms read as icy stone with fresh snow on the walkable top
        // edge — a small visual cue that reinforces the theme.
        drawPlatform(ctx, x, y, w, h) {
            ctx.fillStyle = this.palette.platformFill;
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = this.palette.platformSnow;
            ctx.fillRect(x, y, w, Math.min(3, h));
        },

        getPropSprite(role) {
            return sprites[role] ?? null;
        }
    });
})();
