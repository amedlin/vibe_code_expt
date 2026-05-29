class AnimationSystem extends System {
    constructor() {
        super(['Physics', 'Animation']);
    }

    update(deltaTime, entities) {
        const animatedEntities = this.getEntitiesWithComponents(entities);
        for (let entity of animatedEntities) {
            const physics = entity.getComponent('Physics');
            const animation = entity.getComponent('Animation');
            const tracker = entity.getComponent('VelocityTracker');

            let desiredAnimation = PLAYER_ANIMATIONS.idle;

            if (!physics.isGrounded) {
                desiredAnimation = physics.vy < 0 ? PLAYER_ANIMATIONS.jumping : PLAYER_ANIMATIONS.falling;
            } else if (tracker && tracker.isMoving) {
                desiredAnimation = tracker.lastVx < 0 ? PLAYER_ANIMATIONS.runningLeft : PLAYER_ANIMATIONS.runningRight;
            }

            animation.desiredAnimation = desiredAnimation;
        }
    }
}
