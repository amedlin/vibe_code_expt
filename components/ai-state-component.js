class AIStateComponent {
    constructor() {
        this.reset();
    }

    reset() {
        this.collectiblePlan = [];
        this.planIndex = 0;
        this.targetEntityId = null;
        this.route = null;
        this.pathStep = 0;
        this.transit = null;
        this.currentPlatformId = null;
        this.stuckTimer = 0;
        this.lastProgressX = null;
        this.lastProgressY = null;
    }
}
