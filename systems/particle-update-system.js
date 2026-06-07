// Ages and integrates all active pool slots. Smoke gets a slight upward
// acceleration so puffs continue rising after the initial burst velocity.
class ParticleUpdateSystem extends System {
    constructor(pool) {
        super([]);
        this.pool = pool;
    }

    update(deltaTime, _entities) {
        const smokeBuoyancy = -35;

        this.pool.forEachActive((slot) => {
            slot.life -= deltaTime;
            if (slot.life <= 0) {
                slot.active = false;
                return;
            }

            if (slot.kind === PARTICLE_KIND_SMOKE) {
                slot.vy += smokeBuoyancy * deltaTime;
            }

            slot.x += slot.vx * deltaTime;
            slot.y += slot.vy * deltaTime;
        });
    }
}
