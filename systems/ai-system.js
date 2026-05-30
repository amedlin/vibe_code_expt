const AI_STUCK_SECONDS = 1.0;
const AI_EDGE_REACH = 18;

class AISystem extends System {
    constructor(getSourceId, getNavigationGraph, getGameState) {
        super(['AIAgent', 'AIState', 'Input', 'Transform', 'Physics', 'Movement']);
        this.getSourceId = getSourceId;
        this.getNavigationGraph = getNavigationGraph;
        this.getGameState = getGameState;
    }

    update(deltaTime, entities) {
        if (this.getSourceId() !== 'ai' || this.getGameState() !== 'playing') {
            return;
        }

        const navGraph = this.getNavigationGraph();
        const platforms = navGraph.getPlatforms();
        const collectibles = getCollectibleTargets(entities);
        const agents = this.getEntitiesWithComponents(entities);

        for (const entity of agents) {
            const control = this.computeControl(
                entity,
                navGraph,
                platforms,
                collectibles,
                deltaTime
            );
            applyControlInput(entity.getComponent('Input'), control);
        }
    }

    ensureCollectiblePlan(state, navGraph, collectibles, currentPlatform) {
        const liveIds = new Set(collectibles.map((c) => c.entityId));

        while (state.planIndex < state.collectiblePlan.length &&
               !liveIds.has(state.collectiblePlan[state.planIndex])) {
            state.planIndex++;
        }

        const needsPlan = state.collectiblePlan.length === 0 ||
            state.planIndex >= state.collectiblePlan.length;

        if (needsPlan && collectibles.length > 0 && currentPlatform) {
            state.collectiblePlan = navGraph.buildCollectiblePlan(
                collectibles,
                currentPlatform
            );
            state.planIndex = 0;
        }
    }

    getPlannedTarget(state, collectibles) {
        if (state.planIndex >= state.collectiblePlan.length) {
            return null;
        }
        const targetId = state.collectiblePlan[state.planIndex];
        return collectibles.find((c) => c.entityId === targetId) ?? null;
    }

    skipUnreachableTarget(state) {
        state.planIndex++;
        state.targetEntityId = null;
        state.route = null;
        state.pathStep = 0;
        state.transit = null;
    }

    computeControl(entity, navGraph, platforms, collectibles, deltaTime) {
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

        const groundedPlatform = physics.isGrounded
            ? platformForFeet(feetY, centerX, platforms)
            : null;

        if (groundedPlatform) {
            state.currentPlatformId = groundedPlatform.id;
        }

        const currentPlatform = navGraph.getPlatformById(state.currentPlatformId)
            ?? groundedPlatform;

        if (!currentPlatform) {
            return NEUTRAL_CONTROL_INPUT;
        }

        this.ensureCollectiblePlan(state, navGraph, collectibles, currentPlatform);

        const target = this.getPlannedTarget(state, collectibles);
        if (!target) {
            return NEUTRAL_CONTROL_INPUT;
        }

        const goalPlatform = platformForTarget(target, platforms);
        if (!goalPlatform) {
            this.skipUnreachableTarget(state);
            return NEUTRAL_CONTROL_INPUT;
        }

        const route = navGraph.findPath(currentPlatform, goalPlatform);
        if (!route) {
            this.skipUnreachableTarget(state);
            return NEUTRAL_CONTROL_INPUT;
        }

        if (state.targetEntityId !== target.entityId) {
            state.targetEntityId = target.entityId;
            state.route = route;
            state.pathStep = 0;
            state.transit = null;
        } else if (!state.route ||
                   state.route.platformIds[state.route.platformIds.length - 1] !== goalPlatform.id) {
            state.route = route;
            state.pathStep = 0;
            state.transit = null;
        }

        const goalX = clamp(
            target.centerX - agentWidth / 2,
            goalPlatform.left,
            goalPlatform.right - agentWidth
        );

        if (currentPlatform.id === goalPlatform.id) {
            state.transit = null;
            return this.moveTowardX(transform, goalX, physics, false, false);
        }

        if (physics.isGrounded && groundedPlatform && state.route) {
            const onPathIndex = state.route.platformIds.indexOf(groundedPlatform.id);
            if (onPathIndex >= 0) {
                state.pathStep = onPathIndex;
            }
        }

        if (state.route && state.pathStep < state.route.steps.length) {
            const control = this.followRoute(transform, physics, state);
            if (control) {
                return this.applyStuckRecovery(transform, physics, state, control, deltaTime);
            }
        }

        return NEUTRAL_CONTROL_INPUT;
    }

    followRoute(transform, physics, state) {
        while (state.pathStep < state.route.steps.length) {
            const step = state.route.steps[state.pathStep];
            const to = state.route.platformIds[state.pathStep + 1];
            const feetY = transform.y + transform.height;
            const centerX = transform.x + transform.width / 2;
            const onPlatform = platformForFeet(feetY, centerX, this.getNavigationGraph().getPlatforms());

            if (physics.isGrounded && onPlatform && onPlatform.id === to) {
                state.pathStep++;
                state.transit = null;
                state.stuckTimer = 0;
                continue;
            }

            if (!state.transit || state.transit.toPlatformId !== to) {
                state.transit = {
                    action: step.action,
                    targetX: step.approachX,
                    moveDir: step.moveDir,
                    toPlatformId: to,
                    committed: false
                };
            }

            return this.executeTransit(transform, physics, state.transit);
        }

        return null;
    }

    executeTransit(transform, physics, transit) {
        const dx = transit.targetX - transform.x;
        const moveDir = Math.abs(dx) > AI_EDGE_REACH
            ? (dx > 0 ? 1 : -1)
            : transit.moveDir;
        const atEdge = Math.abs(dx) <= AI_EDGE_REACH;
        const passedEdge = (moveDir > 0 && transform.x >= transit.targetX) ||
            (moveDir < 0 && transform.x <= transit.targetX);

        const moveLeft = moveDir < 0;
        const moveRight = moveDir > 0;
        const holdMove = createControlInput(moveLeft, moveRight, false);

        if (transit.action === 'jump') {
            if (!physics.isGrounded) {
                return holdMove;
            }
            if (atEdge || passedEdge || transit.committed) {
                transit.committed = true;
                return createControlInput(moveLeft, moveRight, true);
            }
            return this.moveTowardX(transform, transit.targetX, physics, false, true);
        }

        if (transit.action === 'fall') {
            if (!physics.isGrounded) {
                return holdMove;
            }
            if (atEdge || passedEdge || transit.committed) {
                transit.committed = true;
                return holdMove;
            }
            return this.moveTowardX(transform, transit.targetX, physics, false, true);
        }

        return this.moveTowardX(transform, transit.targetX, physics, false, false);
    }

    moveTowardX(transform, targetX, physics, allowJump, noStop) {
        const dx = targetX - transform.x;
        if (!noStop && Math.abs(dx) <= NAV_POSITION_TOLERANCE) {
            return NEUTRAL_CONTROL_INPUT;
        }

        const moveLeft = dx < 0;
        const moveRight = dx > 0;
        const jump = allowJump && physics.isGrounded;

        if (noStop && Math.abs(dx) <= NAV_POSITION_TOLERANCE) {
            return createControlInput(moveLeft || moveRight, moveRight || moveLeft, jump);
        }

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

        if (state.stuckTimer >= AI_STUCK_SECONDS &&
            state.transit &&
            state.transit.action === 'jump') {
            state.stuckTimer = 0;
            state.transit.committed = true;
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

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
