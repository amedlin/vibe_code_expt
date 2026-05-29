class TangramCollectionSystem extends System {
    constructor(getPlayerEntity, getECS) {
        super(['TangramPiece', 'Transform']);
        this.getPlayerEntity = getPlayerEntity;
        this.getECS = getECS;
    }

    update(deltaTime, entities) {
        const player = this.getPlayerEntity();
        if (!player || !player.hasComponent('Inventory')) {
            return;
        }

        const playerTransform = player.getComponent('Transform');
        const inventory = player.getComponent('Inventory');
        const playerBounds = {
            x: playerTransform.x,
            y: playerTransform.y,
            width: playerTransform.width,
            height: playerTransform.height
        };

        const ecs = this.getECS();
        const collectibles = this.getEntitiesWithComponents(entities);

        for (let entity of collectibles) {
            const piece = entity.getComponent('TangramPiece');
            const transform = entity.getComponent('Transform');
            const def = getTangramPiece(piece.pieceId);
            if (!def) continue;

            const pieceBounds = {
                x: transform.x,
                y: transform.y,
                width: def.width,
                height: def.height
            };

            if (rectanglesOverlap(playerBounds, pieceBounds)) {
                inventory.add(piece.pieceId);
                ecs.destroyEntity(entity);
            }
        }
    }
}
