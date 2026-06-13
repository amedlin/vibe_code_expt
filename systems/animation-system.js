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
            let facing = 1;

            if (physics.isClimbing) {
                desiredAnimation = physics.climbDirection === 'down'
                    ? PLAYER_ANIMATIONS.climbDown
                    : PLAYER_ANIMATIONS.climbUp;
            } else if (!physics.isGrounded) {
                desiredAnimation = physics.vy < 0
                    ? PLAYER_ANIMATIONS.jump
                    : PLAYER_ANIMATIONS.fall;
            } else if (tracker && tracker.isMoving) {
                desiredAnimation = PLAYER_ANIMATIONS.run;
                facing = tracker.lastVx < 0 ? -1 : 1;
            }

            animation.desiredAnimation = desiredAnimation;
            animation.facing = facing;
        }
    }
}
