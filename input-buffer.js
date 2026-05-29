class InputBuffer {
    constructor() {
        this.keys = {};
    }

    isDown(key) {
        return !!this.keys[key];
    }

    setDown(key, pressed) {
        this.keys[key] = pressed;
    }
}
