class MovementComponent {
    constructor(speed = 300, jumpPower = 700, groundAccelTime = 0.07) {
        this.speed = speed;
        this.jumpPower = jumpPower;
        this.climbSpeed = 220;
        this.groundAccelTime = groundAccelTime;
        this.airSpeedMultiplier = 2;
        this.airAccelFactor = 0.12;
    }

    get groundAcceleration() {
        return this.speed / this.groundAccelTime;
    }

    get airAcceleration() {
        return this.groundAcceleration * this.airAccelFactor;
    }

    get airMaxSpeed() {
        return this.speed * this.airSpeedMultiplier;
    }
}
