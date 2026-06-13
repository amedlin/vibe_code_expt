class PhysicsSystem extends System {
    constructor(gravity = [0, 1000]) {
        super(['Physics', 'Transform']);
        this.gravity = gravity;
        this._dynamicBodies = null;
        this._staticBodies = null;
    }

    invalidateEntityCache() {
        super.invalidateEntityCache();
        this._dynamicBodies = null;
        this._staticBodies = null;
    }

    _ensureBodies(entities) {
        if (this._dynamicBodies !== null && this._staticBodies !== null) {
            return;
        }
        this._dynamicBodies = [];
        this._staticBodies = [];
        const physicsEntities = this.getEntitiesWithComponents(entities);
        for (const entity of physicsEntities) {
            const physics = entity.getComponent('Physics');
            const transform = entity.getComponent('Transform');
            const body = { entity, physics, transform };
            if (physics.type === 'dynamic') {
                this._dynamicBodies.push(body);
            } else {
                this._staticBodies.push(body);
            }
        }
    }

    update(deltaTime, entities) {
        this._ensureBodies(entities);

        // Integrate dynamic bodies only.
        for (const body of this._dynamicBodies) {
            const physics = body.physics;
            const transform = body.transform;

            if (physics.isClimbing) {
                physics.isGrounded = false;
                continue;
            }

            physics.ax = 0;
            physics.ay = this.gravity[1];
            physics.vx += physics.ax * deltaTime;
            physics.vy += physics.ay * deltaTime;
            transform.x += physics.vx * deltaTime;
            transform.y += physics.vy * deltaTime;
            physics.isGrounded = false;
        }

        this.checkCollisions(deltaTime);
    }

    checkCollisions(deltaTime) {
        // Only check dynamic against static + other dynamic. Static-vs-static
        // pairs can never produce a real collision and just burn CPU.
        for (let i = 0; i < this._dynamicBodies.length; i++) {
            const a = this._dynamicBodies[i];
            for (const b of this._staticBodies) {
                if (!this._masksMatch(a, b)) continue;
                if (rectanglesOverlap(a.transform, b.transform)) {
                    this.resolveCollision(a, b, deltaTime);
                }
            }
            for (let j = i + 1; j < this._dynamicBodies.length; j++) {
                const b = this._dynamicBodies[j];
                if (!this._masksMatch(a, b)) continue;
                if (rectanglesOverlap(a.transform, b.transform)) {
                    this.resolveCollision(a, b, deltaTime);
                }
            }
        }
    }

    _masksMatch(a, b) {
        return (a.physics.collisionMask & (1 << b.physics.collisionGroup)) !== 0 &&
               (b.physics.collisionMask & (1 << a.physics.collisionGroup)) !== 0;
    }

    resolveCollision(a, b, deltaTime) {
        if (a.physics.isClimbing || b.physics.isClimbing) {
            return;
        }

        if (a.physics.type === 'dynamic' && (b.physics.type === 'static' || b.physics.type === 'platform')) {
            const prevBottom = a.transform.y + a.transform.height - a.physics.vy * deltaTime;
            if (a.physics.vy >= 0 && prevBottom <= b.transform.y + 10) {
                a.transform.y = b.transform.y - a.transform.height;
                a.physics.vy = 0;
                a.physics.isGrounded = true;
            }
        }
        if (b.physics.type === 'dynamic' && (a.physics.type === 'static' || a.physics.type === 'platform')) {
            const prevBottom = b.transform.y + b.transform.height - b.physics.vy * deltaTime;
            if (b.physics.vy >= 0 && prevBottom <= a.transform.y + 10) {
                b.transform.y = a.transform.y - b.transform.height;
                b.physics.vy = 0;
                b.physics.isGrounded = true;
            }
        }
    }
}
