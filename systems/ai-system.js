const AI_STUCK_SECONDS = 0.75;

class AISystem extends System {
    constructor(getSourceId, getNavigationGraph, getGameState) {
        super(['AIAgent', 'AIState', 'Input', 'Transform', 'Physics']);
        this.getSourceId = getSourceId;
        this.getNavigationGraph = getNavigationGraph;
        this.getGameState = getGameState;
    }

    update(deltaTime, entities) {
        if (this.getSourceId() !== 'ai' || this.getGameState() !== 'playing') {
            return;
        }

        const platforms = this.getNavigationGraph().getPlatforms();
        const collectibles = getCollectibleTargets(entities);
        const agents = this.getEntitiesWithComponents(entities);

        for (const entity of agents) {
            const control = this.computeControl(
                entity,
                platforms,
                collectibles,
                deltaTime
            );
            applyControlInput(entity.getComponent('Input'), control);
        }
    }

    computeControl(entity, platforms, collectibles, deltaTime) {
        const transform = entity.getComponent('Transform');
        const physics = entity.getComponent('Physics');
        const state = entity.getComponent('AIState');

        if (collectibles.length === 0) {
            state.reset();
            return NEUTRAL_CONTROL_INPUT;
        }

        const agentWidth = transform.width;
        const centerX = transform.x + agentWidth / 2;
        const feetY = transform.y + transform.height;

        if (physics.isGrounded) {
            const platform = platformForFeet(feetY, centerX, platforms);
            if (platform) {
                state.currentPlatformId = platform.id;
            }
        }

        let target = collectibles.find((c) => c.entityId === state.targetEntityId);
        if (!target) {
            target = this.pickTarget(transform, collectibles, platforms, agentWidth);
            state.targetEntityId = target.entityId;
            state.path = [];
            state.pathStep = 0;
            state.transit = null;
        }

        const goalPlatform = platformForTarget(target, platforms);
        const goalX = target.centerX - agentWidth / 2;
        const currentPlatform = platforms.find((p) => p.id === state.currentPlatformId)
            ?? platformForFeet(feetY, centerX, platforms);

        if (goalPlatform && currentPlatform && goalPlatform.id === currentPlatform.id) {
            state.path = [];
            state.transit = null;
            return this.moveTowardX(transform, goalX, physics, false);
        }

        if (goalPlatform && currentPlatform) {
            if (state.path.length === 0 || state.path[state.path.length - 1] !== goalPlatform.id) {
                state.path = findPlatformPath(
                    currentPlatform,
                    goalPlatform,
                    platforms,
                    agentWidth
                ) ?? [];
                state.pathStep = 0;
                state.transit = null;
            }
        }

        if (state.path.length >= 2) {
            const control = this.followPath(entity, transform, physics, state, platforms, agentWidth);
            if (control) {
                return this.applyStuckRecovery(transform, physics, state, control, deltaTime);
            }
        }

        const fallback = this.heuristicMove(transform, physics, target);
        return this.applyStuckRecovery(transform, physics, state, fallback, deltaTime);
    }

    pickTarget(transform, collectibles, platforms, agentWidth) {
        const px = transform.x + transform.width / 2;
        const py = transform.y + transform.height;

        let best = collectibles[0];
        let bestScore = Infinity;

        for (const target of collectibles) {
            const goalPlatform = platformForTarget(target, platforms);
            let score = Math.hypot(target.centerX - px, target.y - py);

            if (goalPlatform) {
                const currentPlatform = platformForFeet(py, px, platforms);
                const path = currentPlatform
                    ? findPlatformPath(currentPlatform, goalPlatform, platforms, agentWidth)
                    : null;
                if (path) {
                    score = path.length * 1000 + score;
                } else {
                    score += 5000;
                }
            }

            if (score < bestScore) {
                bestScore = score;
                best = target;
            }
        }

        return best;
    }

