// Self-observation: tracks whether the agent is making forward progress so
// the AISystem can fire stuck-recovery (e.g. force a jump when wedged at a
// ledge).
class AIProgressComponent {
    constructor() {
        // Accumulated seconds with no meaningful movement while inputting one.
        this.stuckTimer = 0;

        // Last sampled position used to detect lack of progress. Null until
        // first observation.
        this.lastProgressX = null;
        this.lastProgressY = null;
    }

    reset() {
        this.stuckTimer = 0;
        this.lastProgressX = null;
        this.lastProgressY = null;
    }
}
