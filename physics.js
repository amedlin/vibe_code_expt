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
        this.gravity = options.gravity || [0, 2000];
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

// Render helper
function renderBody(ctx, camera, body, color = '#8b7355') {
    const screen = camera.worldToScreen(body.x, body.y);
    ctx.fillStyle = color;
    ctx.fillRect(screen.x, screen.y, body.width, body.height);
}
