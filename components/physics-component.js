class PhysicsComponent {
    constructor(options = {}) {
        this.vx = options.vx || 0;
        this.vy = options.vy || 0;
        this.ax = options.ax || 0;
        this.ay = options.ay || 0;
        this.mass = options.mass !== undefined ? options.mass : 1;
        this.type = options.type || 'dynamic'; // 'dynamic', 'static', 'platform'
        this.collisionGroup = options.collisionGroup !== undefined ? options.collisionGroup : 0;
        this.collisionMask = options.collisionMask !== undefined ? options.collisionMask : 0xFFFF;
        this.isGrounded = options.isGrounded || false;
        this.isClimbing = options.isClimbing || false;
        this.activeLadderId = options.activeLadderId ?? null;
        this.climbDirection = options.climbDirection ?? null;
    }
}
