// Player animation definitions
const PLAYER_ANIMATIONS = {
    idle: new Animation('idle', [
        new SpriteFrame(200, createColoredFrame(['#ff6b6b']))
    ], true),

    runningLeft: new Animation('runningLeft', [
        new SpriteFrame(100, createColoredFrame(['#ff6b6b'])),
        new SpriteFrame(100, createColoredFrame(['#ff5252']))
    ], true),

    runningRight: new Animation('runningRight', [
        new SpriteFrame(100, createColoredFrame(['#ff6b6b'])),
        new SpriteFrame(100, createColoredFrame(['#ff5252']))
    ], true),

    jumping: new Animation('jumping', [
        new SpriteFrame(200, createColoredFrame(['#ffa500']))
    ], true),

    falling: new Animation('falling', [
        new SpriteFrame(200, createColoredFrame(['#ff8c00']))
    ], true)
};

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

// Level Select state - waits for user to select a level file
class LevelSelectState extends GameState {
    constructor(game) {
        super(game);
    }

    update(deltaTime) {
        // No updates needed, just waiting for file input
    }

    render(ctx, camera) {
        // Clear canvas to blue
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw message
        ctx.fillStyle = '#000';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Select a level file to begin', canvas.width / 2, canvas.height / 2 - 40);

        ctx.font = '16px Arial';
        ctx.fillText('Use the file input above', canvas.width / 2, canvas.height / 2 + 20);
        ctx.textAlign = 'left';
    }
}

// Playing state
class PlayingState extends GameState {
    constructor(game) {
        super(game);
    }

    update(deltaTime) {
        const player = this.game.playerBody;
        const playerEntity = this.game.playerEntity;
        const animatedRender = playerEntity.getComponent('AnimatedRender');
        const animator = animatedRender.animator;
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

        // Sync entity transform with physics body
        const transform = playerEntity.getComponent('Transform');
        transform.x = player.x;
        transform.y = player.y;

        // Select animation based on movement state
        let newAnimation = PLAYER_ANIMATIONS.idle;
        if (!player.isGrounded) {
            newAnimation = player.vy < 0 ? PLAYER_ANIMATIONS.jumping : PLAYER_ANIMATIONS.falling;
        } else if (player.vx !== 0) {
            newAnimation = player.vx < 0 ? PLAYER_ANIMATIONS.runningLeft : PLAYER_ANIMATIONS.runningRight;
        }

        // Play animation if different
        if (animator.currentAnimation !== newAnimation) {
            animator.play(newAnimation);
        }

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

        // Render all entities via RenderSystem
        this.game.renderSystem.update(this.game.deltaTime, this.game.ecs.entities, ctx);

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
