class PlayerInputSource {
    constructor(inputBuffer) {
        this.inputBuffer = inputBuffer;
    }

    getControlInput(_deltaTime, _context) {
        const keys = this.inputBuffer.keys;
        return createControlInput(
            keys['a'] || keys['ArrowLeft'],
            keys['d'] || keys['ArrowRight'],
            keys['w'] || keys[' '] || keys['ArrowUp']
        );
    }
}

class AIInputSource {
    getControlInput(_deltaTime, _context) {
        // Stub: AI controller will synthesize inputs here later.
        return NEUTRAL_CONTROL_INPUT;
    }
}

class InputSourceManager {
    constructor(inputBuffer) {
        this.sources = {
            player: new PlayerInputSource(inputBuffer),
            ai: new AIInputSource()
        };
        this.activeSourceId = 'player';
    }

    setSource(sourceId) {
        if (!this.sources[sourceId]) {
            throw new Error(`Unknown input source: ${sourceId}`);
        }
        this.activeSourceId = sourceId;
    }

    getSourceId() {
        return this.activeSourceId;
    }

    getControlInput(deltaTime, context = {}) {
        return this.sources[this.activeSourceId].getControlInput(deltaTime, context);
    }
}
