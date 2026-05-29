class DecorationRenderSystem extends System {
    constructor(camera, depthLayer) {
        super(['Decoration', 'Transform']);
        this.camera = camera;
        this.depthLayer = depthLayer;
    }

    update(deltaTime, entities, ctx) {
        const decorations = this.getEntitiesWithComponents(entities);
        for (let entity of decorations) {
            const decoration = entity.getComponent('Decoration');
            if (decoration.depthLayer !== this.depthLayer) {
                continue;
            }

            const transform = entity.getComponent('Transform');
            const sprite = getDecorationSprite(decoration.type);
            if (!sprite) continue;

            const screen = this.camera.worldToScreen(transform.x, transform.y);
            ctx.drawImage(sprite.canvas, screen.x, screen.y, transform.width, transform.height);
        }
    }
}
