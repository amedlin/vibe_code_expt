class MovementComponent {
    constructor(speed = 300, jumpPower = 700, groundAccelTime = 0.07) {
        this.speed = speed;
        this.jumpPower = jumpPower;
        // Time to reach top speed from rest (short = responsive feel)
        this.groundAccelTime = groundAccelTime;
    }

    get groundAcceleration() {
        return this.speed / this.groundAccelTime;
    }
}
