class AISystem extends System {
    constructor(getSourceId, getNavigationGraph, getGameState) {
        super([
            'AIAgent',
            'AIPlan',
            'AINavigation',
            'AIProgress',
            'Input',
            'Transform',
            'Physics',
            'Movement'
        ]);
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

    ensureCollectiblePlan(plan, agent, navGraph, collectibles, currentPlatform) {
        const liveIds = new Set(collectibles.map((c) => c.entityId));

        while (plan.planIndex < plan.collectiblePlan.length &&
               !liveIds.has(plan.collectiblePlan[plan.planIndex])) {
            plan.planIndex++;
        }

        const needsPlan = plan.collectiblePlan.length === 0 ||
            plan.planIndex >= plan.collectiblePlan.length;

        if (!needsPlan || collectibles.length === 0 || !currentPlatform) {
            return;
        }

        const blockedHere = plan.planBlockedPlatformId === currentPlatform.id &&
            plan.planBlockedCollectibleCount === collectibles.length;
        if (blockedHere) {
            return;
        }

        plan.collectiblePlan = navGraph.buildCollectiblePlan(
            collectibles,
            currentPlatform,
            { temperature: agent.planTemperature }
        );
        plan.planIndex = 0;

        if (plan.collectiblePlan.length === 0) {
            plan.planBlockedPlatformId = currentPlatform.id;
            plan.planBlockedCollectibleCount = collectibles.length;
        } else {
            plan.planBlockedPlatformId = null;
            plan.planBlockedCollectibleCount = 0;
        }
    }

    getPlannedTarget(plan, collectibles) {
        if (plan.planIndex >= plan.collectiblePlan.length) {
            return null;
        }
        const targetId = plan.collectiblePlan[plan.planIndex];
        return collectibles.find((c) => c.entityId === targetId) ?? null;
    }

    skipUnreachableTarget(plan, nav) {
        plan.planIndex++;
        plan.targetEntityId = null;
        nav.route = null;
        nav.pathStep = 0;
        nav.transit = null;
    }

    computeControl(entity, navGraph, platforms, collectibles, deltaTime) {
        const transform = entity.getComponent('Transform');
        const physics = entity.getComponent('Physics');
        const agent = entity.getComponent('AIAgent');
        const plan = entity.getComponent('AIPlan');
        const nav = entity.getComponent('AINavigation');
        const progress = entity.getComponent('AIProgress');

        if (collectibles.length === 0) {
            plan.reset();
            nav.reset();
            progress.reset();
            return NEUTRAL_CONTROL_INPUT;
        }

        const agentWidth = transform.width;
        const centerX = transform.x + agentWidth / 2;
        const feetY = transform.y + transform.height;

        const groundedPlatform = physics.isGrounded
            ? platformForFeet(feetY, centerX, platforms)
            : null;

        if (groundedPlatform) {
            nav.currentPlatformId = groundedPlatform.id;
        }

        const currentPlatform = navGraph.getPlatformById(nav.currentPlatformId)
            ?? groundedPlatform;

        if (!currentPlatform) {
            return NEUTRAL_CONTROL_INPUT;
        }

        this.ensureCollectiblePlan(plan, agent, navGraph, collectibles, currentPlatform);

        const target = this.getPlannedTarget(plan, collectibles);
        if (!target) {
            return NEUTRAL_CONTROL_INPUT;
        }

        const goalPlatform = platformForTarget(target, platforms);
        if (!goalPlatform) {
            this.skipUnreachableTarget(plan, nav);
            return NEUTRAL_CONTROL_INPUT;
        }

        const targetChanged = plan.targetEntityId !== target.entityId;
        const goalChanged = !nav.route ||
            nav.route.platformIds[nav.route.platformIds.length - 1] !== goalPlatform.id;
        const offPath = groundedPlatform && nav.route &&
            nav.route.platformIds.indexOf(groundedPlatform.id) < 0;
        const offPathNeedsReplan = offPath &&
            nav.offPathReplanPlatformId !== groundedPlatform.id;

        // Recompute the route only when the target/goal changes or when we
        // first land on an unexpected platform — not every frame while stuck
        // off-route, which previously re-rolled paths and caused edge jitter.
        if (targetChanged || goalChanged || offPathNeedsReplan) {
            const route = navGraph.findPath(currentPlatform, goalPlatform);
            if (!route) {
                this.skipUnreachableTarget(plan, nav);
                return NEUTRAL_CONTROL_INPUT;
            }
            nav.route = route;
            plan.targetEntityId = target.entityId;
            nav.pathStep = 0;
            nav.transit = null;
            nav.offPathReplanPlatformId = offPath ? groundedPlatform.id : null;
        }

        if (!offPath) {
            nav.offPathReplanPlatformId = null;
        }

        if (groundedPlatform) {
            const onPathIndex = nav.route.platformIds.indexOf(groundedPlatform.id);
            if (onPathIndex >= 0) {
                nav.pathStep = onPathIndex;
            }
        }

        const goalX = clamp(
            target.centerX - agentWidth / 2,
            goalPlatform.left,
            goalPlatform.right - agentWidth
        );

        if (currentPlatform.id === goalPlatform.id) {
            nav.transit = null;
            return this.moveTowardX(transform, goalX, physics, false, false);
        }

        if (nav.route && nav.pathStep < nav.route.steps.length) {
            const control = this.followRoute(transform, physics, agent, nav, progress);
            if (control) {
                return this.applyStuckRecovery(
                    transform,
                    physics,
                    nav,
                    progress,
                    agent,
                    control,
                    deltaTime
                );
            }
        }

        return NEUTRAL_CONTROL_INPUT;
    }

    followRoute(transform, physics, agent, nav, progress) {
        while (nav.pathStep < nav.route.steps.length) {
            const step = nav.route.steps[nav.pathStep];
            const to = nav.route.platformIds[nav.pathStep + 1];
            const feetY = transform.y + transform.height;
            const centerX = transform.x + transform.width / 2;
            const onPlatform = platformForFeet(feetY, centerX, this.getNavigationGraph().getPlatforms());

            if (physics.isGrounded && onPlatform && onPlatform.id === to) {
                nav.pathStep++;
                nav.transit = null;
                progress.stuckTimer = 0;
                continue;
            }

            if (!nav.transit || nav.transit.toPlatformId !== to) {
                nav.transit = {
                    action: step.action,
                    targetX: step.approachX,
                    moveDir: step.moveDir,
                    jumpAtEdge: step.jumpAtEdge ?? false,
                    requiresMomentum: step.requiresMomentum ?? false,
                    toPlatformId: to,
                    committed: false
                };
            }

            return this.executeTransit(transform, physics, agent, nav.transit);
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

    executeTransit(transform, physics, agent, transit) {
        if (transit.action === 'fall') {
            return this.executeFallTransit(transform, physics, transit);
        }

        if (transit.action === 'jump') {
            return this.executeJumpTransit(transform, physics, agent, transit);
        }

        return this.moveTowardX(transform, transit.targetX, physics, false, false);
    }

    executeJumpTransit(transform, physics, agent, transit) {
        const navGraph = this.getNavigationGraph();
        const dest = navGraph.getPlatformById(transit.toPlatformId);
        const agentWidth = transform.width;
        const agentLeft = transform.x;
        const agentRight = transform.x + agentWidth;

        if (!physics.isGrounded) {
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
            Math.abs(dx) <= agent.edgeReachThreshold;

        if (transit.committed || reachedApproach) {
            transit.committed = true;

            if (transit.requiresMomentum) {
                const destDir = dest && dest.centerX > transform.x + agentWidth / 2
                    ? 1
                    : -1;
                return createControlInput(destDir < 0, destDir > 0, true);
            }

            if (Math.abs(physics.vx) > agent.jumpVxBleedThreshold) {
                return NEUTRAL_CONTROL_INPUT;
            }
            return createControlInput(false, false, true);
        }

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

    applyStuckRecovery(transform, physics, nav, progress, agent, control, deltaTime) {
        const x = transform.x;
        const y = transform.y;

        if (progress.lastProgressX === null) {
            progress.lastProgressX = x;
            progress.lastProgressY = y;
            progress.stuckTimer = 0;
            return control;
        }

        const moved = Math.hypot(x - progress.lastProgressX, y - progress.lastProgressY);
        const tryingToMove = control.moveLeft || control.moveRight;

        if (tryingToMove && moved < 2 && physics.isGrounded) {
            progress.stuckTimer += deltaTime;
        } else {
            progress.stuckTimer = 0;
            progress.lastProgressX = x;
            progress.lastProgressY = y;
        }

        if (progress.stuckTimer >= agent.stuckThreshold &&
            nav.transit &&
            (nav.transit.action === 'jump' || nav.transit.jumpAtEdge)) {
            progress.stuckTimer = 0;
            nav.transit.committed = true;
            progress.lastProgressX = x;
            progress.lastProgressY = y;
            return createControlInput(control.moveLeft, control.moveRight, true);
        }

        return control;
    }
}

function resetAIStateOnEntities(entities) {
    for (const entity of entities) {
        if (entity.hasComponent('AIPlan')) {
            entity.getComponent('AIPlan').reset();
        }
        if (entity.hasComponent('AINavigation')) {
            entity.getComponent('AINavigation').reset();
        }
        if (entity.hasComponent('AIProgress')) {
            entity.getComponent('AIProgress').reset();
        }
    }
}
