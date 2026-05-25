const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const levelFileInput = document.getElementById('levelFile');
const levelStatus = document.getElementById('levelStatus');

canvas.width = 800;
canvas.height = 600;

// Input state
const keys = {};

// Game object
const game = {
    running: true,
    deltaTime: 0,
    lastFrameTime: 0,
    camera: new Camera(0, 0, canvas.width, canvas.height),
    currentState: null,
    physics: new Physics(),
    playerBody: null,
    platformBodies: [],
    currentLevel: null,

    setState(newState) {
        if (this.currentState) {
            this.currentState.exit();
        }
        this.currentState = newState;
        this.currentState.enter();
    },

    async loadLevel(levelFile) {
        this.currentLevel = await Level.loadFromFile(levelFile);
    },

    reset() {
        this.physics.bodies = [];
        this.platformBodies = [];

        // Create player body
        this.playerBody = this.physics.addBody(new Body(100, 300, 30, 40, {
            type: 'dynamic',
            mass: 1,
            collisionGroup: 0,
            collisionMask: 0xFFFF,
            userData: {
                speed: 300,
                jumpPower: 700
            }
        }));

        // Create platform bodies from current level
        if (this.currentLevel && this.currentLevel.platforms.length > 0) {
            this.platformBodies = this.currentLevel.createBodies(this.physics);
        } else {
            // Fallback: create a default ground platform
            console.warn('No level loaded or level has no platforms, creating default ground');
            const groundBody = this.physics.addBody(new Body(0, canvas.height - 50, canvas.width, 50, {
                type: 'platform',
                collisionGroup: 1,
                collisionMask: 0xFFFF,
                userData: { name: 'ground' }
            }));
            this.platformBodies.push(groundBody);
        }
    }
};

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// File input handler for loading custom levels
levelFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = event.target.result;
            game.currentLevel = Level.parse(text);
            levelStatus.textContent = game.currentLevel.name;
            game.reset();
            console.log(`Loaded custom level: ${game.currentLevel.name}`);
        } catch (error) {
            console.error('Error parsing level file:', error);
            levelStatus.textContent = 'Error loading level';
        }
    };
    reader.onerror = () => {
        console.error('Error reading file');
        levelStatus.textContent = 'Error reading file';
    };
    reader.readAsText(file);
});

// Main game loop
function gameLoop(currentTime) {
    game.deltaTime = (currentTime - game.lastFrameTime) / 1000;
    game.lastFrameTime = currentTime;

    if (game.running && game.currentState) {
        game.currentState.update(game.deltaTime);
        game.currentState.render(ctx, game.camera);
    }

    requestAnimationFrame(gameLoop);
}

// Initialize and start the game
async function startGame() {
    await game.loadLevel('levels.txt');
    game.reset();
    game.setState(new PlayingState(game));
    requestAnimationFrame(gameLoop);
}

startGame();
