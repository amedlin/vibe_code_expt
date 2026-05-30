class AIStateComponent {
    constructor() {
        this.reset();
    }

    reset() {
        this.targetEntityId = null;
        this.path = [];
        this.pathStep = 0;
        this.transit = null;
        this.currentPlatformId = null;
        this.stuckTimer = 0;
        this.lastProgressX = null;
        this.lastProgressY = null;
    }
}
