// SkyBehaviorSystem
//
// Runs each sky element's per-kind `behavior(transform, state, dt, ctx)`
// callback once per frame and despawns any element whose bounding box has
// drifted fully off the screen on any side. `ctx.siblings` exposes the
// full sky entity list to behaviors that need cohort awareness (e.g.
// swarming insects).
class SkyBehaviorSystem extends System {
    constructor(canvasWidth, canvasHeight, engine) {
        super(['Transform', 'SkyElement']);
        this.canvasWidth  = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.engine       = engine;
    }

    update(deltaTime, entities) {
        const sky = this.getEntitiesWithComponents(entities);
        if (sky.length === 0) return;

        const ctx = {
            canvasWidth:  this.canvasWidth,
            canvasHeight: this.canvasHeight,
            siblings:     sky
        };

        // Iterate over a snapshot so behaviors that might (in the future)
        // spawn more elements don't mutate the loop. Despawn happens after
        // behavior so the element gets its last tick of motion.
        for (const e of sky) {
            const transform   = e.getComponent('Transform');
            const skyElement  = e.getComponent('SkyElement');
            skyElement.behavior(transform, skyElement.state, deltaTime, ctx);
            if (this.isFullyOffscreen(transform)) {
                this.engine.ecs.destroyEntity(e, { affectsStaticLayer: false });
            }
        }
    }

    isFullyOffscreen(t) {
        return t.x + t.width  < 0
            || t.x            > this.canvasWidth
            || t.y + t.height < 0
            || t.y            > this.canvasHeight;
    }
}
