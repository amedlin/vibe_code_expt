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

const BACK_SCALE_MIN = 0.9;
const BACK_SCALE_MAX = 0.95;
const FRONT_DISPLACE_MIN = 2;
const FRONT_DISPLACE_MAX = 10;
const FRONT_SCALE_MAX = 0.05;

function computeDecorationTransform(sprite, surfaceY, anchorX, depthLayer) {
    if (depthLayer === 'back') {
        const scale = randomInRange(BACK_SCALE_MIN, BACK_SCALE_MAX);
        const width = sprite.width * scale;
        const height = sprite.height * scale;
        return {
            x: anchorX,
            y: surfaceY - height,
            width,
            height,
            scale,
            depthOffset: 0
        };
    }

    const depthOffset = randomInRange(FRONT_DISPLACE_MIN, FRONT_DISPLACE_MAX);
    const depthT = (depthOffset - FRONT_DISPLACE_MIN) /
        (FRONT_DISPLACE_MAX - FRONT_DISPLACE_MIN);
    const scale = 1 + depthT * FRONT_SCALE_MAX;
    const width = sprite.width * scale;
    const height = sprite.height * scale;

    return {
        x: anchorX,
        y: surfaceY + depthOffset - height,
        width,
        height,
        scale,
        depthOffset
    };
}