    followPath(entity, transform, physics, state, platforms, agentWidth) {
        while (state.pathStep < state.path.length - 1) {
            const from = platforms.find((p) => p.id === state.path[state.pathStep]);
            const to = platforms.find((p) => p.id === state.path[state.pathStep + 1]);
            if (!from || !to) {
                state.path = [];
                return null;
            }

            const feetY = transform.y + transform.height;
            const centerX = transform.x + agentWidth / 2;
            const onTarget = platformForFeet(feetY, centerX, platforms);

            if (physics.isGrounded && onTarget && onTarget.id === to.id) {
                state.pathStep++;
                state.transit = null;
                state.stuckTimer = 0;
                continue;
            }

            if (!state.transit) {
                state.transit = getTransition(from, to, agentWidth);
            }

            return this.executeTransit(transform, physics, state.transit, agentWidth);
        }

        return null;
    }

    executeTransit(transform, physics, transit, agentWidth) {
        const atTargetX = Math.abs(
            (transform.x + agentWidth / 2) - (transit.targetX + agentWidth / 2)
        ) <= NAV_POSITION_TOLERANCE;

        if (transit.action === 'jump') {
            const move = transit.moveDir < 0
                ? createControlInput(true, false, false)
                : createControlInput(false, true, false);
            if (physics.isGrounded && atTargetX) {
                return createControlInput(move.moveLeft, move.moveRight, true);
            }
            return move;
        }

        if (transit.action === 'fall') {
            if (physics.isGrounded && atTargetX) {
                return transit.moveDir < 0
                    ? createControlInput(true, false, false)
                    : createControlInput(false, true, false);
            }
            return this.moveTowardX(transform, transit.targetX, physics, false);
        }

        return this.moveTowardX(transform, transit.targetX, physics, false);
    }

    heuristicMove(transform, physics, target) {
        const goalX = target.centerX - transform.width / 2;
        const dx = goalX - transform.x;
        const dy = target.y - transform.y;
        const move = this.moveTowardX(transform, goalX, physics, false);

        if (physics.isGrounded && dy < -25 && Math.abs(dx) < 80) {
            return createControlInput(move.moveLeft, move.moveRight, true);
        }

        if (physics.isGrounded && dy > 40 && Math.abs(dx) < 20) {
            return createControlInput(
                physics.vx > 0,
                physics.vx < 0,
                false
            );
        }

        return move;
    }

    moveTowardX(transform, targetX, physics, allowJump) {
        const dx = targetX - transform.x;
        if (Math.abs(dx) <= NAV_POSITION_TOLERANCE) {
            return NEUTRAL_CONTROL_INPUT;
        }

        const moveLeft = dx < 0;
        const moveRight = dx > 0;
        const jump = allowJump && physics.isGrounded;
        return createControlInput(moveLeft, moveRight, jump);
    }

    applyStuckRecovery(transform, physics, state, control, deltaTime) {
        const x = transform.x;
        const y = transform.y;

        if (state.lastProgressX === null) {
            state.lastProgressX = x;
            state.lastProgressY = y;
            state.stuckTimer = 0;
            return control;
        }

        const moved = Math.hypot(x - state.lastProgressX, y - state.lastProgressY);
        const tryingToMove = control.moveLeft || control.moveRight;

        if (tryingToMove && moved < 2 && physics.isGrounded) {
            state.stuckTimer += deltaTime;
        } else {
            state.stuckTimer = 0;
            state.lastProgressX = x;
            state.lastProgressY = y;
        }

        if (state.stuckTimer >= AI_STUCK_SECONDS) {
            state.stuckTimer = 0;
            state.transit = null;
            state.path = [];
            state.lastProgressX = x;
            state.lastProgressY = y;
            return createControlInput(control.moveLeft, control.moveRight, true);
        }

        return control;
    }
}

function resetAIStateOnEntities(entities) {
    for (const entity of entities) {
        if (entity.hasComponent('AIState')) {
            entity.getComponent('AIState').reset();
        }
    }
}
