class GameEngine {
    // Cap dt so a backgrounded tab cannot apply seconds of physics in one frame
    static MAX_DELTA_TIME = 0.1;

    static fromDOM(options = {}) {
        const canvas = document.getElementById(options.canvasId ?? 'gameCanvas');
        const levelFileInput = document.getElementById(options.levelFileInputId ?? 'levelFile');
        const restartLevelButton = document.getElementById(options.restartLevelButtonId ?? 'restartLevel');
        const levelStatus = document.getElementById(options.levelStatusId ?? 'levelStatus');
        const levelHeading = document.getElementById(options.levelHeadingId ?? 'levelHeading');
        const inventoryCanvas = document.getElementById(options.inventoryCanvasId ?? 'inventoryCanvas');
        const controlSourceSelect = document.getElementById(options.controlSourceSelectId ?? 'controlSource');

        const width = options.width ?? 800;
        const height = options.height ?? 600;
        const inventoryWidth = options.inventoryWidth ?? 120;
        canvas.width = width;
        canvas.height = height;
        inventoryCanvas.width = inventoryWidth;
        inventoryCanvas.height = height;

        return new GameEngine(canvas, {
            ...options,
            width,
            height,
            inventoryWidth,
            inventoryCanvas,
            levelFileInput,
            restartLevelButton,
            levelStatus,
            levelHeading,
            controlSourceSelect
        });
    }

    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.inventoryCanvas = options.inventoryCanvas ?? null;
        this.inventoryCtx = this.inventoryCanvas ? this.inventoryCanvas.getContext('2d') : null;
        this.inventoryWidth = options.inventoryWidth ?? 120;
        this.canvasWidth = options.width ?? 800;
        this.canvasHeight = options.height ?? 600;
        this.levelFileInput = options.levelFileInput ?? null;
        this.restartLevelButton = options.restartLevelButton ?? null;
        this.levelStatus = options.levelStatus ?? null;
        this.levelHeading = options.levelHeading ?? null;
        this.controlSourceSelect = options.controlSourceSelect ?? null;
        this.defaultLevelStatusText = options.defaultLevelStatusText ?? 'Select a level file to start';
        this.lastLevelFile = null;
        this.currentLevelName = null;

        this.inputBuffer = new InputBuffer();
        this.inputSourceManager = new InputSourceManager(this.inputBuffer);
        this.navigationGraph = new NavigationGraph();
        this.gravity = 2000;
        this.lastFrameTime = 0;
        this._loopBound = (time) => this.tick(time);

        this.ecs = new ECS();
        this.stateManager = new StateManager();
        this.levelManager = new LevelManager(this);
        this.camera = new Camera(0, 0, this.canvasWidth, this.canvasHeight);

