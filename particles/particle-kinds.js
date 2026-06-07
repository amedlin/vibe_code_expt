// Particle kind ids and theme config resolution.
const PARTICLE_KIND_DUST  = 'dust';
const PARTICLE_KIND_SMOKE = 'smoke';

// Landing must exceed this downward speed (px/s, pre-impact) to spawn smoke.
const PARTICLE_LAND_SMOKE_VY_THRESHOLD = 280;

const DEFAULT_PARTICLE_CONFIGS = {
    [PARTICLE_KIND_DUST]: {
        color:         '#8b7355',
        size:          6,
        sizeEnd:       2,
        alpha:         0.5,
        alphaEnd:      0,
        alphaJitter:   0.15,
        life:          0.45,
        emitInterval:  0.04,
        speed:         40
    },
    [PARTICLE_KIND_SMOKE]: {
        color:         '#aaaaaa',
        size:          14,
        sizeEnd:       22,
        alpha:         0.4,
        alphaEnd:      0,
        life:          0.7,
        burstCount:    5,
        riseSpeed:     55
    }
};

function _particleRandomRange(min, max) {
    return min + Math.random() * (max - min);
}

function _clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

function getThemeParticleConfig(theme, kind) {
    const fallback = DEFAULT_PARTICLE_CONFIGS[kind] ?? DEFAULT_PARTICLE_CONFIGS[PARTICLE_KIND_DUST];
    if (!theme || !theme.particles || !theme.particles[kind]) {
        return { ...fallback };
    }
    return { ...fallback, ...theme.particles[kind] };
}

function spawnAlphaFromConfig(config) {
    const base = config.alpha ?? 0.5;
    const jitter = config.alphaJitter ?? 0;
    if (jitter <= 0) {
        return _clamp01(base);
    }
    return _clamp01(base + _particleRandomRange(-jitter, jitter));
}
