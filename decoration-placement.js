const DECORATION_TYPES = ['grass', 'tree', 'shrub'];

function isDecorationType(type) {
    return DECORATION_TYPES.includes(type);
}

// Find platform top (y) to stand on at anchorX; optional yHint picks among stacked overlaps.
function findDecorationSurfaceY(platforms, anchorX, spriteWidth, yHint = null) {
    const centerX = anchorX + spriteWidth / 2;
    const surfaces = [];

    for (const platform of platforms) {
        if (centerX >= platform.x && centerX <= platform.x + platform.width) {
            surfaces.push(platform.y);
        }
    }

    if (surfaces.length === 0) {
        return null;
    }

    if (yHint != null && !isNaN(yHint)) {
        let best = surfaces[0];
        let bestDist = Math.abs(best - yHint);
        for (let i = 1; i < surfaces.length; i++) {
            const dist = Math.abs(surfaces[i] - yHint);
            if (dist < bestDist) {
                best = surfaces[i];
                bestDist = dist;
            }
        }
        return best;
    }

    return Math.min(...surfaces);
}
