const LADDER_MIN_HEIGHT = 20;

function findPlatformAtTop(platforms, topY, x, width) {
    const right = x + width;
    return platforms.find((p) =>
        p.y === topY &&
        x >= p.x &&
        right <= p.x + p.width
    ) ?? null;
}

function platformPairKey(topIndex, bottomIndex) {
    const a = Math.min(topIndex, bottomIndex);
    const b = Math.max(topIndex, bottomIndex);
    return `${a}-${b}`;
}

function validateLadders(ladderDefs, platforms) {
    const resolved = [];
    const seenPairs = new Set();

    for (const def of ladderDefs) {
        const { x, width, topY, bottomY } = def;

        if (topY >= bottomY) {
            console.warn(
                `Skipping ladder at x=${x}: topY (${topY}) must be less than bottomY (${bottomY}).`
            );
            continue;
        }

        if (bottomY - topY < LADDER_MIN_HEIGHT) {
            console.warn(
                `Skipping ladder at x=${x}: vertical span (${bottomY - topY}px) is below minimum (${LADDER_MIN_HEIGHT}px).`
            );
            continue;
        }

        const topPlatform = findPlatformAtTop(platforms, topY, x, width);
        const bottomPlatform = findPlatformAtTop(platforms, bottomY, x, width);

        if (!topPlatform) {
            console.warn(
                `Skipping ladder at x=${x}: no platform found with top y=${topY}.`
            );
            continue;
        }
        if (!bottomPlatform) {
            console.warn(
                `Skipping ladder at x=${x}: no platform found with top y=${bottomY}.`
            );
            continue;
        }

        const topIndex = platforms.indexOf(topPlatform);
        const bottomIndex = platforms.indexOf(bottomPlatform);
        const pairKey = platformPairKey(topIndex, bottomIndex);

        if (seenPairs.has(pairKey)) {
            console.warn(
                `Skipping duplicate ladder between platforms at y=${topY} and y=${bottomY}.`
            );
            continue;
        }

        const right = x + width;
        const topLeft = topPlatform.x;
        const topRight = topPlatform.x + topPlatform.width;
        const bottomLeft = bottomPlatform.x;
        const bottomRight = bottomPlatform.x + bottomPlatform.width;

        if (x < topLeft || right > topRight) {
            console.warn(
                `Skipping ladder at x=${x}: horizontal span [${x}, ${right}] extends past upper platform [${topLeft}, ${topRight}].`
            );
            continue;
        }
        if (x < bottomLeft || right > bottomRight) {
            console.warn(
                `Skipping ladder at x=${x}: horizontal span [${x}, ${right}] extends past lower platform [${bottomLeft}, ${bottomRight}].`
            );
            continue;
        }

        seenPairs.add(pairKey);
        resolved.push({
            x,
            width,
            topY,
            bottomY,
            topPlatformIndex: topIndex,
            bottomPlatformIndex: bottomIndex,
            centerX: x + width / 2
        });
    }

    return resolved;
}
