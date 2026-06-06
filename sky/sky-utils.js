// Shared helpers for sky element kinds.
//
// A "sky kind" is a plain object:
//   {
//     id:              'puffyCloud',
//     spawnPerSecond:  0.10,
//     spawn(canvasW, canvasH, offscreen) -> { transform, state, animator? }
//     behavior(transform, state, dt, ctx) -> void
//     render(ctx, transform, state) -> void
//   }
//
// `spawn`'s `offscreen` argument tells the factory whether the element
// should appear at its natural entry edge (true; default for runtime
// spawns) or somewhere already inside the screen (false; used during
// pre-warm so the level starts with a populated sky).
//
// `ctx` passed to behavior is the per-frame snapshot from
// SkyBehaviorSystem: { canvasWidth, canvasHeight, siblings } where
// `siblings` is the array of all sky entities (used by swarming kinds).

function randomRange(min, max) {
    return min + Math.random() * (max - min);
}

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Standard right-edge spawn for left-drifting kinds. When `offscreen`,
// places the right edge of the bounding box at the right side of the
// canvas (entity not yet visible). When pre-warming, places it at a
// random x across the full canvas width.
function spawnAtRightEdge(canvasW, canvasH, width, height, yRange, offscreen) {
    const yMin = yRange[0] * canvasH;
    const yMax = yRange[1] * canvasH;
    const y = randomRange(yMin, yMax - height);
    const x = offscreen
        ? canvasW
        : randomRange(-width, canvasW);
    return { x, y, width, height };
}

// Spawn anywhere along a screen edge — used by kinds that can come from
// any direction (e.g. wandering birds).
function spawnAtAnyEdge(canvasW, canvasH, width, height) {
    const edge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bot, 3=left
    switch (edge) {
        case 0: return { x: randomRange(0, canvasW - width), y: -height, width, height };
        case 1: return { x: canvasW,                          y: randomRange(0, canvasH * 0.6), width, height };
        case 2: return { x: randomRange(0, canvasW - width), y: canvasH, width, height };
        default: return { x: -width,                          y: randomRange(0, canvasH * 0.6), width, height };
    }
}

// Standard left-drift behavior: moves the transform by (state.vx, state.vy)
// per second. Used by clouds, snow flurries, wind swirls.
function driftBehavior(transform, state, dt /* , ctx */) {
    transform.x += state.vx * dt;
    transform.y += state.vy * dt;
}
