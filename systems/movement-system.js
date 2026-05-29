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
                const accel = movement.groundAcceleration;

                if (input.moveLeft) {
                    if (physics.vx > 0) {
                        physics.vx = 0;
                    }
                    physics.vx = this.accelerateToward(
                        physics.vx,
                        -movement.speed,
                        accel,
                        deltaTime
                    );
                } else if (input.moveRight) {
                    if (physics.vx < 0) {
                        physics.vx = 0;
                    }
                    physics.vx = this.accelerateToward(
                        physics.vx,
                        movement.speed,
                        accel,
                        deltaTime
                    );
                } else {
                    physics.vx = 0;
                }
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
