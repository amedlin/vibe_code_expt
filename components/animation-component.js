class AnimationComponent {
    constructor(animator = null) {
        this.animator = animator;
        this.desiredAnimation = null;
        this.currentAnimation = null;
        this.facing = 1;
    }
}
