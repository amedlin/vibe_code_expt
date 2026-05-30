const NAV_GROUND_TOLERANCE = 12;
const NAV_POSITION_TOLERANCE = 14;
const NAV_MAX_WALK_GAP = 28;
const NAV_FALL_MAX_DROP = 250;

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
    }

    rebuild(entities) {
        this.platforms = [];
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
    }

    getPlatforms() {
        return this.platforms;
    }

    getPlatformById(id) {
        return this.platforms.find((p) => p.id === id) ?? null;
    }

    findPath(fromPlatform, toPlatform, limits) {
        if (!fromPlatform || !toPlatform) {
            return null;
        }
        if (fromPlatform.id === toPlatform.id) {
            return { platformIds: [fromPlatform.id], steps: [] };
        }

        const queue = [[fromPlatform.id]];
        const visited = new Set([fromPlatform.id]);
        const cameFrom = new Map();
        const edgeAction = new Map();

        while (queue.length > 0) {
            const path = queue.shift();
            const currentId = path[path.length - 1];
            const current = this.getPlatformById(currentId);

            for (const edge of this.getEdgesFrom(current, limits)) {
                const nextId = edge.to.id;
                if (visited.has(nextId)) continue;

                cameFrom.set(nextId, currentId);
                edgeAction.set(`${currentId}->${nextId}`, edge.action);
                const nextPath = path.concat(nextId);

                if (nextId === toPlatform.id) {
                    return this.buildPathResult(nextPath, edgeAction);
                }

                visited.add(nextId);
                queue.push(nextPath);
            }
        }

        return null;
    }

    buildPathResult(platformIds, edgeAction) {
        const steps = [];
        for (let i = 0; i < platformIds.length - 1; i++) {
            const fromId = platformIds[i];
            const toId = platformIds[i + 1];
            steps.push({
                fromId,
                toId,
                action: edgeAction.get(`${fromId}->${toId}`)
            });
        }
        return { platformIds, steps };
    }

    pathCost(fromPlatform, toPlatform, limits) {
        const path = this.findPath(fromPlatform, toPlatform, limits);
        if (!path) {
            return Infinity;
        }
        return path.platformIds.length;
    }

    getEdgesFrom(current, limits) {
        const edges = [];
        const agentWidth = limits.agentWidth ?? 30;

        for (const other of this.platforms) {
            if (other.id === current.id) continue;

            const gap = horizontalGap(current, other);
            const heightDiff = other.top - current.top;

            if (Math.abs(heightDiff) <= 5 && gap <= limits.maxWalkGap) {
                edges.push({ to: other, action: 'walk' });
                continue;
            }

            if (heightDiff < -5 && -heightDiff <= limits.maxJumpUp && gap <= limits.maxJumpHorz) {
                edges.push({ to: other, action: 'jump' });
                continue;
            }

            if (heightDiff > 5 && heightDiff <= limits.maxFallDrop) {
                const overlapLeft = Math.max(current.left, other.left);
                const overlapRight = Math.min(current.right, other.right);
                if (overlapRight - overlapLeft >= agentWidth) {
                    edges.push({ to: other, action: 'fall' });
                } else if (other.left >= current.right && other.left - current.right <= limits.maxWalkGap) {
                    edges.push({ to: other, action: 'fall' });
                } else if (other.right <= current.left && current.left - other.right <= limits.maxWalkGap) {
                    edges.push({ to: other, action: 'fall' });
                }
            }
        }

        return edges;
    }

    buildCollectiblePlan(collectibles, startPlatform, limits) {
        if (!startPlatform || collectibles.length === 0) {
            return [];
        }

        const remaining = collectibles.map((c) => ({ ...c }));
        const plan = [];
        let currentPlatform = startPlatform;

        while (remaining.length > 0) {
            let bestIndex = -1;
            let bestScore = Infinity;

            for (let i = 0; i < remaining.length; i++) {
                const goalPlatform = platformForTarget(remaining[i], this.platforms);
                if (!goalPlatform) continue;

                const path = this.findPath(currentPlatform, goalPlatform, limits);
                if (!path) continue;

                const score = path.platformIds.length * 1000 + Math.hypot(
                    remaining[i].centerX - currentPlatform.centerX,
                    remaining[i].y - currentPlatform.top
                );

                if (score < bestScore) {
                    bestScore = score;
                    bestIndex = i;
                }
            }

            if (bestIndex < 0) {
                break;
            }

            const chosen = remaining.splice(bestIndex, 1)[0];
            plan.push(chosen.entityId);

            const goalPlatform = platformForTarget(chosen, this.platforms);
            if (goalPlatform) {
                currentPlatform = goalPlatform;
            }
        }

        return plan;
    }
}

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
            if (!match || platform.top < match.top) {
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

function getTransition(from, to, agentWidth, action) {
    const resolvedAction = action ?? 'walk';

    if (resolvedAction === 'walk') {
        const overlapLeft = Math.max(from.left, to.left);
        const overlapRight = Math.min(from.right, to.right);
        const targetX = overlapLeft < overlapRight
            ? (overlapLeft + overlapRight) / 2 - agentWidth / 2
            : (to.centerX - agentWidth / 2);
        const clampedX = clamp(targetX, from.left, from.right - agentWidth);
        return { action: 'walk', targetX: clampedX, moveDir: moveDirToward(clampedX, from), committed: false };
    }

    if (resolvedAction === 'jump') {
        const targetX = getJumpApproachX(from, to, agentWidth);
        return { action: 'jump', targetX, moveDir: moveDirToward(targetX, from), committed: false };
    }

    const targetX = getFallApproachX(from, to, agentWidth);
    return { action: 'fall', targetX, moveDir: moveDirToward(targetX, from), committed: false };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function moveDirToward(targetX, from) {
    const fromCenter = from.left + from.width / 2;
    return targetX + 15 >= fromCenter ? 1 : -1;
}

function getJumpApproachX(from, to, agentWidth) {
    const overlapLeft = Math.max(from.left, to.left);
    const overlapRight = Math.min(from.right, to.right);

    if (overlapRight - overlapLeft >= agentWidth) {
        const standX = to.centerX - agentWidth / 2;
        return clamp(standX, from.left, from.right - agentWidth);
    }

    if (to.left >= from.right) {
        return clamp(from.right - agentWidth - 2, from.left, from.right - agentWidth);
    }

    if (to.right <= from.left) {
        return from.left + 2;
    }

    return clamp(to.centerX - agentWidth / 2, from.left, from.right - agentWidth);
}

function getFallApproachX(from, to, agentWidth) {
    const overlapLeft = Math.max(from.left, to.left);
    const overlapRight = Math.min(from.right, to.right);

    if (overlapRight - overlapLeft >= agentWidth) {
        if (to.centerX >= from.centerX) {
            return clamp(from.right - agentWidth + 2, from.left, from.right - agentWidth);
        }
        return clamp(from.left + 2, from.left, from.right - agentWidth);
    }

    if (to.centerX >= from.centerX) {
        return from.right - agentWidth + 2;
    }

    return from.left + 2;
}

// Backward-compatible helpers for tests and callers.
function findPlatformPath(fromPlatform, toPlatform, platforms, limits) {
    const graph = new NavigationGraph();
    graph.platforms = platforms;
    const path = graph.findPath(fromPlatform, toPlatform, limits);
    return path ? path.platformIds : null;
}

function buildCollectiblePlan(collectibles, startPlatform, platforms, limits) {
    const graph = new NavigationGraph();
    graph.platforms = platforms;
    return graph.buildCollectiblePlan(collectibles, startPlatform, limits);
}

function getEdgeAction(from, to, platforms, limits) {
    const graph = new NavigationGraph();
    graph.platforms = platforms;
    for (const edge of graph.getEdgesFrom(from, limits)) {
        if (edge.to.id === to.id) {
            return edge.action;
        }
    }
    return null;
}
