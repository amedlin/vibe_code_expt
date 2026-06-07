// Renders the particle pool in world space, behind the player sprite.
class ParticleRenderSystem extends System {
    constructor(camera, pool) {
        super([]);
        this.camera = camera;
        this.pool   = pool;
    }

    update(_deltaTime, _entities, ctx) {
        this.pool.forEachActive((slot) => {
            const screen = this.camera.worldToScreen(slot.x, slot.y);
            drawParticle(ctx, slot, screen.x, screen.y);
        });
    }
}
