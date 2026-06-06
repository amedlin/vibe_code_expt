// Generic numeric, random, and geometry helpers shared across the game.
// Nothing here should know about ECS, navigation, or rendering.

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

// Linearly accelerate `current` toward `target` by at most `acceleration*dt`.
// Used by the movement system for ground/air control feel.
function accelerateToward(current, target, acceleration, deltaTime) {
    const step = acceleration * deltaTime;
    if (current < target) {
        return Math.min(target, current + step);
    }
    if (current > target) {
        return Math.max(target, current - step);
    }
    return current;
}

// Uniform random float in [min, max).
function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

// Uniform random integer in [min, max] (inclusive).
function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
}

// Fisher-Yates shuffle, mutates and returns `arr`.
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}

// Sample an index in [0, weights.length) with probability proportional to
// the corresponding non-negative weight. Falls back to a uniform pick if
// all weights are zero.
function weightedRandomIndex(weights) {
    let total = 0;
    for (const w of weights) total += w;
    if (total <= 0) {
        return Math.floor(Math.random() * weights.length);
    }
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) return i;
    }
    return weights.length - 1;
}

// Axis-aligned rectangle overlap. Accepts any objects with {x, y, width, height}.
function rectanglesOverlap(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}
