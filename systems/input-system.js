class InputSystem extends System {
    constructor(inputSourceManager, getInputContext = () => ({})) {
        super(['Input']);
        this.inputSourceManager = inputSourceManager;
        this.getInputContext = getInputContext;
    }

    update(deltaTime, entities) {
        const control = this.inputSourceManager.getControlInput(
            deltaTime,
            this.getInputContext()
        );
        const inputEntities = this.getEntitiesWithComponents(entities);
        for (let entity of inputEntities) {
            applyControlInput(entity.getComponent('Input'), control);
        }
    }
}
