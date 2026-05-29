class MovementSystem extends System {
    constructor() {
        super(['Input', 'Movement', 'Physics', 'VelocityTracker']);
    }

    update(deltaTime, entities) {
        const movingEntities = this.getEntitiesWithComponents(entities);
        for (let entity of movingEntities) {
            const input = entity.getComponent('Input');
            const movement = entity.getComponent('Movement');
            const physics = entity.getComponent('Physics');
            const tracker = entity.getComponent('VelocityTracker');

            // Horizontal movement only while grounded
            if (physics.isGrounded) {
                if (input.moveLeft) {
                    physics.vx = -movement.speed;
                } else if (input.moveRight) {
                    physics.vx = movement.speed;
                } else {
                    physics.vx = 0;
                }
            }

            // Jump
            if (input.jump && physics.isGrounded) {
                physics.vy = -movement.jumpPower;
                physics.isGrounded = false;
            }

            // Track velocity for animation
            tracker.lastVx = physics.vx;
            tracker.isMoving = physics.isGrounded && physics.vx !== 0;
        }
    }
}
