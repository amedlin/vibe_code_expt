class BoundarySystem extends System {
    constructor(canvasWidth, canvasHeight) {
        super(['Transform', 'Physics']);
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    update(deltaTime, entities) {
        const boundedEntities = this.getEntitiesWithComponents(entities);
        for (let entity of boundedEntities) {
            const transform = entity.getComponent('Transform');
            const physics = entity.getComponent('Physics');

            if (physics.type === 'dynamic') {
                if (transform.x < 0) transform.x = 0;
                if (transform.x + transform.width > this.canvasWidth) {
                    transform.x = this.canvasWidth - transform.width;
                }
            }
        }
    }
}
