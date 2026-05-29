class InputSystem extends System {
    constructor() {
        super(['Input']);
    }

    update(deltaTime, entities) {
        const inputEntities = this.getEntitiesWithComponents(entities);
        for (let entity of inputEntities) {
            const input = entity.getComponent('Input');
            input.moveLeft = keys['a'] || keys['ArrowLeft'];
            input.moveRight = keys['d'] || keys['ArrowRight'];
            input.jump = keys['w'] || keys[' '] || keys['ArrowUp'];
        }
    }
}
