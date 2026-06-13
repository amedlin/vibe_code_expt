// Generic numeric, random, and geometry helpers shared across the game.
// Nothing here should know about ECS, navigation, or rendering.

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpAngle(a, b, t) {
    let delta = b - a;
    while (delta > Math.PI) {
        delta -= Math.PI * 2;
    }
    while (delta < -Math.PI) {
        delta += Math.PI * 2;
    }
    return a + delta * t;
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

// Deterministic PRNG (mulberry32). Small, fast, statistically fine for
// procgen visuals. Same seed -> identical sequence forever, so level
// backgrounds look the same every load / restart / screenshot.
class SeededRng {
    constructor(seed = 0) {
        // A zero seed produces a degenerate sequence; substitute a fixed
        // non-zero constant (golden-ratio derived) to keep things lively.
        this.state = (seed >>> 0) || 0x9e3779b9;
    }

    // Uniform float in [0, 1).
    next() {
        let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    // Uniform float in [min, max).
    range(min, max) {
        return min + this.next() * (max - min);
    }

    // Uniform integer in [min, max] (inclusive).
    intRange(min, max) {
        return Math.floor(min + this.next() * (max - min + 1));
    }

    pick(arr) {
        return arr[Math.floor(this.next() * arr.length)];
    }
}

// Collapse an arbitrary string into a 32-bit unsigned seed (cyrb53-style).
// Used to derive a deterministic seed from a level name so backgrounds are
// reproducible without the level author having to pin one explicitly.
function hashStringToSeed(str) {
    let h1 = 0xdeadbeef ^ 0;
    let h2 = 0x41c6ce57 ^ 0;
    for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    return h1 >>> 0;
}
