const canvas = document.getElementById('gameCanvas');
const levelFileInput = document.getElementById('levelFile');
const levelStatus = document.getElementById('levelStatus');

canvas.width = 800;
canvas.height = 600;

// Global input state (captured by keyboard listeners)
const keys = {};

// Engine instance
let engine = null;
let stateManager = null;

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;

    // Prevent spacebar from scrolling the page
    if (e.key === ' ') {
        e.preventDefault();
    }

    // Pause/Resume
    if (e.key === 'p' && stateManager && stateManager.currentState === 'playing') {
        stateManager.setState('paused');
    } else if (e.key === 'p' && stateManager && stateManager.currentState === 'paused') {
        stateManager.setState('playing');
    }

    // Restart on game over
    if (e.key === 'r' && stateManager && stateManager.currentState === 'gameOver') {
        engine.reset();
        levelFileInput.focus();
        levelFileInput.click();
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// File input handler for loading levels
function loadLevelFromFile(file) {
    engine.loadLevel(file).then((levelData) => {
        levelStatus.textContent = levelData.name;
        console.log(`Loaded level: ${levelData.name}`);
    }).catch((error) => {
        console.error('Error loading level:', error);
        console.error('Error details:', error.message, error.stack);
        levelStatus.textContent = 'Error: ' + error.message;
    });
}

levelFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        loadLevelFromFile(file);
    }
});

// Render state-dependent UI
function renderStateUI() {
    const ctx = engine.ctx;
    const width = canvas.width;
    const height = canvas.height;

    switch (stateManager.currentState) {
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
            // Render the game underneath (already rendered), then overlay
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

// Main game loop
let lastFrameTime = 0;

function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastFrameTime) / 1000;
    lastFrameTime = currentTime;

    switch (stateManager.currentState) {
        case 'levelSelect':
            renderStateUI();
            break;

        case 'playing':
            engine.update(deltaTime);
            engine.render();
            break;

        case 'paused':
            engine.render();
            renderStateUI();
            break;

        case 'gameOver':
            renderStateUI();
            break;
    }

    requestAnimationFrame(gameLoop);
}

// Initialize and start the game
function startGame() {
    engine = new GameEngine(canvas, 800, 600);
    stateManager = engine.stateManager;
    stateManager.setState('levelSelect');
    requestAnimationFrame(gameLoop);
}

startGame();
