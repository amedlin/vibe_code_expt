class GameOverSystem extends System {
    constructor(canvasHeight, onGameOver) {
        super(['Transform', 'Physics']);
        this.canvasHeight = canvasHeight;
        this.onGameOver = onGameOver;
    }

    update(deltaTime, entities) {
        const checkEntities = this.getEntitiesWithComponents(entities);
        for (let entity of checkEntities) {
            const transform = entity.getComponent('Transform');
            const physics = entity.getComponent('Physics');

            if (physics.type === 'dynamic' && transform.y > this.canvasHeight + 100) {
                this.onGameOver();
                break;
            }
        }
    }
}
