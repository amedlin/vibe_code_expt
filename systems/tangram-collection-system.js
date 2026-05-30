class TangramCollectionSystem extends System {
    constructor(getPlayerEntity, getECS) {
        super(['Collectible', 'Transform']);
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
            const collectible = entity.getComponent('Collectible');
            const transform = entity.getComponent('Transform');

            const bounds = {
                x: transform.x,
                y: transform.y,
                width: transform.width,
                height: transform.height
            };

            if (rectanglesOverlap(playerBounds, bounds)) {
                const itemId = this.resolveInventoryId(entity, collectible);
                if (itemId) {
                    inventory.add(itemId);
                }
                ecs.destroyEntity(entity);
            }
        }
    }

    resolveInventoryId(entity, collectible) {
        if (entity.hasComponent('TangramPiece')) {
            return entity.getComponent('TangramPiece').pieceId;
        }
        return collectible.collectibleId;
    }
}
