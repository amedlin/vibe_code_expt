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

// Platform class
class Platform {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    update(deltaTime) {
        // Override in subclasses for moving platforms
    }

    render(ctx, camera) {
        const screen = camera.worldToScreen(this.x, this.y);
        ctx.fillStyle = '#8b7355';
        ctx.fillRect(screen.x, screen.y, this.width, this.height);
    }
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
        this.platforms = game.platforms;
        this.player = game.player;
    }

    update(deltaTime) {
        // Horizontal movement
        if (keys['ArrowLeft'] || keys['a']) {
            this.player.velocityX = -this.player.speed;
        } else if (keys['ArrowRight'] || keys['d']) {
            this.player.velocityX = this.player.speed;
        } else {
            this.player.velocityX = 0;
        }

        this.player.x += this.player.velocityX;

        // Keep player in bounds horizontally
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.x + this.player.width > canvas.width) this.player.x = canvas.width - this.player.width;

        // Simple gravity
        const gravity = 0.6;
        this.player.velocityY += gravity;
        this.player.y += this.player.velocityY;

        // Platform collision
        this.player.isGrounded = false;
        for (let platform of this.platforms) {
            platform.update(deltaTime);
            if (checkPlatformCollision(this.player, platform)) {
                this.player.y = platform.y - this.player.height;
                this.player.velocityY = 0;
                this.player.isGrounded = true;
                break;
            }
        }

        // Jump
        if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && this.player.isGrounded) {
            this.player.velocityY = -this.player.jumpPower;
            this.player.isGrounded = false;
        }

        // Check pause
        if (keys['p']) {
            keys['p'] = false; // Consume key
            this.game.setState(new PausedState(this.game));
        }

        // Check game over condition (fall off bottom)
        if (this.player.y > canvas.height + 100) {
            this.game.setState(new GameOverState(this.game));
        }
    }

    render(ctx, camera) {
        // Clear canvas
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Render platforms
        for (let platform of this.platforms) {
            platform.render(ctx, camera);
        }

        // Render player
        const playerScreen = camera.worldToScreen(this.player.x, this.player.y);
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(playerScreen.x, playerScreen.y, this.player.width, this.player.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(playerScreen.x, playerScreen.y, this.player.width, this.player.height);

        // Draw debug info
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.fillText(`Pos: ${this.player.x.toFixed(0)}, ${this.player.y.toFixed(0)}`, 10, 20);
        ctx.fillText(`Velocity: ${this.player.velocityX.toFixed(1)}, ${this.player.velocityY.toFixed(1)}`, 10, 35);
        ctx.fillText(`Grounded: ${this.player.isGrounded}`, 10, 50);
        ctx.fillText('Press P to pause', 10, 65);
    }
}

// Paused state
class PausedState extends GameState {
    constructor(game) {
        super(game);
        this.previousState = null;
    }

    enter() {
        this.previousState = new PlayingState(this.game);
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
    player: null,
    platforms: [],

    setState(newState) {
        if (this.currentState) {
            this.currentState.exit();
        }
        this.currentState = newState;
        this.currentState.enter();
    },

    reset() {
        this.player = {
            x: 100,
            y: 300,
            width: 30,
            height: 40,
            velocityY: 0,
            velocityX: 0,
            speed: 5,
            jumpPower: 12,
            isGrounded: false
        };
    }
};

// Input state
const keys = {};

// Initialize game platforms
game.platforms = [
    new Platform(0, canvas.height - 50, canvas.width, 50) // Ground
];

// Initialize player
game.reset();

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Collision detection utilities
function checkPlatformCollision(player, platform) {
    // Only collide if falling from above
    return player.velocityY >= 0 &&
           player.y + player.height <= platform.y + 10 &&
           player.x < platform.x + platform.width &&
           player.x + player.width > platform.x;
}

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
