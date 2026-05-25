const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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

    setState(newState) {
        if (this.currentState) {
            this.currentState.exit();
        }
        this.currentState = newState;
        this.currentState.enter();
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

        // Create platform bodies
        const groundBody = this.physics.addBody(new Body(0, canvas.height - 50, canvas.width, 50, {
            type: 'platform',
            collisionGroup: 1,
            collisionMask: 0xFFFF,
            userData: { name: 'ground' }
        }));
        this.platformBodies.push(groundBody);
    }
};

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Initialize game
game.reset();

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

// Start the game
game.setState(new PlayingState(game));
requestAnimationFrame(gameLoop);
