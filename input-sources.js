class PlayerInputSource {
    constructor(inputBuffer) {
        this.inputBuffer = inputBuffer;
    }
}

class InputSourceManager {
    constructor(inputBuffer) {
        this.sources = {
            player: new PlayerInputSource(inputBuffer)
        };
        this.activeSourceId = 'player';
    }

    setSource(sourceId) {
        if (sourceId !== 'player' && sourceId !== 'ai') {
            throw new Error(`Unknown input source: ${sourceId}`);
        }
        this.activeSourceId = sourceId;
    }

    getSourceId() {
        return this.activeSourceId;
    }
}
