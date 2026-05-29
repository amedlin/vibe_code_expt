// Sprite frame - represents a single animation frame
class SpriteFrame {
    constructor(duration = 100, render = null) {
        this.duration = duration; // milliseconds
        this.render = render; // function(ctx, x, y, width, height) to render this frame
    }
}

// Animation - sequence of sprite frames
class Animation {
    constructor(name = 'animation', frames = [], looping = true) {
        this.name = name;
        this.frames = frames;
        this.looping = looping;
        this.duration = frames.reduce((sum, f) => sum + f.duration, 0);
    }

    getFrameAtTime(time) {
        if (this.frames.length === 0) return null;

        const actualTime = this.looping ? time % this.duration : time;
        let elapsed = 0;

        for (let frame of this.frames) {
            if (actualTime < elapsed + frame.duration) {
                return frame;
            }
            elapsed += frame.duration;
        }

        return this.frames[this.frames.length - 1];
    }

    isFinished(time) {
        return !this.looping && time >= this.duration;
    }
}

// Animator - plays animations
class Animator {
    constructor(defaultAnimation = null) {
        this.currentAnimation = defaultAnimation;
        this.time = 0;
        this.playing = true;
    }

    update(deltaTime) {
        if (this.playing && this.currentAnimation) {
            this.time += deltaTime * 1000; // convert to milliseconds
        }
    }

    play(animation) {
        this.currentAnimation = animation;
        this.time = 0;
        this.playing = true;
    }

    stop() {
        this.playing = false;
    }

    resume() {
        this.playing = true;
    }

    getCurrentFrame() {
        if (!this.currentAnimation) return null;
        return this.currentAnimation.getFrameAtTime(this.time);
    }

    isAnimationFinished() {
        if (!this.currentAnimation) return true;
        return this.currentAnimation.isFinished(this.time);
    }

    render(ctx, x, y, width, height) {
        const frame = this.getCurrentFrame();
        if (frame && frame.render) {
            frame.render(ctx, x, y, width, height);
        }
    }
}

// Helper function to create simple colored frame renderer
function createColoredFrame(colors = ['#ff6b6b']) {
    return (ctx, x, y, width, height) => {
        ctx.fillStyle = colors[0];
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
    };
}

// Helper function to create a striped frame renderer (variation effect)
function createStripedFrame(colors = ['#ff6b6b', '#ff8888']) {
    return (ctx, x, y, width, height) => {
        const stripeWidth = width / 2;
        ctx.fillStyle = colors[0];
        ctx.fillRect(x, y, stripeWidth, height);
        ctx.fillStyle = colors[1];
        ctx.fillRect(x + stripeWidth, y, stripeWidth, height);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
    };
}
