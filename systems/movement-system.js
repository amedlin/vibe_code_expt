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
                const targetVx = this.getTargetVx(input, movement.speed);

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
            } else {
                // Increased air speed only applies when falling downwards
                const targetVx = physics.vy > 0 ? this.getTargetVx(input, movement.airMaxSpeed) : this.getTargetVx(input, movement.speed);

                physics.vx = this.accelerateToward(
                    physics.vx,
                    targetVx,
                    movement.airAcceleration,
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

    getTargetVx(input, maxSpeed) {
        if (input.moveLeft) {
            return -maxSpeed;
        }
        if (input.moveRight) {
            return maxSpeed;
        }
        return 0;
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
