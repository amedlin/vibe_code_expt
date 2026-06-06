// SkySpawnSystem
//
// Reads the active theme's `skyElements` config and per-frame rolls each
// kind's `spawnPerSecond` probability, gated on the theme's `maxTotal`
// budget. The first time it sees a new theme it also "pre-warms" the sky
// by populating ~half the cap with elements at random positions inside
// the screen, so the level looks alive from frame one instead of having
// to wait for the spawn-from-edge pipeline to fill it.
//
// Sky entities are created with `{ affectsStaticLayer: false }` so their
// constant churn does not invalidate the cached procedural background.
class SkySpawnSystem extends System {
    constructor(themeProvider, canvasWidth, canvasHeight, engine) {
        super([]);
        this.themeProvider = themeProvider;
        this.canvasWidth   = canvasWidth;
        this.canvasHeight  = canvasHeight;
        this.engine        = engine;
        this._warmedTheme  = null;
    }

    update(deltaTime, entities) {
        const theme = this.themeProvider();
        if (!theme || !theme.skyElements) {
            this._warmedTheme = null;
            return;
        }
        const { maxTotal = 0, kinds = [] } = theme.skyElements;
        if (maxTotal <= 0 || kinds.length === 0) {
            return;
        }

        if (this._warmedTheme !== theme) {
            this._warmedTheme = theme;
            this.preWarm(kinds, Math.floor(maxTotal / 2));
        }

        let skyCount = 0;
        for (const e of entities) {
            if (e.hasComponent('SkyElement')) skyCount++;
        }
        if (skyCount >= maxTotal) {
            return;
        }

        for (const kind of kinds) {
            if (skyCount >= maxTotal) break;
            const rate = kind.spawnPerSecond ?? 0;
            if (rate > 0 && Math.random() < rate * deltaTime) {
                this.spawnKind(kind, /* offscreen */ true);
                skyCount++;
            }
        }
    }

    // Pre-warm: distribute `count` elements across `kinds` (round-robin)
    // and spawn each with `offscreen=false` so they appear mid-screen
    // instead of waiting at the entry edge.
    preWarm(kinds, count) {
        for (let i = 0; i < count; i++) {
            const kind = kinds[i % kinds.length];
            this.spawnKind(kind, /* offscreen */ false);
        }
    }

    spawnKind(kind, offscreen) {
        const result = kind.spawn(this.canvasWidth, this.canvasHeight, offscreen);
        if (!result || !result.transform) {
            return;
        }
        const t = result.transform;
        const entity = this.engine.ecs.createEntity({ affectsStaticLayer: false });
        entity.addComponent('Transform', new TransformComponent(t.x, t.y, t.width, t.height));
        entity.addComponent('SkyElement', new SkyElementComponent(
            kind.id,
            result.state ?? {},
            kind.behavior,
            kind.render
        ));
        // Optional animator: kinds that animate their sprite (bird flap,
        // insect buzz) return an Animator; AnimatorUpdateSystem will tick
        // it because it filters on ['Animation'] alone.
        if (result.animator) {
            entity.addComponent('Animation', new AnimationComponent(result.animator));
        }
        return entity;
    }
}
