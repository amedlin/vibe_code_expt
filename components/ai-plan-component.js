// Strategic intent: the ordered queue of collectibles the agent plans to
// pursue. Updated only when the queue is exhausted or all remaining targets
// become unreachable.
class AIPlanComponent {
    constructor() {
        // Ordered list of collectible entity IDs the agent intends to visit.
        this.collectiblePlan = [];

        // Cursor into collectiblePlan: the currently active target.
        this.planIndex = 0;

        // Entity ID of the collectible the agent is actively routing toward.
        // Used to detect when the active target has changed.
        this.targetEntityId = null;
    }

    reset() {
        this.collectiblePlan = [];
        this.planIndex = 0;
        this.targetEntityId = null;
    }
}
