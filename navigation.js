const NAV_GROUND_TOLERANCE = 12;
const NAV_POSITION_TOLERANCE = 14;
const NAV_MAX_WALK_GAP = 28;
const NAV_FALL_MAX_DROP = 250;

const NAV_ACTION_PRIORITY = {
    walk: 0,
    jump: 1,
    fall: 2,
    climb: 3
};

function computeNavLimits(jumpPower, gravity, speed, agentWidth = 30) {
    const airTime = (2 * jumpPower) / gravity;
    return {
        maxJumpUp: (jumpPower * jumpPower) / (2 * gravity) - 8,
        maxJumpHorz: speed * airTime * 0.85,
        maxWalkGap: NAV_MAX_WALK_GAP,
        maxFallDrop: NAV_FALL_MAX_DROP,
        agentWidth
    };
}

class NavigationGraph {
    constructor() {
        this.platforms = [];
        this.ladders = [];
        this.adjacency = new Map();
        this.limits = null;
    }

    rebuild(entities, limits, canvasWidth = 800) {
        this.limits = limits;
        this.platforms = [];
        this.ladders = [];

        for (const entity of entities) {
            if (!entity.hasComponent('Walkable') || !entity.hasComponent('Transform')) {
                continue;
            }
            const t = entity.getComponent('Transform');
            this.platforms.push({
                id: this.platforms.length,
                entityId: entity.id,
                left: t.x,
                right: t.x + t.width,
                top: t.y,
                width: t.width,
                centerX: t.x + t.width / 2
            });
        }

        const maxTop = this.platforms.reduce((m, p) => Math.max(m, p.top), 0);
        for (const platform of this.platforms) {
            platform.isGround = platform.top === maxTop ||
                platform.width >= canvasWidth * 0.85;
        }

        this.collectLadders(entities);
        this.preprocessConnectivity();
    }

    collectLadders(entities) {
        for (const entity of entities) {
            if (!entity.hasComponent('Ladder') || !entity.hasComponent('Transform')) {
                continue;
            }
            const transform = entity.getComponent('Transform');
            const ladder = entity.getComponent('Ladder');
            const topPlatform = this.findPlatformForLadderEnd(ladder.topY, transform.x, transform.width);
            const bottomPlatform = this.findPlatformForLadderEnd(ladder.bottomY, transform.x, transform.width);
            if (!topPlatform || !bottomPlatform) {
                continue;
            }

            ladder.topPlatformId = topPlatform.id;
            ladder.bottomPlatformId = bottomPlatform.id;

            this.ladders.push({
                entityId: entity.id,
                x: transform.x,
                width: transform.width,
                topY: ladder.topY,
                bottomY: ladder.bottomY,
                centerX: ladder.centerX,
                topPlatformId: topPlatform.id,
                bottomPlatformId: bottomPlatform.id
            });
        }
    }

    findPlatformForLadderEnd(topY, x, width) {
        const right = x + width;
        return this.platforms.find((platform) =>
            platform.top === topY &&
            x >= platform.left &&
            right <= platform.right
        ) ?? null;
    }

    getLadders() {
        return this.ladders;
    }

    preprocessConnectivity() {
        this.adjacency = new Map();
        const agentWidth = this.limits.agentWidth;

        for (const from of this.platforms) {
            const edges = [];

            for (const to of this.platforms) {
                if (from.id === to.id) continue;

                const edge = this.computeEdge(from, to, agentWidth);
                if (edge) {
                    edges.push(edge);
                }
            }

            this.adjacency.set(from.id, edges);
        }

        this.addLadderEdges(agentWidth);
    }

    addLadderEdges(agentWidth) {
        for (const ladder of this.ladders) {
            const bottomPlatform = this.getPlatformById(ladder.bottomPlatformId);
            const topPlatform = this.getPlatformById(ladder.topPlatformId);
            if (!bottomPlatform || !topPlatform) {
                continue;
            }

            const upEdge = this.computeClimbEdge(bottomPlatform, topPlatform, ladder, agentWidth, 'up');
            const downEdge = this.computeClimbEdge(topPlatform, bottomPlatform, ladder, agentWidth, 'down');

            if (upEdge) {
                this.appendEdge(bottomPlatform.id, upEdge);
            }
            if (downEdge) {
                this.appendEdge(topPlatform.id, downEdge);
            }
        }
    }