        this.registerSystems();
    }

    registerSystems() {
        this.ecs.addUpdateSystem(new AISystem(
            () => this.inputSourceManager.getSourceId(),
            () => this.navigationGraph,
            () => this.stateManager.getState(),
            () => this.gravity
        ));
        this.ecs.addUpdateSystem(new InputSystem(
            this.inputBuffer,
            () => this.inputSourceManager.getSourceId()
        ));
        this.ecs.addUpdateSystem(new MovementSystem());
        this.ecs.addUpdateSystem(new BoundarySystem(this.canvasWidth, this.canvasHeight));
        this.ecs.addUpdateSystem(new PhysicsSystem([0, this.gravity]));
        this.ecs.addUpdateSystem(new AnimationSystem());
        this.ecs.addUpdateSystem(new AnimatorUpdateSystem());
        this.ecs.addUpdateSystem(new TangramCollectionSystem(
            () => this.ecs.playerEntity,
            () => this.ecs
        ));
        this.ecs.addUpdateSystem(new GameOverSystem(this.canvasHeight, () => this.enterGameOver()));

        this.ecs.addRenderSystem(new RenderSystem(this.camera));
        this.ecs.addRenderSystem(new DecorationRenderSystem(this.camera, 'back'));
        this.ecs.addRenderSystem(new AnimatedRenderSystem(this.camera));
        this.ecs.addRenderSystem(new TangramRenderSystem(this.camera));
        this.ecs.addRenderSystem(new DecorationRenderSystem(this.camera, 'front'));

        this.inventoryRenderSystem = new InventoryRenderSystem(
            () => this.ecs.playerEntity,
            this.inventoryWidth,
            this.canvasHeight
        );
    }

    // --- State transitions (single entry points) ---

    enterLevelSelect() {
        this.ecs.clearEntities();
        this.inputBuffer.keys = {};
        this.lastLevelFile = null;
        this.currentLevelName = null;
        this.updateRestartButton();
        this.setLevelHeading(null);
        this.clearInventoryPanel();
        if (this.levelStatus) {
            this.levelStatus.textContent = this.defaultLevelStatusText;
        }
        this.stateManager.setState('levelSelect');
    }

    enterPlaying() {
        this.stateManager.setState('playing');
    }

    pause() {
        if (this.stateManager.is('playing')) {
            this.stateManager.setState('paused');
        }
    }

    resume() {
        if (this.stateManager.is('paused')) {
            this.stateManager.setState('playing');
        }
    }

    enterGameOver() {
        if (!this.stateManager.is('playing')) {
            return;
        }
        this.stateManager.setState('gameOver');
    }

    restart() {
        this.enterLevelSelect();
        if (this.levelFileInput) {
            this.levelFileInput.value = '';
            this.levelFileInput.focus();
            this.levelFileInput.click();
        }
    }

    // --- Lifecycle ---

    start() {
        this.attachListeners();
        this.enterLevelSelect();
        requestAnimationFrame(this._loopBound);
    }

    attachListeners() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('blur', () => this.onAppHidden());
        window.addEventListener('focus', () => this.resetFrameClock());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppHidden();
            } else {
                this.resetFrameClock();
            }
        });

        if (this.levelFileInput) {
            this.levelFileInput.addEventListener('change', (e) => this.onLevelFileSelected(e));
        }

        if (this.restartLevelButton) {
            this.restartLevelButton.addEventListener('click', () => this.restartCurrentLevel());
        }

        if (this.controlSourceSelect) {
            this.controlSourceSelect.addEventListener('change', (e) => {
                this.inputSourceManager.setSource(e.target.value);
                resetAIStateOnEntities(this.ecs.entities);
            });
        }
    }

    updateRestartButton() {
        if (this.restartLevelButton) {
            this.restartLevelButton.disabled = !this.lastLevelFile;
        }
    }

    onAppHidden() {
        this.inputBuffer.keys = {};
        this.resetFrameClock();
    }

    resetFrameClock() {
        this.lastFrameTime = 0;
    }

    onLevelFileSelected(event) {
        const file = event.target.files[0];
        if (file) {
            this.loadLevelFromFile(file);
        }
    }

    onKeyDown(e) {
        this.inputBuffer.setDown(e.key, true);

        if (e.key === ' ') {
            e.preventDefault();
        }

        if (e.key === 'p') {
            if (this.stateManager.is('playing')) {
                this.pause();
            } else if (this.stateManager.is('paused')) {
                this.resume();
            }
        }

        if (e.key === 'r' && this.stateManager.is('gameOver')) {
            this.restart();
        }
    }

    onKeyUp(e) {
        this.inputBuffer.setDown(e.key, false);
    }

    tick(currentTime) {
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTime;
            requestAnimationFrame(this._loopBound);
            return;
        }

        const rawDelta = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;
        const deltaTime = Math.min(rawDelta, GameEngine.MAX_DELTA_TIME);

        const config = this.stateManager.getConfig();

        if (config.updatesWorld) {
            this.ecs.update(deltaTime);
        }

        if (config.rendersWorld) {
            this.renderWorld(config.showDebugHud);
        }

        if (config.overlay) {
            GAME_STATE_OVERLAYS[config.overlay](this.ctx, this.canvasWidth, this.canvasHeight);
        }

        requestAnimationFrame(this._loopBound);
    }

    renderWorld(showDebugHud) {
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ecs.render(this.ctx);

        if (showDebugHud) {
            this.renderDebugInfo();
        }

        this.renderInventory();
    }

    renderInventory() {
        if (!this.inventoryCtx || !this.inventoryRenderSystem) {
            return;
        }
        this.inventoryRenderSystem.update(0, this.ecs.entities, this.inventoryCtx);
    }

    clearInventoryPanel() {
        if (this.inventoryCtx && this.inventoryRenderSystem) {
            this.inventoryRenderSystem.clear(this.inventoryCtx);
        }
    }

    renderDebugInfo() {
        if (!this.ecs.playerEntity) return;

        const physics = this.ecs.playerEntity.getComponent('Physics');
        const transform = this.ecs.playerEntity.getComponent('Transform');

        this.ctx.fillStyle = '#000';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`Pos: ${transform.x.toFixed(0)}, ${transform.y.toFixed(0)}`, 10, 20);
        this.ctx.fillText(`Velocity: ${physics.vx.toFixed(1)}, ${physics.vy.toFixed(1)}`, 10, 35);
        this.ctx.fillText(`Grounded: ${physics.isGrounded}`, 10, 50);
        this.ctx.fillText('Press P to pause', 10, 65);
    }

    loadLevelFromFile(file) {
        return this.loadLevel(file)
            .catch((error) => {
                console.error('Error loading level:', error);
                this.setLevelStatus('Error: ' + error.message);
                throw error;
            });
    }

    restartCurrentLevel() {
        if (!this.lastLevelFile) {
            return Promise.resolve();
        }
        this.inputBuffer.keys = {};
        return this.loadLevelFromFile(this.lastLevelFile);
    }

    async loadLevel(levelFile) {
        const levelData = await this.levelManager.loadLevel(levelFile);
        this.lastLevelFile = levelFile;
        this.updateRestartButton();
        // Clear so picking the same file again still fires `change`
        if (this.levelFileInput) {
            this.levelFileInput.value = '';
        }
        this.onLevelLoaded(levelData);
        return levelData;
    }

    onLevelLoaded(levelData) {
        this.currentLevelName = levelData.name;
        this.setLevelHeading(levelData.name);
        this.setLevelStatus('');
        resetAIStateOnEntities(this.ecs.entities);
        console.log(`Loaded level: ${levelData.name}`);
        this.enterPlaying();
    }

    setLevelStatus(text) {
        if (this.levelStatus) {
            this.levelStatus.textContent = text;
        }
    }

    setLevelHeading(name) {
        if (!this.levelHeading) return;

        if (name) {
            this.levelHeading.textContent = name;
            this.levelHeading.classList.remove('is-hidden');
            this.levelHeading.removeAttribute('aria-hidden');
        } else {
            this.levelHeading.textContent = '';
            this.levelHeading.classList.add('is-hidden');
            this.levelHeading.setAttribute('aria-hidden', 'true');
        }
    }
}
