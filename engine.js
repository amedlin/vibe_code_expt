class GameEngine {
    static fromDOM(options = {}) {
        const canvas = document.getElementById(options.canvasId ?? 'gameCanvas');
        const levelFileInput = document.getElementById(options.levelFileInputId ?? 'levelFile');
        const levelStatus = document.getElementById(options.levelStatusId ?? 'levelStatus');

        const width = options.width ?? 800;
        const height = options.height ?? 600;
        canvas.width = width;
        canvas.height = height;

        return new GameEngine(canvas, {
            ...options,
            width,
            height,
            levelFileInput,
            levelStatus
        });
    }

    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvasWidth = options.width ?? 800;
        this.canvasHeight = options.height ?? 600;
        this.levelFileInput = options.levelFileInput ?? null;
        this.levelStatus = options.levelStatus ?? null;
        this.defaultLevelStatusText = options.defaultLevelStatusText ?? 'Select levels.txt to start';

        this.inputBuffer = new InputBuffer();
        this.lastFrameTime = 0;
        this._loopBound = (time) => this.tick(time);

        this.ecs = new ECS();
        this.stateManager = new StateManager();
        this.levelManager = new LevelManager(this);
        this.camera = new Camera(0, 0, this.canvasWidth, this.canvasHeight);

        this.registerSystems();
    }

    registerSystems() {
        this.ecs.addUpdateSystem(new InputSystem(this.inputBuffer));
        this.ecs.addUpdateSystem(new MovementSystem());
        this.ecs.addUpdateSystem(new BoundarySystem(this.canvasWidth, this.canvasHeight));
        this.ecs.addUpdateSystem(new PhysicsSystem([0, 2000]));
        this.ecs.addUpdateSystem(new AnimationSystem());
        this.ecs.addUpdateSystem(new AnimatorUpdateSystem());
        this.ecs.addUpdateSystem(new GameOverSystem(this.canvasHeight, () => this.enterGameOver()));

        this.ecs.addRenderSystem(new RenderSystem(this.camera));
        this.ecs.addRenderSystem(new AnimatedRenderSystem(this.camera));
    }

    // --- State transitions (single entry points) ---

    enterLevelSelect() {
        this.ecs.clearEntities();
        this.inputBuffer.keys = {};
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

        if (this.levelFileInput) {
            this.levelFileInput.addEventListener('change', (e) => this.onLevelFileSelected(e));
        }
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
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

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

    async loadLevel(levelFile) {
        const levelData = await this.levelManager.loadLevel(levelFile);
        this.onLevelLoaded(levelData);
        return levelData;
    }

    onLevelLoaded(levelData) {
        this.setLevelStatus(levelData.name);
        console.log(`Loaded level: ${levelData.name}`);
        this.enterPlaying();
    }

    setLevelStatus(text) {
        if (this.levelStatus) {
            this.levelStatus.textContent = text;
        }
    }
}
