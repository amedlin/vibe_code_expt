const AI_STUCK_SECONDS = 0.75;
const AI_EDGE_REACH = 20;

class AISystem extends System {
    constructor(getSourceId, getNavigationGraph, getGameState, getGravity) {
        super(['AIAgent', 'AIState', 'Input', 'Transform', 'Physics', 'Movement']);
        this.getSourceId = getSourceId;
        this.getNavigationGraph = getNavigationGraph;
        this.getGameState = getGameState;
        this.getGravity = getGravity;
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

    getNavLimits(entity) {
        const movement = entity.getComponent('Movement');
        const transform = entity.getComponent('Transform');
        return computeNavLimits(
            movement.jumpPower,
            this.getGravity(),
            movement.speed,
            transform.width
        );
    }

    ensureCollectiblePlan(state, navGraph, collectibles, currentPlatform, limits) {
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
                currentPlatform,
                limits
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
        state.path = [];
        state.pathStep = 0;
        state.transit = null;
    }

    computeControl(entity, navGraph, platforms, collectibles, deltaTime) {
        const transform = entity.getComponent('Transform');
        const physics = entity.getComponent('Physics');
        const state = entity.getComponent('AIState');
        const limits = this.getNavLimits(entity);

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

        this.ensureCollectiblePlan(state, navGraph, collectibles, currentPlatform, limits);

        let target = this.getPlannedTarget(state, collectibles);
        if (!target) {
            return NEUTRAL_CONTROL_INPUT;
        }

        const goalPlatform = platformForTarget(target, platforms);
        if (!goalPlatform) {
            this.skipUnreachableTarget(state);
            return NEUTRAL_CONTROL_INPUT;
        }

        const route = navGraph.findPath(currentPlatform, goalPlatform, limits);
        if (!route) {
            this.skipUnreachableTarget(state);
            return NEUTRAL_CONTROL_INPUT;
        }

        if (state.targetEntityId !== target.entityId) {
            state.targetEntityId = target.entityId;
            state.path = route.platformIds;
            state.pathStep = 0;
            state.transit = null;
        } else if (state.path.length === 0 ||
                   state.path[state.path.length - 1] !== goalPlatform.id) {
            state.path = route.platformIds;
            state.pathStep = 0;
            state.transit = null;
        }

        const goalX = target.centerX - agentWidth / 2;

        if (currentPlatform.id === goalPlatform.id) {
            state.path = route.platformIds;
            state.transit = null;
            return this.moveTowardX(transform, goalX, physics, false, false);
        }

        if (physics.isGrounded && groundedPlatform) {
            const onPathIndex = state.path.indexOf(groundedPlatform.id);
            if (onPathIndex >= 0) {
                state.pathStep = onPathIndex;
            }
        }

        if (state.path.length >= 2 && state.pathStep < state.path.length - 1) {
            const control = this.followPath(
                transform,
                physics,
                state,
                navGraph,
                agentWidth,
                limits
            );
            if (control) {
                return this.applyStuckRecovery(transform, physics, state, control, deltaTime);
            }
        }

        return NEUTRAL_CONTROL_INPUT;
    }

    followPath(transform, physics, state, navGraph, agentWidth, limits) {
        while (state.pathStep < state.path.length - 1) {
            const from = navGraph.getPlatformById(state.path[state.pathStep]);
            const to = navGraph.getPlatformById(state.path[state.pathStep + 1]);
            if (!from || !to) {
                state.path = [];
                return null;
            }

            const feetY = transform.y + transform.height;
            const centerX = transform.x + agentWidth / 2;
            const onTarget = platformForFeet(feetY, centerX, navGraph.getPlatforms());

            if (physics.isGrounded && onTarget && onTarget.id === to.id) {
                state.pathStep++;
                state.transit = null;
                state.stuckTimer = 0;
                continue;
            }

            if (!state.transit || state.transit.toPlatformId !== to.id) {
                const action = getEdgeAction(from, to, navGraph.getPlatforms(), limits);
                state.transit = {
                    ...getTransition(from, to, agentWidth, action),
                    toPlatformId: to.id
                };
            }

            return this.executeTransit(transform, physics, state.transit);
        }

        return null;
    }

    executeTransit(transform, physics, transit) {
        const dx = transit.targetX - transform.x;
        const atEdge = Math.abs(dx) <= AI_EDGE_REACH;
        const passedEdge = (transit.moveDir > 0 && transform.x >= transit.targetX) ||
            (transit.moveDir < 0 && transform.x <= transit.targetX);

        const moveLeft = transit.moveDir < 0;
        const moveRight = transit.moveDir > 0;
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

        if (state.stuckTimer >= AI_STUCK_SECONDS) {
            state.stuckTimer = 0;
            if (state.transit) {
                state.transit.committed = true;
            }
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
