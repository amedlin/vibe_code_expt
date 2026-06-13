// Transform component - stores position and dimensions
class TransformComponent {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

// Render component - encapsulates rendering behavior for ad-hoc renderables
// (kept for future use; platforms now go through PlatformRenderSystem and
// the active theme).
class RenderComponent {
    constructor(renderFn) {
        this.renderFn = renderFn;
    }

    render(ctx, screenX, screenY, width, height) {
        if (this.renderFn) {
            this.renderFn(ctx, screenX, screenY, width, height);
        }
    }
}

// Animated render component - for objects with animations
class AnimatedRenderComponent {
    constructor(animator) {
        this.animator = animator;
        this.facing = 1;
    }

    render(ctx, screenX, screenY, width, height, options = {}) {
        this.animator.render(ctx, screenX, screenY, width, height, options);
    }
}

// PlatformRenderSystem - draws every entity tagged with PlatformComponent
// using the active theme's platform draw function. Reads the theme from a
// caller-supplied getter (symmetric with the camera injection) so the
// system stays decoupled from the engine.
class PlatformRenderSystem extends System {
    constructor(camera, themeProvider) {
        super(['Transform', 'Platform']);
        this.camera = camera;
        this.themeProvider = themeProvider;
    }

    update(deltaTime, entities, ctx) {
        const theme = this.themeProvider();
        if (!theme || typeof theme.drawPlatform !== 'function') {
            return;
        }
        const platforms = this.getEntitiesWithComponents(entities);
        for (const entity of platforms) {
            const transform = entity.getComponent('Transform');
            const screen = this.camera.worldToScreen(transform.x, transform.y);
            theme.drawPlatform(ctx, screen.x, screen.y, transform.width, transform.height);
        }
    }
}

class LadderRenderSystem extends System {
    constructor(camera, themeProvider) {
        super(['Transform', 'Ladder']);
        this.camera = camera;
        this.themeProvider = themeProvider;
    }

    update(deltaTime, entities, ctx) {
        const theme = this.themeProvider();
        if (!theme || typeof theme.drawLadder !== 'function') {
            return;
        }
        const ladders = this.getEntitiesWithComponents(entities);
        for (const entity of ladders) {
            const transform = entity.getComponent('Transform');
            const screen = this.camera.worldToScreen(transform.x, transform.y);
            theme.drawLadder(ctx, screen.x, screen.y, transform.width, transform.height);
        }
    }
}

// Animated render system - handles rendering animated entities
class AnimatedRenderSystem extends System {
    constructor(camera) {
        super(['Transform', 'AnimatedRender', 'Animation']);
        this.camera = camera;
    }

    update(deltaTime, entities, ctx) {
        const animatedEntities = this.getEntitiesWithComponents(entities);
        for (let entity of animatedEntities) {
            const transform = entity.getComponent('Transform');
            const animatedRender = entity.getComponent('AnimatedRender');
            const animation = entity.getComponent('Animation');

            const screenPos = this.camera.worldToScreen(transform.x, transform.y);
            animatedRender.render(
                ctx,
                screenPos.x,
                screenPos.y,
                transform.width,
                transform.height,
                { facing: animation?.facing ?? animatedRender.facing ?? 1 }
            );
        }
    }
}
