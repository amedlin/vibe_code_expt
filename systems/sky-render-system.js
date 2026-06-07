// SkyRenderSystem
//
// Renders every sky element via its kind's `render(ctx, transform, state)`
// function. Deliberately does NOT consult the camera — sky lives in
// screen space and stays anchored to the viewport even if world-space
// scrolling is added later, giving a classic parallax effect for free.
//
// Render order: registered on RENDER_LAYER.SKY (see render-layers.js).
// Sky paints above the cached background and behind the props blit and
// all gameplay draw layers (player, particles, collectibles, front props).
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