    appendEdge(fromId, edge) {
        const edges = this.adjacency.get(fromId) ?? [];
        const duplicate = edges.some((e) => e.toId === edge.toId && e.action === 'climb');
        if (!duplicate) {
            edges.push(edge);
            this.adjacency.set(fromId, edges);
        }
    }

    computeClimbEdge(from, to, ladder, agentWidth, direction) {
        const approachX = clamp(
            ladder.centerX - agentWidth / 2,
            from.left,
            from.right - agentWidth
        );

        return {
            toId: to.id,
            action: 'climb',
            direction,
            approachX,
            moveDir: ladder.centerX >= approachX + agentWidth / 2 ? 1 : -1,
            jumpAtEdge: false,
            requiresMomentum: false,
            heightDiff: to.top - from.top,
            ladderEntityId: ladder.entityId,
            ladderCenterX: ladder.centerX,
            ladderLeft: ladder.x,
            ladderRight: ladder.x + ladder.width
        };
    }

    computeEdge(from, to, agentWidth) {
        const gap = horizontalGap(from, to);
        const heightDiff = to.top - from.top;
        const limits = this.limits;

        let action = null;
        if (Math.abs(heightDiff) <= 5 && gap <= limits.maxWalkGap) {
            action = 'walk';
        } else if (heightDiff < -5 && -heightDiff <= limits.maxJumpUp && gap <= limits.maxJumpHorz) {
            action = 'jump';
        } else if (heightDiff > 5 && heightDiff <= limits.maxFallDrop) {
            const overlapLeft = Math.max(from.left, to.left);
            const overlapRight = Math.min(from.right, to.right);
            if (overlapRight - overlapLeft >= agentWidth) {
                action = 'fall';
            } else if (gap <= limits.maxWalkGap) {
                action = 'fall';
            } else if (gap <= limits.maxJumpHorz) {
                action = 'fallJump';
            }
        }

        if (!action) {
            return null;
        }

        let jumpAtEdge = false;
        if (action === 'fallJump') {
            jumpAtEdge = true;
            action = 'fall';
        }

        let approachX;
        let moveDir;
        let requiresMomentum = false;
        if (action === 'fall') {
            const approach = this.computeFallApproach(from, to, agentWidth);
            approachX = approach.approachX;
            moveDir = approach.moveDir;
        } else {
            approachX = this.computeApproachX(from, to, agentWidth, action);
            moveDir = to.centerX >= approachX + agentWidth / 2 ? 1 : -1;
            if (action === 'jump') {
                const overlapLeft = Math.max(from.left, to.left);
                const overlapRight = Math.min(from.right, to.right);
                requiresMomentum = overlapRight - overlapLeft < agentWidth;
            }
        }

        return {
            toId: to.id,
            action,
            approachX,
            moveDir,
            jumpAtEdge,
            requiresMomentum,
            heightDiff
        };
    }

    computeFallApproach(from, to, agentWidth) {
        const overlapLeft = Math.max(from.left, to.left);
        const overlapRight = Math.min(from.right, to.right);
        const hasOverlap = overlapRight - overlapLeft >= agentWidth;

        if (hasOverlap) {
            if (to.centerX <= from.centerX) {
                return { approachX: from.left, moveDir: -1 };
            }
            return { approachX: from.right - agentWidth, moveDir: 1 };
        }

        if (to.centerX >= from.centerX) {
            return { approachX: from.right - agentWidth, moveDir: 1 };
        }

        return { approachX: from.left, moveDir: -1 };
    }

