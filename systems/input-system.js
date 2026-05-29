class InputSystem extends System {
    constructor(inputBuffer) {
        super(['Input']);
        this.inputBuffer = inputBuffer;
    }

    update(deltaTime, entities) {
        const inputEntities = this.getEntitiesWithComponents(entities);
        for (let entity of inputEntities) {
            const input = entity.getComponent('Input');
            const keys = this.inputBuffer.keys;
            input.moveLeft = keys['a'] || keys['ArrowLeft'];
            input.moveRight = keys['d'] || keys['ArrowRight'];
            input.jump = keys['w'] || keys[' '] || keys['ArrowUp'];
        }
    }
}
