class LevelManager {
    constructor(engine) {
        this.engine = engine;
        this._loadGeneration = 0;
    }

    async loadLevel(levelFile) {
        const generation = ++this._loadGeneration;
        console.log('Starting level load:', levelFile.name);
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
            reader.onload = (event) => {
                if (generation !== this._loadGeneration) {
                    return;
                }
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
                if (generation !== this._loadGeneration) {
                    return;
                }
                console.error('FileReader error');
                reject(new Error('Failed to read file'));
            };
            reader.readAsText(levelFile);
        });
    }

    spawnLevel(levelData) {
        console.log('Spawning level:', levelData);
        if (this.engine.skySpawnSystem) {
            this.engine.skySpawnSystem.resetPreWarm();
        }
        if (this.engine.particlePool) {
            this.engine.particlePool.clear();
        }
        this.engine.ecs.clearEntities();
        console.log('ECS entities cleared');

        // Resolve the level's theme up-front so it's available to all
        // subsequent spawn steps (decorations need theme sprite dimensions
        // for placement). Fall back to default if the level requested a
        // theme that isn't registered.
        const theme = this.resolveTheme(levelData.themeId);
        this.engine.currentTheme = theme;
        // Background seed: explicit '# Seed:' header wins; otherwise derive
        // a deterministic seed from the level name so the same level looks
        // identical every load.
        this.engine.backgroundSeed = this.resolveSeed(levelData, theme);
        this.createLevelEntity(theme);

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

        const validatedLadders = validateLadders(
            levelData.ladders ?? [],
            levelData.platforms ?? []
        );
        for (const ladderDef of validatedLadders) {
            this.createLadder(ladderDef);
        }

        if (levelData.collectibles && levelData.collectibles.length > 0) {
            for (let def of levelData.collectibles) {
                this.createCollectible(def);
            }
        }

        if (levelData.decorations && levelData.decorations.length > 0) {
            for (let decorDef of levelData.decorations) {
                this.createDecoration(decorDef, levelData.platforms, theme);
            }
        }

        const spawn = findSafePlayerSpawn(levelData, this.engine.canvasWidth);
        this.createPlayer(spawn.x, spawn.y);

        // Derive nav graph limits from the actual player entity so the AI
        // routes match what the agent can really do.
        const playerEntity = this.engine.ecs.playerEntity;
        const movement = playerEntity.getComponent('Movement');
        const playerTransform = playerEntity.getComponent('Transform');
        const navLimits = computeNavLimits(
            movement.jumpPower,
            this.engine.gravity,
            movement.speed,
            playerTransform.width
        );
        this.engine.navigationGraph.rebuild(
            this.engine.ecs.entities,
            navLimits,
            this.engine.canvasWidth
        );
        resetAIStateOnEntities(this.engine.ecs.entities);
    }

    resolveTheme(themeId) {
        const requested = Themes.get(themeId);
        if (requested) {
            return requested;
        }
        const fallback = Themes.getDefault();
        if (themeId && !requested) {
            console.warn(
                `Theme '${themeId}' is not registered; falling back to default '${fallback ? fallback.id : 'none'}'.`
            );
        }
        return fallback;
    }

    resolveSeed(levelData, theme) {
        if (levelData.seed != null && Number.isFinite(levelData.seed)) {
            return levelData.seed >>> 0;
        }
        const basis = levelData.name || (theme && theme.id) || 'default';
        return hashStringToSeed(basis);
    }

    createLevelEntity(theme) {
        const entity = this.engine.ecs.createEntity();
        entity.addComponent('LevelTheme', new LevelThemeComponent(theme));
        this.engine.levelEntity = entity;
    }

    createDecoration(decorDef, platforms, theme) {
        if (!theme || typeof theme.getPropSprite !== 'function') {
            console.warn('No active theme; cannot place decoration:', decorDef);
            return;
        }
        const sprite = theme.getPropSprite(decorDef.type);
        if (!sprite) {
            console.warn(
                `Theme '${theme.id}' has no sprite for prop role '${decorDef.type}'.`
            );
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

    createCollectible(def) {
        if (def.kind === PILL_ID) {
            this.createPill(def);
            return;
        }
        console.warn('Unknown collectible kind:', def.kind);
    }

    createPill(def) {
        const entity = this.engine.ecs.createEntity({ affectsStaticLayer: false });
        entity.addComponent('Transform', new TransformComponent(
            def.x,
            def.y,
            PILL_WIDTH,
            PILL_HEIGHT
        ));
        entity.addComponent('Collectible', new CollectibleComponent(PILL_ID));
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

            entity.addComponent('PlayerControlled', new PlayerControlledComponent());
            entity.addComponent('AIAgent', new AIAgentComponent());
            entity.addComponent('AIPlan', new AIPlanComponent());
            entity.addComponent('AINavigation', new AINavigationComponent());
            entity.addComponent('AIProgress', new AIProgressComponent());
            console.log('Control components added');

            entity.addComponent('Movement', new MovementComponent(300, 700));
            console.log('Movement component added');

            entity.addComponent('VelocityTracker', new VelocityTrackerComponent());
            console.log('VelocityTracker component added');

            entity.addComponent('ParticleEmitter', new ParticleEmitterComponent());
            console.log('ParticleEmitter component added');

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
        entity.addComponent('Walkable', new WalkableComponent());
        // PlatformRenderSystem will draw this via the active theme.
        entity.addComponent('Platform', new PlatformComponent());
    }

    createLadder(ladderDef) {
        const extendedTopY = ladderDef.extendedTopY ?? computeLadderExtendedTopY(ladderDef.topY);
        const height = ladderDef.bottomY - extendedTopY;
        const entity = this.engine.ecs.createEntity();
        entity.addComponent('Transform', new TransformComponent(
            ladderDef.x,
            extendedTopY,
            ladderDef.width,
            height
        ));
        entity.addComponent('Ladder', new LadderComponent({
            topY: ladderDef.topY,
            bottomY: ladderDef.bottomY,
            extendedTopY,
            topPlatformIndex: ladderDef.topPlatformIndex,
            bottomPlatformIndex: ladderDef.bottomPlatformIndex,
            centerX: ladderDef.centerX
        }));
    }
}
