// Marks an entity as drivable by the AISystem (when the AI control source is
// active) and carries that agent's personality / behavior tuning knobs.
//
// Different agents can share the same systems but have very different
// behavior by varying these parameters.
class AIAgentComponent {
    constructor(config = {}) {
        // Softmax temperature for collectible-order sampling. Lower = greedier
        // (closer pickups strongly preferred), higher = more exploratory.
        this.planTemperature = config.planTemperature ?? 350;

        // How close (px) to a launch / fall-off point counts as "at the edge".
        this.edgeReachThreshold = config.edgeReachThreshold ?? 18;

        // Seconds of no horizontal progress while trying to move before the
        // agent triggers a recovery jump.
        this.stuckThreshold = config.stuckThreshold ?? 1.0;

        // For overlap (straight-up) jumps, wait until |vx| drops below this
        // (px/s) so the agent lifts off without sideways drift.
        this.jumpVxBleedThreshold = config.jumpVxBleedThreshold ?? 30;
    }
}
