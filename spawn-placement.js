const PLAYER_SPAWN_WIDTH = 30;
const PLAYER_SPAWN_HEIGHT = 40;
const DEFAULT_PLAYER_SPAWN_X = 100;
const DEFAULT_PLAYER_SPAWN_Y = 300;
const SPAWN_CLEARANCE = 4;

function getTangramObstacleBounds(levelData) {
    const obstacles = [];
    if (!levelData.tangramPieces) {
        return obstacles;
    }

    for (const piece of levelData.tangramPieces) {
        const def = getTangramPiece(piece.pieceId);
        if (!def) continue;
        obstacles.push({
            x: piece.x,
            y: piece.y,
            width: def.width,
            height: def.height
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
    const obstacles = getTangramObstacleBounds(levelData);
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

    console.warn('No clear tangram-free spawn found; using default');
    return { x: DEFAULT_PLAYER_SPAWN_X, y: DEFAULT_PLAYER_SPAWN_Y };
}
