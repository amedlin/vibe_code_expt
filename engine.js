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
        this._frameScheduled = false;
        this._inventoryDirty = true;
        this._staticLayerDirty = true;
        this._lastInventoryCount = -1;

        // Cached back layer is split into two offscreen canvases so that
        // animated sky elements can paint between them and still read as
        // distant background:
        //   backgroundCanvas — procedural sky / dunes / hills (theme bg)
        //   propsCanvas      — platforms + back decorations (transparent)
        // Both are rebuilt whenever the entity set changes in a way that
        // affects the static layer. Safe while the camera is stationary;
        // a future scrolling camera would need viewport-sized rolling
        // canvases or per-camera-move invalidation.
        this.backgroundCanvas = document.createElement('canvas');
        this.backgroundCtx    = this.backgroundCanvas.getContext('2d');
        this.propsCanvas      = document.createElement('canvas');
        this.propsCtx         = this.propsCanvas.getContext('2d');

        // The active theme is resolved by LevelManager at level spawn time
        // and stored here so render systems can read it via the getter that
        // gets injected at construction. Null until a level is loaded.
        this.currentTheme = null;
        this.levelEntity = null;
        // Seed driving the theme's procedural background. Populated by
        // LevelManager; ensureStaticLayer wraps it in a SeededRng so the
        // generator produces identical output every reload.
        this.backgroundSeed = 0;

        this.ecs = new ECS();
        this.stateManager = new StateManager();
        this.levelManager = new LevelManager(this);
        this.camera = new Camera(0, 0, this.canvasWidth, this.canvasHeight);

        // Most entity-set changes invalidate the cached static layer and
        // the inventory snapshot. Ambient entities (sky elements, etc.)
        // opt out via `{ affectsStaticLayer: false }` on create/destroy
        // so their frequent churn does not force the procedural background
        // to regenerate.
        this.ecs.onEntitySetChanged((event) => {
            if (event && event.affectsStaticLayer === false) {
                return;
            }
            this._staticLayerDirty = true;
            this._inventoryDirty = true;
        });

        this.registerSystems();
    }

    registerSystems() {
        this.ecs.addUpdateSystem(new AISystem(
            () => this.inputSourceManager.getSourceId(),
            () => this.navigationGraph,
            () => this.stateManager.getState()
        ));
        this.ecs.addUpdateSystem(new InputSystem(
            this.inputBuffer,
            () => this.inputSourceManager.getSourceId()
        ));
        this.ecs.addUpdateSystem(new MovementSystem());
        this.ecs.addUpdateSystem(new BoundarySystem(this.canvasWidth, this.canvasHeight));
        this.ecs.addUpdateSystem(new PhysicsSystem([0, this.gravity]));

        const themeProvider = () => this.currentTheme;

        this.particlePool = new ParticlePool(PARTICLE_POOL_DEFAULT_CAP);
        this.ecs.addUpdateSystem(new ParticleEmitterSystem(
            () => this.ecs.playerEntity,
            themeProvider,
            this.particlePool
        ));
        this.ecs.addUpdateSystem(new ParticleUpdateSystem(this.particlePool));

        this.ecs.addUpdateSystem(new AnimationSystem());
        this.ecs.addUpdateSystem(new AnimatorUpdateSystem());
        this.ecs.addUpdateSystem(new CollectibleCollectionSystem(
            () => this.ecs.playerEntity,
            () => this.ecs
        ));
        this.ecs.addUpdateSystem(new GameOverSystem(this.canvasHeight, () => this.enterGameOver()));

        // Sky element spawn + behavior. Sky entities are ambient (no
        // physics / collisions / AI) and their churn does not invalidate
        // the cached static background.
        this.skySpawnSystem = new SkySpawnSystem(
            themeProvider, this.canvasWidth, this.canvasHeight, this
        );
        this.ecs.addUpdateSystem(this.skySpawnSystem);
        this.ecs.addUpdateSystem(new SkyBehaviorSystem(
            this.canvasWidth, this.canvasHeight, this
        ));

        // Back dynamic layer — painted between the procedural background
        // and the props (platforms + back decorations) so sky elements
        // read as distant background instead of foreground.
        this.ecs.addBackDynamicRenderSystem(new SkyRenderSystem());

        // Static props layer — platforms + back decorations. Cached into
        // an offscreen canvas with a transparent base so the back-dynamic
        // sky shows through wherever a prop doesn't cover it.
        this.ecs.addStaticRenderSystem(new PlatformRenderSystem(this.camera, themeProvider));
        this.ecs.addStaticRenderSystem(new DecorationRenderSystem(this.camera, 'back', themeProvider));

        // Front dynamic layer — re-rendered each frame while playing.
        // Player first, then particles in front so translucent dust/smoke
        // blends over the character rather than being hidden behind it.
        this.ecs.addRenderSystem(new AnimatedRenderSystem(this.camera));
        this.ecs.addRenderSystem(new ParticleRenderSystem(this.camera, this.particlePool));
        this.ecs.addRenderSystem(new PillRenderSystem(this.camera));
        this.ecs.addRenderSystem(new DecorationRenderSystem(this.camera, 'front', themeProvider));

        this.inventoryRenderSystem = new InventoryRenderSystem(
            () => this.ecs.playerEntity,
            this.inventoryWidth,
            this.canvasHeight
        );
    }

    // --- State transitions (single entry points) ---
    //
    // Each transition wakes the loop via requestFrame() so the new state is
    // drawn at least once. Continuous frames are only scheduled while in
    // states with `updatesWorld: true` — idle states sleep until input or
    // another state change wakes them.

    enterLevelSelect() {
        this.ecs.clearEntities();
        this.inputBuffer.keys = {};
        this.lastLevelFile = null;
        this.currentLevelName = null;
        this.currentTheme = null;
        this.levelEntity = null;
        this.backgroundSeed = 0;
        this.updateRestartButton();
        this.setLevelHeading(null);
        this.clearInventoryPanel();
        if (this.levelStatus) {
            this.levelStatus.textContent = this.defaultLevelStatusText;
        }
        this.stateManager.setState('levelSelect');
        this.requestFrame();
    }

    enterPlaying() {
        this.stateManager.setState('playing');
        // Drop any stale dt accumulated while the loop was sleeping in an
        // idle state, so the first physics frame uses a clean delta.
        this.resetFrameClock();
        this.requestFrame();
    }

    pause() {
        if (this.stateManager.is('playing')) {
            this.stateManager.setState('paused');
            this.requestFrame();
        }
    }

    resume() {
        if (this.stateManager.is('paused')) {
            this.stateManager.setState('playing');
            this.resetFrameClock();
            this.requestFrame();
        }
    }

    enterGameOver() {
        if (!this.stateManager.is('playing')) {
            return;
        }
        this.stateManager.setState('gameOver');
        this.requestFrame();
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
    }

    requestFrame() {
        if (this._frameScheduled) return;
        this._frameScheduled = true;
        requestAnimationFrame(this._loopBound);
    }

    attachListeners() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('blur', () => this.onAppHidden());
        window.addEventListener('focus', () => this.onAppVisible());
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.onAppHidden();
            } else {
                this.onAppVisible();
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
                // Drop focus so keyboard shortcuts (e.g. 'p' for pause)
                // don't trigger the dropdown's native typeahead and
                // accidentally switch the selection.
                e.target.blur();
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

    onAppVisible() {
        this.resetFrameClock();
        // When the tab regains focus and we're mid-play, restart the loop.
        const config = this.stateManager.getConfig();
        if (config.updatesWorld) {
            this.requestFrame();
        }
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
        this._frameScheduled = false;

        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTime;
            this.requestFrame();
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

        // Only keep spinning while the world is actively updating. Idle
        // states (paused, levelSelect, gameOver) render once on entry and
        // then sleep until something explicitly calls requestFrame().
        if (config.updatesWorld) {
            this.requestFrame();
        }
    }

    renderWorld(showDebugHud) {
        this.ensureStaticLayer();

        // Paint order: procedural background -> animated sky (clouds,
        // birds, ...) -> platforms + back decorations -> player + pills
        // + front decorations. The cached props canvas has a transparent
        // base, so the sky shows through wherever there is no platform or
        // back prop.
        this.ctx.drawImage(this.backgroundCanvas, 0, 0);
        this.ecs.renderBackDynamic(this.ctx);
        this.ctx.drawImage(this.propsCanvas, 0, 0);
        this.ecs.render(this.ctx);

        if (showDebugHud) {
            this.renderDebugInfo();
        }

        this.renderInventory();
    }

    ensureStaticLayer() {
        if (!this._staticLayerDirty) {
            return;
        }
        for (const canvas of [this.backgroundCanvas, this.propsCanvas]) {
            if (canvas.width !== this.canvasWidth ||
                canvas.height !== this.canvasHeight) {
                canvas.width  = this.canvasWidth;
                canvas.height = this.canvasHeight;
            }
        }
        // 1. Backmost: theme-provided procedural background. The seeded RNG
        //    is built fresh every regeneration so the output is purely a
        //    function of (theme, seed) and stays identical across reloads
        //    and restarts. Falls back to a plain sky fill if no theme is
        //    active yet (e.g. before the first level loads).
        const bgctx = this.backgroundCtx;
        const theme = this.currentTheme;
        if (theme && typeof theme.generateBackground === 'function') {
            const rng = new SeededRng(this.backgroundSeed >>> 0);
            theme.generateBackground(bgctx, this.canvasWidth, this.canvasHeight, rng);
        } else {
            bgctx.fillStyle = '#87ceeb';
            bgctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        }
        // 2. Props layer: platforms + back decorations on a transparent
        //    base so the back-dynamic sky entities (drawn between the two
        //    canvases in renderWorld) remain visible behind them.
        const pctx = this.propsCtx;
        pctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ecs.renderStatic(pctx);
        this._staticLayerDirty = false;
    }

    renderInventory() {
        if (!this.inventoryCtx || !this.inventoryRenderSystem) {
            return;
        }
        const player = this.ecs.playerEntity;
        const inventory = player ? player.getComponent('Inventory') : null;
        const count = inventory ? inventory.count : -1;
        if (!this._inventoryDirty && count === this._lastInventoryCount) {
            return;
        }
        this.inventoryRenderSystem.update(0, this.ecs.entities, this.inventoryCtx);
        this._lastInventoryCount = count;
        this._inventoryDirty = false;
    }

    clearInventoryPanel() {
        if (this.inventoryCtx && this.inventoryRenderSystem) {
            this.inventoryRenderSystem.clear(this.inventoryCtx);
        }
        this._lastInventoryCount = -1;
        this._inventoryDirty = true;
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
