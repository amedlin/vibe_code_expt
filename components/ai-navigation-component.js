// Tactical intent: the multi-hop route through the platform network toward
// the currently active target, plus the in-progress transit (walk / jump /
// fall) that moves the agent along the current edge.
class AINavigationComponent {
    constructor() {
        // { platformIds: number[], steps: Step[] } from NavigationGraph.
        // Stable across frames; only re-rolled when target / goal change or
        // the agent lands on an unexpected platform.
        this.route = null;

        // Cursor into route.steps for the edge currently being executed.
        this.pathStep = 0;

        // Currently executing edge transit:
        //   { action, targetX, moveDir, toPlatformId, committed,
        //     jumpAtEdge, requiresMomentum }
        // Set when a new edge begins, cleared on arrival.
        this.transit = null;

        // Last grounded platform id. Survives airborne frames so the agent
        // can still reason about where it came from while in flight.
        this.currentPlatformId = null;

        // Platform id we already replanned from after going off-route. Cleared
        // when back on the cached route so we replan once per bad landing.
        this.offPathReplanPlatformId = null;
    }

    reset() {
        this.route = null;
        this.pathStep = 0;
        this.transit = null;
        this.currentPlatformId = null;
        this.offPathReplanPlatformId = null;
    }
}
