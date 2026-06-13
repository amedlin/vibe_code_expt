class PoseKeyframe {
    constructor(duration, angles = {}) {
        this.duration = duration;
        this.angles = angles;
    }
}

class PoseAnimation {
    constructor(name = 'pose', keyframes = [], looping = true) {
        this.name = name;
        this.keyframes = keyframes;
        this.looping = looping;
        this.duration = keyframes.reduce((sum, frame) => sum + frame.duration, 0);
    }

    getSampleAtTime(time) {
        if (this.keyframes.length === 0) {
            return { pose: { ...DEFAULT_POSE }, t: 0 };
        }

        const actualTime = this.looping ? time % this.duration : Math.min(time, this.duration);
        let elapsed = 0;

        for (let i = 0; i < this.keyframes.length; i++) {
            const frame = this.keyframes[i];
            const nextFrame = this.keyframes[(i + 1) % this.keyframes.length];
            const segmentEnd = elapsed + frame.duration;

            if (actualTime < segmentEnd || (!this.looping && i === this.keyframes.length - 1)) {
                const localT = frame.duration > 0
                    ? (actualTime - elapsed) / frame.duration
                    : 0;
                const pose = this.interpolatePoses(frame.angles, nextFrame.angles, localT);
                return { pose, t: localT };
            }

            elapsed = segmentEnd;
        }

        const last = this.keyframes[this.keyframes.length - 1];
        return { pose: mergePose(null, last.angles), t: 1 };
    }

    getPoseAtTime(time) {
        return this.getSampleAtTime(time).pose;
    }

    interpolatePoses(fromAngles, toAngles, t) {
        const pose = mergePose(null, fromAngles);
        const target = mergePose(null, toAngles);

        for (const name of ALL_BONE_NAMES) {
            pose[name] = lerpAngle(pose[name], target[name], t);
        }

        return pose;
    }

    isFinished(time) {
        return !this.looping && time >= this.duration;
    }
}

function isPoseAnimation(animation) {
    return animation && typeof animation.getPoseAtTime === 'function';
}