    computeApproachX(from, to, agentWidth, action) {
        if (action === 'fall') {
            return this.computeFallApproach(from, to, agentWidth).approachX;
        }

        const overlapLeft = Math.max(from.left, to.left);
        const overlapRight = Math.min(from.right, to.right);
        const hasOverlap = overlapRight - overlapLeft >= agentWidth;

        if (action === 'walk') {
            if (hasOverlap) {
                const targetX = (overlapLeft + overlapRight) / 2 - agentWidth / 2;
                return clamp(targetX, from.left, from.right - agentWidth);
            }
            return clamp(to.centerX - agentWidth / 2, from.left, from.right - agentWidth);
        }

        if (action === 'jump') {
            if (hasOverlap) {
                return clamp(
                    to.centerX - agentWidth / 2,
                    from.left,
                    from.right - agentWidth
                );
            }
            if (to.left >= from.right) {
                return clamp(from.right - agentWidth - 2, from.left, from.right - agentWidth);
            }
            return from.left + 2;
        }

        return from.left;
    }

    getPlatforms() {
        return this.platforms;
    }

    getPlatformById(id) {
        return this.platforms.find((p) => p.id === id) ?? null;
    }

    getEdgesFrom(platformId) {
        return this.adjacency.get(platformId) ?? [];
    }

    getEdge(fromId, toId) {
        return this.getEdgesFrom(fromId).find((e) => e.toId === toId) ?? null;
    }

    findPath(fromPlatform, toPlatform) {
        if (!fromPlatform || !toPlatform) {
            return null;
        }
        if (fromPlatform.id === toPlatform.id) {
            return { platformIds: [fromPlatform.id], steps: [] };
        }

        const queue = [[fromPlatform.id]];
        const visited = new Set([fromPlatform.id]);
        const edgeKey = new Map();

        while (queue.length > 0) {
            const path = queue.shift();
            const currentId = path[path.length - 1];

            // Stable edge order keeps routes identical across frames. Random
            // variety lives in buildCollectiblePlan's softmax sampling only;
            // re-rolling paths every frame caused movement jitter.
            const edges = this.getEdgesFrom(currentId).slice()
                .sort((a, b) => {
                    const idDiff = a.toId - b.toId;
                    if (idDiff !== 0) {
                        return idDiff;
                    }
                    const aPriority = NAV_ACTION_PRIORITY[a.action] ?? 99;
                    const bPriority = NAV_ACTION_PRIORITY[b.action] ?? 99;
                    return aPriority - bPriority;
                });

            for (const edge of edges) {
                if (visited.has(edge.toId)) continue;

                edgeKey.set(`${currentId}->${edge.toId}`, edge);
                const nextPath = path.concat(edge.toId);

                if (edge.toId === toPlatform.id) {
                    return this.buildPathResult(nextPath, edgeKey);
                }

                visited.add(edge.toId);
                queue.push(nextPath);
            }
        }

        return null;
    }

    buildPathResult(platformIds, edgeKey) {
        const steps = [];
        for (let i = 0; i < platformIds.length - 1; i++) {
            const fromId = platformIds[i];
            const toId = platformIds[i + 1];
            const edge = edgeKey.get(`${fromId}->${toId}`);
            steps.push({
                fromId,
                toId,
                action: edge.action,
                direction: edge.direction ?? null,
                approachX: edge.approachX,
                moveDir: edge.moveDir,
                jumpAtEdge: edge.jumpAtEdge ?? false,
                requiresMomentum: edge.requiresMomentum ?? false,
                ladderEntityId: edge.ladderEntityId ?? null,
                ladderCenterX: edge.ladderCenterX ?? null,
                ladderLeft: edge.ladderLeft ?? null,
                ladderRight: edge.ladderRight ?? null
            });
        }
        return { platformIds, steps };
    }

