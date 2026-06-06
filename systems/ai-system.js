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

        const targetChanged = state.targetEntityId !== target.entityId;
        const goalChanged = !state.route ||
            state.route.platformIds[state.route.platformIds.length - 1] !== goalPlatform.id;
        const offPath = groundedPlatform && state.route &&
            state.route.platformIds.indexOf(groundedPlatform.id) < 0;

        // Only re-roll the route when needed: new target, new goal platform,
        // or we ended up on an unexpected platform. Otherwise reuse the cached
        // route so randomized pathfinding doesn't pick a fresh route every
        // frame and jitter the AI.
        if (targetChanged || goalChanged || offPath) {
            const route = navGraph.findPath(currentPlatform, goalPlatform);
            if (!route) {
                this.skipUnreachableTarget(state);
                return NEUTRAL_CONTROL_INPUT;
            }
            state.route = route;
            state.targetEntityId = target.entityId;
            state.pathStep = 0;
            state.transit = null;
        }

        if (groundedPlatform) {
            const onPathIndex = state.route.platformIds.indexOf(groundedPlatform.id);
            if (onPathIndex >= 0) {
                state.pathStep = onPathIndex;
            }
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
                    jumpAtEdge: step.jumpAtEdge ?? false,
                    requiresMomentum: step.requiresMomentum ?? false,
                    toPlatformId: to,
                    committed: false
                };
            }

            return this.executeTransit(transform, physics, state.transit);
        }

        return null;
    }

    executeFallTransit(transform, physics, transit) {
        const moveLeft = transit.moveDir < 0;
        const moveRight = transit.moveDir > 0;

        if (!physics.isGrounded) {
            return createControlInput(moveLeft, moveRight, false);
        }

        const reachedEdge = (transit.moveDir > 0 && transform.x >= transit.targetX) ||
            (transit.moveDir < 0 && transform.x <= transit.targetX);

        if (!reachedEdge) {
            const dx = transit.targetX - transform.x;
            return createControlInput(dx < 0, dx > 0, false);
        }

        transit.committed = true;
        return createControlInput(moveLeft, moveRight, transit.jumpAtEdge);
    }

    executeTransit(transform, physics, transit) {
        if (transit.action === 'fall') {
            return this.executeFallTransit(transform, physics, transit);
        }

        if (transit.action === 'jump') {
            return this.executeJumpTransit(transform, physics, transit);
        }

        return this.moveTowardX(transform, transit.targetX, physics, false, false);
    }

    executeJumpTransit(transform, physics, transit) {
        const navGraph = this.getNavigationGraph();
        const dest = navGraph.getPlatformById(transit.toPlatformId);
        const agentWidth = transform.width;
        const agentLeft = transform.x;
        const agentRight = transform.x + agentWidth;

        if (!physics.isGrounded) {
            // In the air: steer toward the destination's horizontal bounds.
            // Once we're horizontally above the platform, go neutral so we
            // drop straight down and stop drifting past it.
            if (dest) {
                if (agentRight < dest.left + 2) {
                    return createControlInput(false, true, false);
                }
                if (agentLeft > dest.right - 2) {
                    return createControlInput(true, false, false);
                }
                return NEUTRAL_CONTROL_INPUT;
            }
            return createControlInput(transit.moveDir < 0, transit.moveDir > 0, false);
        }

        const dx = transit.targetX - transform.x;
        const approachDir = transit.moveDir;
        const reachedApproach = (approachDir > 0 && transform.x >= transit.targetX) ||
            (approachDir < 0 && transform.x <= transit.targetX) ||
            Math.abs(dx) <= AI_EDGE_REACH;

        if (transit.committed || reachedApproach) {
            transit.committed = true;

            if (transit.requiresMomentum) {
                // Gap jump: commit at full speed toward destination.
                const destDir = dest && dest.centerX > transform.x + agentWidth / 2
                    ? 1
                    : -1;
                return createControlInput(destDir < 0, destDir > 0, true);
            }

            // Overlap jump: wait for any walking momentum to bleed off,
            // then jump straight up so we land on the platform above.
            if (Math.abs(physics.vx) > 30) {
                return NEUTRAL_CONTROL_INPUT;
            }
            return createControlInput(false, false, true);
        }

        // Approach phase: walk toward the launch point. Gap jumps need full
        // momentum, so do not slow down near the target.
        if (transit.requiresMomentum) {
            const walkDir = dx > 0 ? 1 : -1;
            return createControlInput(walkDir < 0, walkDir > 0, false);
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
            (state.transit.action === 'jump' || state.transit.jumpAtEdge)) {
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
