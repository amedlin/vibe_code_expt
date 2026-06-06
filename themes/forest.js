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
            platformEdge:   '#5d4e37'
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

        getPropSprite(role) {
            return sprites[role] ?? null;
        }
    });
})();
