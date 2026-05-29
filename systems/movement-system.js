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

            if (physics.isGrounded) {
                let targetVx = 0;
                if (input.moveLeft) {
                    targetVx = -movement.speed;
                } else if (input.moveRight) {
                    targetVx = movement.speed;
                }

                if (input.moveLeft && physics.vx > 0) {
                    physics.vx = 0;
                } else if (input.moveRight && physics.vx < 0) {
                    physics.vx = 0;
                }

                physics.vx = this.accelerateToward(
                    physics.vx,
                    targetVx,
                    movement.groundAcceleration,
                    deltaTime
                );
            }

            if (input.jump && physics.isGrounded) {
                physics.vy = -movement.jumpPower;
                physics.isGrounded = false;
            }

            tracker.lastVx = physics.vx;
            tracker.isMoving = physics.isGrounded && physics.vx !== 0;
        }
    }

    accelerateToward(current, target, acceleration, deltaTime) {
        const step = acceleration * deltaTime;
        if (current < target) {
            return Math.min(target, current + step);
        }
        if (current > target) {
            return Math.max(target, current - step);
        }
        return current;
    }
}
