class AnimatorUpdateSystem extends System {
    constructor() {
        super(['Animation']);
    }

    update(deltaTime, entities) {
        const animatorEntities = this.getEntitiesWithComponents(entities);
        for (let entity of animatorEntities) {
            const animation = entity.getComponent('Animation');
            const animator = animation.animator;

            animator.update(deltaTime);

            if (animation.desiredAnimation && animator.currentAnimation !== animation.desiredAnimation) {
                animator.play(animation.desiredAnimation);
                animation.currentAnimation = animation.desiredAnimation;
            }
        }
    }
}
