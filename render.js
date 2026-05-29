// Transform component - stores position and dimensions
class TransformComponent {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

// Render component - encapsulates rendering behavior
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
    }

    render(ctx, screenX, screenY, width, height) {
        this.animator.render(ctx, screenX, screenY, width, height);
    }
}

// Render system - handles rendering static renderable entities
class RenderSystem extends System {
    constructor(camera) {
        super(['Transform', 'Render']);
        this.camera = camera;
    }

    update(deltaTime, entities, ctx) {
        const staticEntities = this.getEntitiesWithComponents(entities);
        for (let entity of staticEntities) {
            const transform = entity.getComponent('Transform');
            const render = entity.getComponent('Render');

            const screenPos = this.camera.worldToScreen(transform.x, transform.y);
            render.render(ctx, screenPos.x, screenPos.y, transform.width, transform.height);
        }
    }
}

// Animated render system - handles rendering animated entities
class AnimatedRenderSystem extends System {
    constructor(camera) {
        super(['Transform', 'AnimatedRender']);
        this.camera = camera;
    }

    update(deltaTime, entities, ctx) {
        const animatedEntities = this.getEntitiesWithComponents(entities);
        for (let entity of animatedEntities) {
            const transform = entity.getComponent('Transform');
            const animatedRender = entity.getComponent('AnimatedRender');

            // Update animator
            const animator = animatedRender.animator;
            animator.update(deltaTime);

            // Render
            const screenPos = this.camera.worldToScreen(transform.x, transform.y);
            animatedRender.render(ctx, screenPos.x, screenPos.y, transform.width, transform.height);
        }
    }
}
