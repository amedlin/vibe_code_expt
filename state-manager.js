class StateManager {
    constructor() {
        this.currentState = 'levelSelect';
        this.onStateChange = null;
    }

    setState(newState) {
        if (this.currentState !== newState) {
            this.currentState = newState;
            if (this.onStateChange) {
                this.onStateChange(newState);
            }
        }
    }

    getState() {
        return this.currentState;
    }
}
