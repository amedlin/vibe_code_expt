// SkyRenderSystem
//
// Renders every sky element via its kind's `render(ctx, transform, state)`
// function. Deliberately does NOT consult the camera — sky lives in
// screen space and stays anchored to the viewport even if world-space
// scrolling is added later, giving a classic parallax effect for free.
//
// Render order: this system is registered first in the dynamic render
// list so sky paints above the cached static background but behind the
// player, collectibles, and front decorations.
class SkyRenderSystem extends System {
    constructor() {
        super(['Transform', 'SkyElement']);
    }

    update(_deltaTime, entities, ctx) {
        const sky = this.getEntitiesWithComponents(entities);
        for (const e of sky) {
            const transform  = e.getComponent('Transform');
            const skyElement = e.getComponent('SkyElement');
            skyElement.renderFn(ctx, transform, skyElement.state);
        }
    }
}
