class PhysicsSystem extends System {
    constructor(gravity = [0, 1000]) {
        super(['Physics', 'Transform']);
        this.gravity = gravity;
        this.bodies = [];
    }

    update(deltaTime, entities) {
        // Build list of physics bodies with their entities
        this.bodies = [];
        const physicsEntities = this.getEntitiesWithComponents(entities);
        for (let entity of physicsEntities) {
            const physics = entity.getComponent('Physics');
            const transform = entity.getComponent('Transform');
            this.bodies.push({ entity, physics, transform });
        }

        // Apply gravity to dynamic bodies
        for (let body of this.bodies) {
            if (body.physics.type === 'dynamic') {
                body.physics.ax = 0;
                body.physics.ay = this.gravity[1];
            }
        }

        // Update velocities and positions
        for (let body of this.bodies) {
            const physics = body.physics;
            const transform = body.transform;

            if (physics.type === 'dynamic') {
                physics.vx += physics.ax * deltaTime;
                physics.vy += physics.ay * deltaTime;
                transform.x += physics.vx * deltaTime;
                transform.y += physics.vy * deltaTime;
            }
        }

        // Reset grounded state
        for (let body of this.bodies) {
            body.physics.isGrounded = false;
        }

        // Check collisions
        this.checkCollisions();
    }

    checkCollisions() {
        for (let i = 0; i < this.bodies.length; i++) {
            for (let j = i + 1; j < this.bodies.length; j++) {
                const a = this.bodies[i];
                const b = this.bodies[j];

                // Check collision groups/masks
                if ((a.physics.collisionMask & (1 << b.physics.collisionGroup)) === 0) continue;
                if ((b.physics.collisionMask & (1 << a.physics.collisionGroup)) === 0) continue;

                if (rectanglesOverlap(a.transform, b.transform)) {
                    this.resolveCollision(a, b);
                }
            }
        }
    }

    resolveCollision(a, b) {
        // Dynamic body landing on static/platform from above
        if (a.physics.type === 'dynamic' && (b.physics.type === 'static' || b.physics.type === 'platform')) {
            if (a.physics.vy >= 0 && a.transform.y + a.transform.height - a.physics.vy <= b.transform.y + 10) {
                a.transform.y = b.transform.y - a.transform.height;
                a.physics.vy = 0;
                a.physics.isGrounded = true;
            }
        }
        // Reverse: static/platform body with dynamic above
        if (b.physics.type === 'dynamic' && (a.physics.type === 'static' || a.physics.type === 'platform')) {
            if (b.physics.vy >= 0 && b.transform.y + b.transform.height - b.physics.vy <= a.transform.y + 10) {
                b.transform.y = a.transform.y - b.transform.height;
                b.physics.vy = 0;
                b.physics.isGrounded = true;
            }
        }
    }
}
