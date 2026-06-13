const CLIMB_PLATFORM_TOLERANCE = 12;

function collectLadderZones(entities) {
    const ladders = [];
    for (const entity of entities) {
        if (!entity.hasComponent('Ladder') || !entity.hasComponent('Transform')) {
            continue;
        }
        const transform = entity.getComponent('Transform');
        const ladder = entity.getComponent('Ladder');
        ladders.push({
            entityId: entity.id,
            x: transform.x,
            width: transform.width,
            topY: ladder.topY,
            bottomY: ladder.bottomY,
            centerX: ladder.centerX
        });
    }
    return ladders;
}

function isCenterOnLadder(centerX, ladder) {
    return centerX >= ladder.x && centerX <= ladder.x + ladder.width;
}

function bodyOverlapsLadder(bodyTop, feetY, ladder) {
    return feetY > ladder.topY && bodyTop < ladder.bottomY;
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
            } else {
                this.tryEnterClimb(input, movement, physics, transform, ladders);
            }
        }
    }

    tryEnterClimb(input, movement, physics, transform, ladders) {
        if (!physics.isGrounded) {
            return;
        }

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
        let feetY = transform.y + transform.height;

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

        feetY = transform.y + transform.height;
        const minBodyY = ladder.topY - transform.height;
        const maxBodyY = ladder.bottomY - transform.height;
        transform.y = clamp(transform.y, minBodyY, maxBodyY);
        feetY = transform.y + transform.height;

        const centerX = transform.x + transform.width / 2;
        if (!isCenterOnLadder(centerX, ladder)) {
            this.exitClimbing(physics);
            physics.isGrounded = false;
            return;
        }

        physics.vx = 0;
        physics.vy = 0;

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
