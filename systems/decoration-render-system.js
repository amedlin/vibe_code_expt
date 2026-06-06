class DecorationRenderSystem extends System {
    constructor(camera, depthLayer, themeProvider) {
        super(['Decoration', 'Transform']);
        this.camera = camera;
        this.depthLayer = depthLayer;
        this.themeProvider = themeProvider;
    }

    update(deltaTime, entities, ctx) {
        const theme = this.themeProvider();
        if (!theme || typeof theme.getPropSprite !== 'function') {
            return;
        }
        const decorations = this.getEntitiesWithComponents(entities);
        for (let entity of decorations) {
            const decoration = entity.getComponent('Decoration');
            if (decoration.depthLayer !== this.depthLayer) {
                continue;
            }

            // decoration.type is a semantic role (grass/shrub/tree); the
            // active theme resolves it to a concrete sprite.
            const sprite = theme.getPropSprite(decoration.type);
            if (!sprite) continue;

            const transform = entity.getComponent('Transform');
            const screen = this.camera.worldToScreen(transform.x, transform.y);
            ctx.drawImage(sprite.canvas, screen.x, screen.y, transform.width, transform.height);
        }
    }
}
