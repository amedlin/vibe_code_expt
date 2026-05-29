// Per-state behavior: what the engine runs each frame
const GAME_STATES = {
    levelSelect: {
        updatesWorld: false,
        rendersWorld: false,
        overlay: 'levelSelect',
        showDebugHud: false
    },
    playing: {
        updatesWorld: true,
        rendersWorld: true,
        overlay: null,
        showDebugHud: true
    },
    paused: {
        updatesWorld: false,
        rendersWorld: true,
        overlay: 'paused',
        showDebugHud: false
    },
    gameOver: {
        updatesWorld: false,
        rendersWorld: false,
        overlay: 'gameOver',
        showDebugHud: false
    }
};

const GAME_STATE_OVERLAYS = {
    levelSelect(ctx, width, height) {
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Select a level file to begin', width / 2, height / 2 - 40);
        ctx.font = '16px Arial';
        ctx.fillText('Use the file input above', width / 2, height / 2 + 20);
        ctx.textAlign = 'left';
    },

    paused(ctx, width, height) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', width / 2, height / 2 - 20);
        ctx.font = '16px Arial';
        ctx.fillText('Press P to resume', width / 2, height / 2 + 30);
        ctx.textAlign = 'left';
    },

    gameOver(ctx, width, height) {
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', width / 2, height / 2 - 40);
        ctx.font = '20px Arial';
        ctx.fillText('Press R to restart', width / 2, height / 2 + 40);
        ctx.textAlign = 'left';
    }
};
