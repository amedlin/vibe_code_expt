// Marks an entity as a particle source (the player). Emission policy and
// landing-edge detection live in ParticleEmitterSystem; this component
// only holds per-emitter timing and the previous-frame grounded snapshot.
class ParticleEmitterComponent {
    constructor() {
        this.enabled      = true;
        this.dustCooldown = 0;
        this.wasGrounded  = false;
        this.lastVy       = 0;
    }
}
