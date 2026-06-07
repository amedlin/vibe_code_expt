// Spawns dust while the player runs on the ground and a smoke burst on
// hard landings. Writes into the shared ParticlePool — no ECS entities
// per fleck.
class ParticleEmitterSystem extends System {
    constructor(getPlayerEntity, themeProvider, pool) {
        super(['ParticleEmitter', 'Transform', 'Physics', 'VelocityTracker']);
        this.getPlayerEntity = getPlayerEntity;
        this.themeProvider   = themeProvider;
        this.pool            = pool;
    }

    update(deltaTime, entities) {
        const player = this.getPlayerEntity();
        if (!player) {
            return;
        }

        const emitters = this.getEntitiesWithComponents(entities);
        const theme = this.themeProvider();

        for (const entity of emitters) {
            const emitter   = entity.getComponent('ParticleEmitter');
            const transform = entity.getComponent('Transform');
            const physics   = entity.getComponent('Physics');
            const tracker   = entity.getComponent('VelocityTracker');

            if (!emitter.enabled) {
                emitter.wasGrounded = physics.isGrounded;
                emitter.lastVy      = physics.vy;
                continue;
            }

            this._maybeEmitLandingSmoke(emitter, transform, physics, theme);
            this._maybeEmitDust(emitter, transform, physics, tracker, theme, deltaTime);

            emitter.wasGrounded = physics.isGrounded;
            emitter.lastVy      = physics.vy;
        }
    }

    _maybeEmitLandingSmoke(emitter, transform, physics, theme) {
        const landed = !emitter.wasGrounded && physics.isGrounded;
        const impactVy = Math.abs(emitter.lastVy);
        if (!landed || impactVy < PARTICLE_LAND_SMOKE_VY_THRESHOLD) {
            return;
        }

        const config = getThemeParticleConfig(theme, PARTICLE_KIND_SMOKE);
        const count  = Math.max(1, Math.floor(config.burstCount ?? 5));
        const baseX  = transform.x + transform.width  / 2;
        const baseY  = transform.y + transform.height - 2;

        for (let i = 0; i < count; i++) {
            const slot = this.pool.alloc();
            slot.kind      = PARTICLE_KIND_SMOKE;
            slot.x         = baseX + (Math.random() - 0.5) * transform.width * 0.6;
            slot.y         = baseY;
            slot.vx        = (Math.random() - 0.5) * 30;
            slot.vy        = -(config.riseSpeed ?? 55) * (0.7 + Math.random() * 0.5);
            slot.maxLife   = config.life ?? 0.7;
            slot.life      = slot.maxLife;
            slot.size      = config.size ?? 14;
            slot.sizeEnd   = config.sizeEnd ?? 22;
            slot.alpha     = spawnAlphaFromConfig(config);
            slot.alphaEnd  = config.alphaEnd ?? 0;
            slot.color     = config.color ?? '#aaaaaa';
        }
    }

    _maybeEmitDust(emitter, transform, physics, tracker, theme, deltaTime) {
        if (!physics.isGrounded || !tracker.isMoving) {
            emitter.dustCooldown = Math.max(0, emitter.dustCooldown - deltaTime);
            return;
        }

        const config = getThemeParticleConfig(theme, PARTICLE_KIND_DUST);
        emitter.dustCooldown -= deltaTime;
        if (emitter.dustCooldown > 0) {
            return;
        }
        emitter.dustCooldown = config.emitInterval ?? 0.04;

        const slot = this.pool.alloc();
        const behind = tracker.lastVx !== 0 ? -Math.sign(tracker.lastVx) : 0;
        const speed  = config.speed ?? 40;

        slot.kind      = PARTICLE_KIND_DUST;
        slot.x         = transform.x + transform.width  / 2 + (Math.random() - 0.5) * 8;
        slot.y         = transform.y + transform.height - 2;
        slot.vx        = behind * speed * (0.4 + Math.random() * 0.4) + (Math.random() - 0.5) * 15;
        slot.vy        = -8 - Math.random() * 12;
        slot.maxLife   = config.life ?? 0.45;
        slot.life      = slot.maxLife;
        slot.size      = config.size ?? 6;
        slot.sizeEnd   = config.sizeEnd ?? 2;
        slot.alpha     = spawnAlphaFromConfig(config);
        slot.alphaEnd  = config.alphaEnd ?? 0;
        slot.color     = config.color ?? '#8b7355';
    }
}
