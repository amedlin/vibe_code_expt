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
        this.engine.ecs.clear();
        console.log('ECS cleared');

        // Create player entity
        this.createPlayer();
        console.log('Player created');

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
    }

    createPlayer() {
        try {
            console.log('Creating player entity...');
            const entity = this.engine.ecs.createEntity();
            console.log('Entity created:', entity.id);

            entity.addComponent('Transform', new TransformComponent(100, 300, 30, 40));
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
