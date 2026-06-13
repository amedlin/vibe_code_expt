// PLAYER_SPAWN_WIDTH is assigned in character/player-animations.js from idle foot span.
const PLAYER_SPAWN_HEIGHT = 40;
const DEFAULT_PLAYER_SPAWN_X = 100;
const DEFAULT_PLAYER_SPAWN_Y = 300;
const SPAWN_CLEARANCE = 4;

function getCollectibleObstacleBounds(levelData) {
    const obstacles = [];
    if (!levelData.collectibles) {
        return obstacles;
    }

    for (const def of levelData.collectibles) {
        if (def.kind !== PILL_ID) continue;
        obstacles.push({
            x: def.x,
            y: def.y,
            width: PILL_WIDTH,
            height: PILL_HEIGHT
        });
    }
    return obstacles;
}

function spawnBoundsOverlap(a, b, clearance = 0) {
    return rectanglesOverlap(
        a,
        {
            x: b.x - clearance,
            y: b.y - clearance,
            width: b.width + clearance * 2,
            height: b.height + clearance * 2
        }
    );
}

function isPlayerSpawnClear(x, y, obstacles, canvasWidth) {
    const bounds = {
        x,
        y,
        width: PLAYER_SPAWN_WIDTH,
        height: PLAYER_SPAWN_HEIGHT
    };

    if (x < 0 || y < 0 || x + bounds.width > canvasWidth) {
        return false;
    }

    for (const obstacle of obstacles) {
        if (spawnBoundsOverlap(bounds, obstacle, SPAWN_CLEARANCE)) {
            return false;
        }
    }
    return true;
}

function findSafePlayerSpawn(levelData, canvasWidth) {
    const obstacles = getCollectibleObstacleBounds(levelData);
    const candidates = [];

    candidates.push({ x: DEFAULT_PLAYER_SPAWN_X, y: DEFAULT_PLAYER_SPAWN_Y });

    for (let dx = 40; dx < canvasWidth; dx += 40) {
        candidates.push({ x: DEFAULT_PLAYER_SPAWN_X + dx, y: DEFAULT_PLAYER_SPAWN_Y });
        candidates.push({ x: DEFAULT_PLAYER_SPAWN_X - dx, y: DEFAULT_PLAYER_SPAWN_Y });
    }

    for (let dy = 40; dy <= 200; dy += 40) {
        candidates.push({ x: DEFAULT_PLAYER_SPAWN_X, y: DEFAULT_PLAYER_SPAWN_Y - dy });
        candidates.push({ x: DEFAULT_PLAYER_SPAWN_X, y: DEFAULT_PLAYER_SPAWN_Y + dy });
    }

    for (const candidate of candidates) {
        if (isPlayerSpawnClear(candidate.x, candidate.y, obstacles, canvasWidth)) {
            return candidate;
        }
    }

    console.warn('No clear collectible-free spawn found; using default');
    return { x: DEFAULT_PLAYER_SPAWN_X, y: DEFAULT_PLAYER_SPAWN_Y };
}
