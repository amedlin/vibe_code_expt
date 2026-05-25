const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Camera class - handles viewport transformation
class Camera {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }

    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

// Physics body class
class Body {
    constructor(x, y, width, height, options = {}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.vx = 0;
        this.vy = 0;
        this.ax = 0;
        this.ay = 0;
        this.mass = options.mass || 1;
        this.type = options.type || 'dynamic'; // 'static', 'dynamic', 'platform'
        this.collisionGroup = options.collisionGroup || 0;
        this.collisionMask = options.collisionMask !== undefined ? options.collisionMask : 0xFFFF;
        this.isGrounded = false;
        this.userData = options.userData || {};
    }

    update(deltaTime) {
        if (this.type === 'dynamic') {
            this.vx += this.ax * deltaTime;
            this.vy += this.ay * deltaTime;
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
        }
    }

    getBounds() {
        return {
            left: this.x,
            right: this.x + this.width,
            top: this.y,
            bottom: this.y + this.height
        };
    }
}

// Physics engine
class Physics {
    constructor(options = {}) {
        this.bodies = [];
        this.gravity = options.gravity || [0, 0.6];
        this.collisions = [];
    }

    addBody(body) {
        this.bodies.push(body);
        return body;
    }

    removeBody(body) {
        const idx = this.bodies.indexOf(body);
        if (idx !== -1) {
            this.bodies.splice(idx, 1);
        }
    }

    update(deltaTime) {
        // Apply gravity to dynamic bodies
        for (let body of this.bodies) {
            if (body.type === 'dynamic') {
                body.ax = 0;
                body.ay = this.gravity[1];
            }
        }

        // Update all bodies
        for (let body of this.bodies) {
            body.update(deltaTime);
        }

        // Reset grounded state
        for (let body of this.bodies) {
            body.isGrounded = false;
        }

        // Check collisions
        this.checkCollisions();
    }

    checkCollisions() {
        this.collisions = [];

        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const a = this.bodies[i];
                const b = this.bodies[j];

                // Check collision groups/masks
                if ((a.collisionMask & (1 << b.collisionGroup)) === 0) continue;
                if ((b.collisionMask & (1 << a.collisionGroup)) === 0) continue;

                if (this.rectanglesOverlap(a, b)) {
                    this.collisions.push({ bodyA: a, bodyB: b });
                    this.resolveCollision(a, b);
                }
            }
        }
    }

    rectanglesOverlap(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }

    resolveCollision(a, b) {
        // Dynamic body landing on static/platform from above
        if (a.type === 'dynamic' && (b.type === 'static' || b.type === 'platform')) {
            if (a.vy >= 0 && a.y + a.height - a.vy <= b.y + 10) {
                a.y = b.y - a.height;
                a.vy = 0;
                a.isGrounded = true;
            }
        }
        // Reverse: static/platform body with dynamic above
        if (b.type === 'dynamic' && (a.type === 'static' || a.type === 'platform')) {
            if (b.vy >= 0 && b.y + b.height - b.vy <= a.y + 10) {
                b.y = a.y - b.height;
                b.vy = 0;
                b.isGrounded = true;
            }
        }
    }
}

// Platform rendering helper
function renderBody(ctx, camera, body, color = '#8b7355') {
    const screen = camera.worldToScreen(body.x, body.y);
    ctx.fillStyle = color;
    ctx.fillRect(screen.x, screen.y, body.width, body.height);
}

// Base GameState class
class GameState {
    constructor(game) {
        this.game = game;
    }

    enter() {
        // Called when state is entered
    }

    exit() {
        // Called when state is exited
    }

    update(deltaTime) {
        // Override in subclasses
    }

    render(ctx, camera) {
        // Override in subclasses
    }
}

// Playing state
class PlayingState extends GameState {
    constructor(game) {
        super(game);
    }

    update(deltaTime) {
        const player = this.game.playerBody;
        const speed = player.userData.speed;
        const jumpPower = player.userData.jumpPower;

        // Horizontal movement
        if (keys['ArrowLeft'] || keys['a']) {
            player.vx = -speed;
        } else if (keys['ArrowRight'] || keys['d']) {
            player.vx = speed;
        } else {
            player.vx = 0;
        }

        // Keep player in bounds horizontally
        if (player.x < 0) player.x = 0;
        if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

        // Jump
        if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && player.isGrounded) {
            player.vy = -jumpPower;
            player.isGrounded = false;
        }

        // Update physics
        this.game.physics.update(deltaTime);

        // Check pause
        if (keys['p']) {
            keys['p'] = false;
            this.game.setState(new PausedState(this.game));
        }

        // Check game over condition (fall off bottom)
        if (player.y > canvas.height + 100) {
            this.game.setState(new GameOverState(this.game));
        }
    }

    render(ctx, camera) {
        const player = this.game.playerBody;

        // Clear canvas
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render platforms
        for (let platform of this.game.platformBodies) {
            renderBody(ctx, camera, platform, '#8b7355');
        }

        // Render player
        const playerScreen = camera.worldToScreen(player.x, player.y);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(playerScreen.x, playerScreen.y, player.width, player.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(playerScreen.x, playerScreen.y, player.width, player.height);

        // Draw debug info
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(`Pos: ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`, 10, 20);
        ctx.fillText(`Velocity: ${player.vx.toFixed(1)}, ${player.vy.toFixed(1)}`, 10, 35);
        ctx.fillText(`Grounded: ${player.isGrounded}`, 10, 50);
        ctx.fillText('Press P to pause', 10, 65);
    }
}

// Paused state
class PausedState extends GameState {
    constructor(game) {
        super(game);
    }

    update(deltaTime) {
        if (keys['p']) {
            keys['p'] = false;
            this.game.setState(new PlayingState(this.game));
        }
    }

    render(ctx, camera) {
        // Render the playing state in the background
        const playingState = new PlayingState(this.game);
        playingState.render(ctx, camera);

        // Draw pause overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 20);

        ctx.font = '16px Arial';
        ctx.fillText('Press P to resume', canvas.width / 2, canvas.height / 2 + 30);
        ctx.textAlign = 'left';
    }
}

// Game Over state
class GameOverState extends GameState {
    constructor(game) {
        super(game);
    }

    update(deltaTime) {
        if (keys['r']) {
            keys['r'] = false;
            this.game.reset();
            this.game.setState(new PlayingState(this.game));
        }
    }

    render(ctx, camera) {
        // Clear canvas
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = '20px Arial';
        ctx.fillText('Press R to restart', canvas.width / 2, canvas.height / 2 + 40);
        ctx.textAlign = 'left';
    }
}

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
                speed: 5,
                jumpPower: 12
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

// Input state
const keys = {};

// Initialize game
game.reset();

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
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

// Start the game
game.setState(new PlayingState(game));
requestAnimationFrame(gameLoop);
