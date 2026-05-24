const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// Game state
const game = {
    running: true,
    deltaTime: 0,
    lastFrameTime: 0
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

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

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

    // Detect ground collision (platform at bottom)
    if (player.y + player.height >= canvas.height - 50) {
        player.y = canvas.height - 50 - player.height;
        player.velocityY = 0;
        player.isGrounded = true;
    } else {
        player.isGrounded = false;
    }

    // Jump
    if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && player.isGrounded) {
        player.velocityY = -player.jumpPower;
        player.isGrounded = false;
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw ground platform
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    // Draw player
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw player outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(player.x, player.y, player.width, player.height);

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
