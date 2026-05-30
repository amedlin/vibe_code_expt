const NAV_GROUND_TOLERANCE = 12;
const NAV_MAX_JUMP_UP = 105;
const NAV_MAX_JUMP_HORZ = 135;
const NAV_MAX_WALK_GAP = 28;
const NAV_POSITION_TOLERANCE = 14;

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
            match = platform;
        }
    }
    return match;
}

function platformForTarget(target, platforms) {
    const feet = target.y + target.height;
    let best = platformForFeet(feet, target.centerX, platforms);
    if (best) return best;

    let fallback = null;
    let bestDrop = Infinity;
    for (const platform of platforms) {
        if (target.centerX < platform.left || target.centerX > platform.right) {
            continue;
        }
        const drop = platform.top - feet;
        if (drop >= -20 && drop < bestDrop) {
            bestDrop = drop;
            fallback = platform;
        }
    }
    return fallback;
}

function getPlatformNeighbors(current, platforms, agentWidth) {
    const neighbors = [];

    for (const other of platforms) {
        if (other.id === current.id) continue;

        const gap = horizontalGap(current, other);
        const heightDiff = other.top - current.top;

        if (Math.abs(heightDiff) <= 5 && gap <= NAV_MAX_WALK_GAP) {
            neighbors.push({ platform: other, action: 'walk' });
            continue;
        }

        if (heightDiff < -5 && -heightDiff <= NAV_MAX_JUMP_UP && gap <= NAV_MAX_JUMP_HORZ) {
            neighbors.push({ platform: other, action: 'jump' });
            continue;
        }

        if (heightDiff > 5 && heightDiff <= 220) {
            const overlapLeft = Math.max(current.left, other.left);
            const overlapRight = Math.min(current.right, other.right);
            if (overlapRight - overlapLeft > agentWidth) {
                neighbors.push({ platform: other, action: 'fall' });
            } else if (other.left >= current.right && other.left - current.right <= NAV_MAX_WALK_GAP) {
                neighbors.push({ platform: other, action: 'fall' });
            } else if (other.right <= current.left && current.left - other.right <= NAV_MAX_WALK_GAP) {
                neighbors.push({ platform: other, action: 'fall' });
            }
        }
    }

    return neighbors;
}

function findPlatformPath(fromPlatform, toPlatform, platforms, agentWidth) {
    if (!fromPlatform || !toPlatform) {
        return null;
    }
    if (fromPlatform.id === toPlatform.id) {
        return [fromPlatform.id];
    }

    const queue = [[fromPlatform.id]];
    const visited = new Set([fromPlatform.id]);

    while (queue.length > 0) {
        const path = queue.shift();
        const current = platforms.find((p) => p.id === path[path.length - 1]);
        for (const { platform: next } of getPlatformNeighbors(current, platforms, agentWidth)) {
            if (visited.has(next.id)) continue;
            const nextPath = path.concat(next.id);
            if (next.id === toPlatform.id) {
                return nextPath;
            }
            visited.add(next.id);
            queue.push(nextPath);
        }
    }

    return null;
}

function getTransition(from, to, agentWidth) {
    const heightDiff = to.top - from.top;

    if (Math.abs(heightDiff) <= 5) {
        const overlapLeft = Math.max(from.left, to.left);
        const overlapRight = Math.min(from.right, to.right);
        const targetX = overlapLeft < overlapRight
            ? (overlapLeft + overlapRight) / 2 - agentWidth / 2
            : (to.centerX - agentWidth / 2);
        return { action: 'walk', targetX, moveDir: targetX < from.centerX ? -1 : 1 };
    }

    if (heightDiff < -5) {
        const moveRight = to.centerX >= from.centerX;
        const targetX = moveRight
            ? from.right - agentWidth - 2
            : from.left + 2;
        return { action: 'jump', targetX, moveDir: moveRight ? 1 : -1 };
    }

    const moveRight = to.centerX >= from.centerX;
    const targetX = moveRight
        ? from.right - agentWidth + 4
        : from.left - 4;
    return { action: 'fall', targetX, moveDir: moveRight ? 1 : -1 };
}
