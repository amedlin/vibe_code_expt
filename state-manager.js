class StateManager {
    constructor() {
        this.currentState = 'levelSelect';
    }

    setState(newState) {
        if (!GAME_STATES[newState]) {
            throw new Error(`Unknown game state: ${newState}`);
        }
        this.currentState = newState;
    }

    getState() {
        return this.currentState;
    }

    is(state) {
        return this.currentState === state;
    }

    getConfig() {
        return GAME_STATES[this.currentState];
    }
}
