class GameEngine {
    constructor(canvas, canvasWidth, canvasHeight) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Core ECS
        this.ecs = new ECS();
        this.systems = [];

        // Management
        this.stateManager = new StateManager();
        this.levelManager = new LevelManager(this);
        this.camera = new Camera(0, 0, canvasWidth, canvasHeight);

        // Initialize systems in execution order
        this.initializeSystems();
    }

    initializeSystems() {
        // Order matters! Input → Movement → Boundary → Physics → Animation → Render
        this.systems.push(new InputSystem());
        this.systems.push(new MovementSystem());
        this.systems.push(new BoundarySystem(this.canvasWidth, this.canvasHeight));
        this.systems.push(new PhysicsSystem([0, 2000]));
        this.systems.push(new AnimationSystem());
        this.systems.push(new AnimatorUpdateSystem());
        this.systems.push(new GameOverSystem(this.canvasHeight, () => this.onGameOver()));
    }

    update(deltaTime) {
        // Run all systems in order
        for (let system of this.systems) {
            system.update(deltaTime, this.ecs.entities);
        }
    }

    render() {
        // Clear canvas
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

        // Render via systems
        const renderSystem = new RenderSystem(this.camera);
        renderSystem.update(0, this.ecs.entities, this.ctx);

        const animatedRenderSystem = new AnimatedRenderSystem(this.camera);
        animatedRenderSystem.update(0, this.ecs.entities, this.ctx);

        // Debug overlay
        this.renderDebugInfo();
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

    async loadLevel(levelFile) {
        const levelData = await this.levelManager.loadLevel(levelFile);
        this.stateManager.setState('playing');
        return levelData;
    }

    reset() {
        this.ecs.clear();
        this.stateManager.setState('playing');
    }

    onGameOver() {
        this.stateManager.setState('gameOver');
    }
}
