// Renders pill collectibles in world space. Filters on
// Collectible+Transform and asks the collectible whether it is a pill
// before drawing — keeps the render system open to additional
// collectible kinds without a tangram-style branch.
class PillRenderSystem extends System {
    constructor(camera) {
        super(['Collectible', 'Transform']);
        this.camera = camera;
    }

    update(deltaTime, entities, ctx) {
        const pills = this.getEntitiesWithComponents(entities);
        for (let entity of pills) {
            const collectible = entity.getComponent('Collectible');
            if (collectible.collectibleId !== PILL_ID) continue;
            const transform = entity.getComponent('Transform');
            const screen = this.camera.worldToScreen(transform.x, transform.y);
            drawPill(ctx, screen.x, screen.y, transform.width, transform.height);
        }
    }
}
