const canvas = document.getElementById('gameCanvas');
const levelFileInput = document.getElementById('levelFile');
const levelStatus = document.getElementById('levelStatus');

canvas.width = 800;
canvas.height = 600;

const engine = new GameEngine(canvas, {
    width: 800,
    height: 600,
    levelFileInput,
    levelStatus
});

levelFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        engine.loadLevelFromFile(file);
    }
});

engine.start();
