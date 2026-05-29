class TangramRenderSystem extends System {
    constructor(camera) {
        super(['TangramPiece', 'Transform']);
        this.camera = camera;
    }

    update(deltaTime, entities, ctx) {
        const pieces = this.getEntitiesWithComponents(entities);
        for (let entity of pieces) {
            const tangram = entity.getComponent('TangramPiece');
            const transform = entity.getComponent('Transform');
            const screen = this.camera.worldToScreen(transform.x, transform.y);
            drawTangramPiece(ctx, tangram.pieceId, screen.x, screen.y);
        }
    }
}
