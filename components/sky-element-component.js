// SkyElement — per-entity data for an animated sky element (cloud, bird,
// snow flurry, wind swirl, insect, etc.). The kind's spawn factory fills
// `state` with whatever the behavior needs (vx, vy, rotation,
// rotationSpeed, scale, scalePhase, target, hoverUntil, animator, ...).
//
// Coordinates on the entity's Transform are interpreted as screen-space:
// SkyRenderSystem deliberately bypasses the camera so sky always stays
// parallax-locked to the viewport.
class SkyElementComponent {
    constructor(kindId, state, behavior, renderFn) {
        this.kindId   = kindId;
        this.state    = state;
        this.behavior = behavior;
        this.renderFn = renderFn;
    }
}