    buildCollectiblePlan(collectibles, startPlatform, options = {}) {
        if (!startPlatform || collectibles.length === 0) {
            return [];
        }
        const temperature = options.temperature ?? NAV_PLAN_TEMPERATURE;

        const remaining = collectibles.map((c) => ({ ...c }));
        const plan = [];
        let currentPlatform = startPlatform;

        while (remaining.length > 0) {
            const candidates = [];

            for (let i = 0; i < remaining.length; i++) {
                const goalPlatform = platformForTarget(remaining[i], this.platforms);
                if (!goalPlatform) continue;

                const path = this.findPath(currentPlatform, goalPlatform);
                if (!path) continue;

                const score = path.platformIds.length * 1000 + Math.hypot(
                    remaining[i].centerX - currentPlatform.centerX,
                    remaining[i].y - currentPlatform.top
                );

                candidates.push({ remainingIndex: i, score });
            }

            if (candidates.length === 0) {
                break;
            }

            // Softmax sampling biased toward lower scores. Temperature controls
            // exploration: cheaper targets are strongly preferred but the AI
            // can occasionally pick a slightly worse one for variety.
            const minScore = Math.min(...candidates.map((c) => c.score));
            const weights = candidates.map((c) =>
                Math.exp(-(c.score - minScore) / temperature)
            );
            const pickedIndex = weightedRandomIndex(weights);
            const chosenCandidate = candidates[pickedIndex];

            const chosen = remaining.splice(chosenCandidate.remainingIndex, 1)[0];
            plan.push(chosen.entityId);

            const goalPlatform = platformForTarget(chosen, this.platforms);
            if (goalPlatform) {
                currentPlatform = goalPlatform;
            }
        }

        return plan;
    }
}

const NAV_PLAN_TEMPERATURE = 350;

function getCollectibleTargets(entities) {
    const targets = [];
    for (const entity of entities) {
        if (!entity.hasComponent('Collectible') || !entity.hasComponent('Transform')) {
            continue;
        }
        const transform = entity.getComponent('Transform');
        targets.push({
            entityId: entity.id,
            collectibleId: entity.getComponent('Collectible').collectibleId,
            x: transform.x,
            y: transform.y,
            width: transform.width,
            height: transform.height,
            centerX: transform.x + transform.width / 2
        });
    }
    return targets;
}

function horizontalGap(a, b) {
    if (a.right < b.left) return b.left - a.right;
    if (b.right < a.left) return a.left - b.right;
    return 0;
}

function platformForFeet(feetY, centerX, platforms) {
    let match = null;
    for (const platform of platforms) {
        if (Math.abs(feetY - platform.top) > NAV_GROUND_TOLERANCE) {
            continue;
        }
        if (centerX >= platform.left - 4 && centerX <= platform.right + 4) {
            if (!match || platform.top > match.top) {
                match = platform;
            }
        }
    }
    return match;
}

function platformForTarget(target, platforms) {
    const feet = target.y + target.height;
    const cx = target.centerX;

    let best = null;
    let bestScore = Infinity;

    for (const platform of platforms) {
        if (cx < platform.left || cx > platform.right) {
            continue;
        }

        const surfaceDelta = feet - platform.top;
        if (surfaceDelta < -20 || surfaceDelta > 80) {
            continue;
        }

        const score = Math.abs(surfaceDelta);
        if (score < bestScore) {
            bestScore = score;
            best = platform;
        }
    }

    return best;
}

function findPlatformPath(fromPlatform, toPlatform, platforms, limits) {
    const graph = new NavigationGraph();
    graph.platforms = platforms;
    graph.limits = limits;
    graph.ladders = [];
    graph.preprocessConnectivity();
    const path = graph.findPath(fromPlatform, toPlatform);
    return path ? path.platformIds : null;
}

function ladderForPlatforms(fromId, toId, ladders) {
    for (const ladder of ladders) {
        if (ladder.bottomPlatformId === fromId && ladder.topPlatformId === toId) {
            return { ...ladder, direction: 'up' };
        }
        if (ladder.topPlatformId === fromId && ladder.bottomPlatformId === toId) {
            return { ...ladder, direction: 'down' };
        }
    }
    return null;
}

function buildCollectiblePlan(collectibles, startPlatform, platforms, limits, options) {
    const graph = new NavigationGraph();
    graph.platforms = platforms;
    graph.limits = limits;
    graph.ladders = [];
    graph.preprocessConnectivity();
    return graph.buildCollectiblePlan(collectibles, startPlatform, options);
}
