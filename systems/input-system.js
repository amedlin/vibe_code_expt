class InputSystem extends System {
    constructor(inputBuffer, getSourceId) {
        super(['PlayerControlled', 'Input']);
        this.inputBuffer = inputBuffer;
        this.getSourceId = getSourceId;
    }

    update(deltaTime, entities) {
        if (this.getSourceId() !== 'player') {
            return;
        }

        const keys = this.inputBuffer.keys;
        const control = createControlInput(
            keys['a'] || keys['ArrowLeft'],
            keys['d'] || keys['ArrowRight'],
            keys[' '],
            keys['w'] || keys['ArrowUp'],
            keys['s'] || keys['ArrowDown']
        );

        const controlledEntities = this.getEntitiesWithComponents(entities);
        for (let entity of controlledEntities) {
            applyControlInput(entity.getComponent('Input'), control);
        }
    }
}
