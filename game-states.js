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
