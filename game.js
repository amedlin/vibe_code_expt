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

// Game state
const game = {
    running: true,
    deltaTime: 0,
    lastFrameTime: 0,
    camera: new Camera(0, 0, canvas.width, canvas.height)
};

// Input state
const keys = {};

// Player object
const player = {
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

// Level platforms
const platforms = [
    new Platform(0, canvas.height - 50, canvas.width, 50) // Ground
];

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function checkPlatformCollision(player, platform) {
    // Only collide if falling from above
    return player.velocityY >= 0 &&
           player.y + player.height <= platform.y + 10 &&
           player.x < platform.x + platform.width &&
           player.x + player.width > platform.x;
}

// Update game state
function update(deltaTime) {
    // Horizontal movement
    if (keys['ArrowLeft'] || keys['a']) {
        player.velocityX = -player.speed;
    } else if (keys['ArrowRight'] || keys['d']) {
        player.velocityX = player.speed;
    } else {
        player.velocityX = 0;
    }

    player.x += player.velocityX;

    // Keep player in bounds horizontally
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;

    // Simple gravity
    const gravity = 0.6;
    player.velocityY += gravity;
    player.y += player.velocityY;

    // Platform collision
    player.isGrounded = false;
    for (let platform of platforms) {
        platform.update(deltaTime);
        if (checkPlatformCollision(player, platform)) {
            player.y = platform.y - player.height;
            player.velocityY = 0;
            player.isGrounded = true;
            break;
        }
    }

    // Jump
    if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && player.isGrounded) {
        player.velocityY = -player.jumpPower;
        player.isGrounded = false;
    }
}

// Render game
function render() {
    const camera = game.camera;

    // Clear canvas
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Render platforms
    for (let platform of platforms) {
        platform.render(ctx, camera);
    }

    // Render player
    const playerScreen = camera.worldToScreen(player.x, player.y);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(playerScreen.x, playerScreen.y, player.width, player.height);

    // Draw player outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(playerScreen.x, playerScreen.y, player.width, player.height);

    // Draw debug info
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(`Pos: ${player.x.toFixed(0)}, ${player.y.toFixed(0)}`, 10, 20);
    ctx.fillText(`Velocity: ${player.velocityX.toFixed(1)}, ${player.velocityY.toFixed(1)}`, 10, 35);
    ctx.fillText(`Grounded: ${player.isGrounded}`, 10, 50);
}

// Main game loop
function gameLoop(currentTime) {
    game.deltaTime = (currentTime - game.lastFrameTime) / 1000;
    game.lastFrameTime = currentTime;

    if (game.running) {
        update(game.deltaTime);
        render();
    }

    requestAnimationFrame(gameLoop);
}

// Start the game
requestAnimationFrame(gameLoop);
