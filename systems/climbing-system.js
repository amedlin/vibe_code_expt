const CLIMB_PLATFORM_TOLERANCE = 12;

function collectLadderZones(entities) {
    const ladders = [];
    for (const entity of entities) {
        if (!entity.hasComponent('Ladder') || !entity.hasComponent('Transform')) {
            continue;
        }
        const transform = entity.getComponent('Transform');
        const ladder = entity.getComponent('Ladder');
        const extendedTopY = ladder.extendedTopY ?? computeLadderExtendedTopY(ladder.topY);
        ladders.push({
            entityId: entity.id,
            x: transform.x,
            width: transform.width,
            topY: ladder.topY,
            bottomY: ladder.bottomY,
            extendedTopY,
            centerX: ladder.centerX
        });
    }
    return ladders;
}

function isCenterOnLadder(centerX, ladder) {
    return centerX >= ladder.x && centerX <= ladder.x + ladder.width;
}

function bodyOverlapsLadder(bodyTop, feetY, ladder) {
    return feetY > ladder.extendedTopY && bodyTop < ladder.bottomY;
}

function findLadderAt(centerX, bodyTop, feetY, ladders) {
    for (const ladder of ladders) {
        if (!isCenterOnLadder(centerX, ladder)) {
            continue;
        }
        if (bodyOverlapsLadder(bodyTop, feetY, ladder)) {
            return ladder;
        }
    }
    return null;
}

function findLadderById(ladders, entityId) {
    return ladders.find((l) => l.entityId === entityId) ?? null;
}

function resolveAirGrabDirection(input, physics) {
    if (input.climbUp && input.climbDown) {
        return physics.vy > 0 ? 'down' : 'up';
    }
    if (input.climbDown) {
        return 'down';
    }
    return 'up';
}

class ClimbingSystem extends System {
    constructor() {
        super(['Input', 'Movement', 'Physics', 'Transform']);
    }

    update(deltaTime, entities) {
        const ladders = collectLadderZones(entities);
        const climbers = this.getEntitiesWithComponents(entities);

        for (const entity of climbers) {
            const input = entity.getComponent('Input');
            const movement = entity.getComponent('Movement');
            const physics = entity.getComponent('Physics');
            const transform = entity.getComponent('Transform');

            if (physics.isClimbing) {
                this.updateClimbing(entity, input, movement, physics, transform, ladders, deltaTime);
            } else if (physics.isGrounded) {
                this.tryEnterClimbFromGround(input, physics, transform, ladders);
            } else {
                this.tryEnterClimbFromAir(input, physics, transform, ladders);
            }
        }
    }

    tryEnterClimbFromGround(input, physics, transform, ladders) {
        const centerX = transform.x + transform.width / 2;
        const feetY = transform.y + transform.height;
        const bodyTop = transform.y;
        const ladder = findLadderAt(centerX, bodyTop, feetY, ladders);
        if (!ladder) {
            return;
        }

        const onBottom = Math.abs(feetY - ladder.bottomY) <= CLIMB_PLATFORM_TOLERANCE;
        const onTop = Math.abs(feetY - ladder.topY) <= CLIMB_PLATFORM_TOLERANCE;

        if (onBottom && input.climbUp) {
            this.startClimbing(physics, ladder.entityId, 'up');
        } else if (onTop && input.climbDown) {
            this.startClimbing(physics, ladder.entityId, 'down');
        }
    }

    tryEnterClimbFromAir(input, physics, transform, ladders) {
        if (!input.climbUp && !input.climbDown) {
            return;
        }

        const centerX = transform.x + transform.width / 2;
        const feetY = transform.y + transform.height;
        const bodyTop = transform.y;
        const ladder = findLadderAt(centerX, bodyTop, feetY, ladders);
        if (!ladder) {
            return;
        }

        const direction = resolveAirGrabDirection(input, physics);
        this.startClimbing(physics, ladder.entityId, direction);
    }

    startClimbing(physics, ladderId, direction) {
        physics.isClimbing = true;
        physics.isGrounded = false;
        physics.activeLadderId = ladderId;
        physics.climbDirection = direction;
        physics.vx = 0;
        physics.vy = 0;
    }

    exitClimbing(physics) {
        physics.isClimbing = false;
        physics.activeLadderId = null;
        physics.climbDirection = null;
    }

    updateClimbing(entity, input, movement, physics, transform, ladders, deltaTime) {
        const ladder = findLadderById(ladders, physics.activeLadderId);
        if (!ladder) {
            this.exitClimbing(physics);
            return;
        }

        if (input.jump) {
            this.exitClimbing(physics);
            physics.isGrounded = false;
            physics.vy = -movement.jumpPower;
            return;
        }

        const climbSpeed = movement.climbSpeed;

        if (input.climbUp) {
            transform.y -= climbSpeed * deltaTime;
        }
        if (input.climbDown) {
            transform.y += climbSpeed * deltaTime;
        }

        if (input.moveLeft) {
            transform.x -= movement.speed * 0.4 * deltaTime;
        }
        if (input.moveRight) {
            transform.x += movement.speed * 0.4 * deltaTime;
        }

        // Climb range spans standing on the upper platform down to standing
        // on the lower one. extendedTopY is for ladder visuals and overlap
        // detection only — it sits below the standing position on the upper
        // platform and must not cap upward travel.
        const minBodyY = ladder.topY - transform.height;
        const maxBodyY = ladder.bottomY - transform.height;
        transform.y = clamp(transform.y, minBodyY, maxBodyY);

        const centerX = transform.x + transform.width / 2;
        if (!isCenterOnLadder(centerX, ladder)) {
            this.exitClimbing(physics);
            physics.isGrounded = false;
            return;
        }

        physics.vx = 0;
        physics.vy = 0;

        const feetY = transform.y + transform.height;

        if (physics.climbDirection === 'up' &&
            Math.abs(feetY - ladder.topY) <= CLIMB_PLATFORM_TOLERANCE) {
            transform.y = ladder.topY - transform.height;
            this.exitClimbing(physics);
            physics.isGrounded = true;
            return;
        }

        if (physics.climbDirection === 'down' &&
            Math.abs(feetY - ladder.bottomY) <= CLIMB_PLATFORM_TOLERANCE) {
            transform.y = ladder.bottomY - transform.height;
            this.exitClimbing(physics);
            physics.isGrounded = true;
        }
    }
}
