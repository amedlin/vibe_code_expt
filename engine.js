class GameEngine {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvasWidth = options.width ?? 800;
        this.canvasHeight = options.height ?? 600;
        this.levelFileInput = options.levelFileInput ?? null;
        this.levelStatus = options.levelStatus ?? null;

        this.inputBuffer = new InputBuffer();
        this.lastFrameTime = 0;
        this._loopBound = (time) => this.tick(time);

        // Core ECS
        this.ecs = new ECS();

        // Management
        this.stateManager = new StateManager();
        this.levelManager = new LevelManager(this);
        this.camera = new Camera(0, 0, this.canvasWidth, this.canvasHeight);

        this.registerSystems();
    }

    registerSystems() {
        // Update order: Input → Movement → Boundary → Physics → Animation → Game over
        this.ecs.addUpdateSystem(new InputSystem(this.inputBuffer));
        this.ecs.addUpdateSystem(new MovementSystem());
        this.ecs.addUpdateSystem(new BoundarySystem(this.canvasWidth, this.canvasHeight));
        this.ecs.addUpdateSystem(new PhysicsSystem([0, 2000]));
        this.ecs.addUpdateSystem(new AnimationSystem());
        this.ecs.addUpdateSystem(new AnimatorUpdateSystem());
        this.ecs.addUpdateSystem(new GameOverSystem(this.canvasHeight, () => this.onGameOver()));

        this.ecs.addRenderSystem(new RenderSystem(this.camera));
        this.ecs.addRenderSystem(new AnimatedRenderSystem(this.camera));
    }

    start() {
        this.attachKeyboardListeners();
        this.stateManager.setState('levelSelect');
        requestAnimationFrame(this._loopBound);
    }

    attachKeyboardListeners() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(e) {
        this.inputBuffer.setDown(e.key, true);

        if (e.key === ' ') {
            e.preventDefault();
        }

        const state = this.stateManager.currentState;

        if (e.key === 'p' && state === 'playing') {
            this.stateManager.setState('paused');
        } else if (e.key === 'p' && state === 'paused') {
            this.stateManager.setState('playing');
        }

        if (e.key === 'r' && state === 'gameOver') {
            this.restart();
        }
    }

    onKeyUp(e) {
        this.inputBuffer.setDown(e.key, false);
    }

    restart() {
        this.reset();
        if (this.levelFileInput) {
            this.levelFileInput.focus();
            this.levelFileInput.click();
        }
    }

    tick(currentTime) {
        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        switch (this.stateManager.currentState) {
            case 'levelSelect':
                this.renderOverlay();
                break;

            case 'playing':
                this.update(deltaTime);
                this.render();
                break;

            case 'paused':
                this.render();
                this.renderOverlay();
                break;

            case 'gameOver':
                this.renderOverlay();
                break;
        }

        requestAnimationFrame(this._loopBound);
    }

    update(deltaTime) {
        this.ecs.update(deltaTime);
    }

    render() {
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        this.ecs.render(this.ctx);
        this.renderDebugInfo();
    }

    renderOverlay() {
        const ctx = this.ctx;
        const width = this.canvasWidth;
        const height = this.canvasHeight;

        switch (this.stateManager.currentState) {
            case 'levelSelect':
                ctx.fillStyle = '#87ceeb';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Select a level file to begin', width / 2, height / 2 - 40);
                ctx.font = '16px Arial';
                ctx.fillText('Use the file input above', width / 2, height / 2 + 20);
                ctx.textAlign = 'left';
                break;

            case 'paused':
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 32px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('PAUSED', width / 2, height / 2 - 20);
                ctx.font = '16px Arial';
                ctx.fillText('Press P to resume', width / 2, height / 2 + 30);
                ctx.textAlign = 'left';
                break;

            case 'gameOver':
                ctx.fillStyle = '#87ceeb';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#000';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('GAME OVER', width / 2, height / 2 - 40);
                ctx.font = '20px Arial';
                ctx.fillText('Press R to restart', width / 2, height / 2 + 40);
                ctx.textAlign = 'left';
                break;
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
        return this.loadLevel(file).then((levelData) => {
            if (this.levelStatus) {
                this.levelStatus.textContent = levelData.name;
            }
            console.log(`Loaded level: ${levelData.name}`);
            return levelData;
        }).catch((error) => {
            console.error('Error loading level:', error);
            if (this.levelStatus) {
                this.levelStatus.textContent = 'Error: ' + error.message;
            }
            throw error;
        });
    }

    async loadLevel(levelFile) {
        const levelData = await this.levelManager.loadLevel(levelFile);
        this.stateManager.setState('playing');
        return levelData;
    }

    reset() {
        this.ecs.clearEntities();
        this.stateManager.setState('playing');
    }

    onGameOver() {
        this.stateManager.setState('gameOver');
    }
}
