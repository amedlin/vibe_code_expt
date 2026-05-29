class LevelManager {
    constructor(engine) {
        this.engine = engine;
    }

    async loadLevel(levelFile) {
        console.log('Starting level load:', levelFile.name);
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = (event) => {
                try {
                    console.log('File read successfully');
                    const text = event.target.result;
                    console.log('Parsing level from text, length:', text.length);
                    const levelData = Level.parse(text);
                    console.log('Level parsed:', levelData);
                    this.spawnLevel(levelData);
                    console.log('Level spawned successfully');
                    resolve(levelData);
                } catch (error) {
                    console.error('Error during level load:', error);
                    reject(error);
                }
            };
            reader.onerror = () => {
                console.error('FileReader error');
                reject(new Error('Failed to read file'));
            };
            reader.readAsText(levelFile);
        });
    }

    spawnLevel(levelData) {
        console.log('Spawning level:', levelData);
        this.engine.ecs.clearEntities();
        console.log('ECS entities cleared');

        // Create platform entities from levelData.platforms
        if (levelData.platforms && levelData.platforms.length > 0) {
            console.log('Creating platforms, count:', levelData.platforms.length);
            for (let platformDef of levelData.platforms) {
                console.log('Creating platform:', platformDef);
                this.createPlatform(platformDef);
            }
            console.log('All platforms created');
        } else {
            console.log('No platforms in level data');
        }

        if (levelData.tangramPieces && levelData.tangramPieces.length > 0) {
            for (let pieceDef of levelData.tangramPieces) {
                this.createTangramPiece(pieceDef);
            }
        }

        if (levelData.decorations && levelData.decorations.length > 0) {
            for (let decorDef of levelData.decorations) {
                this.createDecoration(decorDef, levelData.platforms);
            }
        }

        const spawn = findSafePlayerSpawn(levelData, this.engine.canvasWidth);
        this.createPlayer(spawn.x, spawn.y);
    }

    createDecoration(decorDef, platforms) {
        const sprite = getDecorationSprite(decorDef.type);
        if (!sprite) {
            console.warn('Unknown decoration type:', decorDef.type);
            return;
        }

        const surfaceY = findDecorationSurfaceY(
            platforms,
            decorDef.x,
            sprite.width,
            decorDef.yHint
        );
        if (surfaceY === null) {
            console.warn('No platform surface for decoration at x:', decorDef.x);
            return;
        }

        const depthLayer = Math.random() < 0.5 ? 'back' : 'front';
        const placement = computeDecorationTransform(sprite, surfaceY, decorDef.x, depthLayer);
        const entity = this.engine.ecs.createEntity();
        entity.addComponent('Transform', new TransformComponent(
            placement.x,
            placement.y,
            placement.width,
            placement.height
        ));
        entity.addComponent('Decoration', new DecorationComponent(
            decorDef.type,
            depthLayer,
            placement.scale,
            placement.depthOffset
        ));
    }

    createTangramPiece(pieceDef) {
        const def = getTangramPiece(pieceDef.pieceId);
        if (!def) {
            console.warn('Unknown tangram piece:', pieceDef.pieceId);
            return;
        }

        const entity = this.engine.ecs.createEntity();
        entity.addComponent('Transform', new TransformComponent(
            pieceDef.x,
            pieceDef.y,
            def.width,
            def.height
        ));
        entity.addComponent('TangramPiece', new TangramPieceComponent(pieceDef.pieceId));
    }

    createPlayer(x = DEFAULT_PLAYER_SPAWN_X, y = DEFAULT_PLAYER_SPAWN_Y) {
        try {
            console.log('Creating player entity...');
            const entity = this.engine.ecs.createEntity();
            console.log('Entity created:', entity.id);

            entity.addComponent('Transform', new TransformComponent(
                x,
                y,
                PLAYER_SPAWN_WIDTH,
                PLAYER_SPAWN_HEIGHT
            ));
            console.log('Transform component added');

            entity.addComponent('Physics', new PhysicsComponent({
                vx: 0,
                vy: 0,
                ax: 0,
                ay: 0,
                mass: 1,
                type: 'dynamic',
                collisionGroup: 0,
                collisionMask: 0xFFFF,
                isGrounded: false
            }));
            console.log('Physics component added');

            entity.addComponent('Input', new InputComponent());
            console.log('Input component added');

            entity.addComponent('Movement', new MovementComponent(300, 700));
            console.log('Movement component added');

            entity.addComponent('VelocityTracker', new VelocityTrackerComponent());
            console.log('VelocityTracker component added');

            entity.addComponent('Inventory', new InventoryComponent());
            console.log('Inventory component added');

            // Create animator and store in both Animation and AnimatedRender
            console.log('Creating animator, PLAYER_ANIMATIONS =', PLAYER_ANIMATIONS);
            const animator = new Animator(PLAYER_ANIMATIONS.idle);
            console.log('Animator created');

            entity.addComponent('Animation', new AnimationComponent(animator));
            console.log('Animation component added');

            entity.addComponent('AnimatedRender', new AnimatedRenderComponent(animator));
            console.log('AnimatedRender component added');

            this.engine.ecs.playerEntity = entity;
            console.log('Player entity created successfully');
        } catch (error) {
            console.error('Error creating player:', error);
            throw error;
        }
    }

    createPlatform(platformDef) {
        const entity = this.engine.ecs.createEntity();
        entity.addComponent('Transform', new TransformComponent(platformDef.x, platformDef.y, platformDef.width, platformDef.height));
        entity.addComponent('Physics', new PhysicsComponent({
            vx: 0,
            vy: 0,
            ax: 0,
            ay: 0,
            mass: 0,
            type: 'platform',
            collisionGroup: 1,
            collisionMask: 0xFFFF,
            isGrounded: false
        }));
        entity.addComponent('Render', new RenderComponent((ctx, x, y, w, h) => {
            ctx.fillStyle = '#8b7355';
            ctx.fillRect(x, y, w, h);
        }));
    }
}
