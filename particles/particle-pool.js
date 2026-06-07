// Fixed-capacity particle pool. Slots are reused via a ring cursor;
// no ECS entities are created per fleck so dust trails do not thrash
// entity-set listeners or static-layer caches.
const PARTICLE_POOL_DEFAULT_CAP = 128;

function createParticleSlot() {
    return {
        active:   false,
        x:        0,
        y:        0,
        vx:       0,
        vy:       0,
        life:     0,
        maxLife:  0,
        size:     0,
        sizeEnd:  0,
        alpha:    0,
        alphaEnd: 0,
        color:    '#888888',
        kind:     null
    };
}

class ParticlePool {
    constructor(capacity = PARTICLE_POOL_DEFAULT_CAP) {
        this.slots = [];
        for (let i = 0; i < capacity; i++) {
            this.slots.push(createParticleSlot());
        }
        this._cursor = 0;
    }

    alloc() {
        const n = this.slots.length;
        for (let i = 0; i < n; i++) {
            const idx = (this._cursor + i) % n;
            if (!this.slots[idx].active) {
                this._cursor = (idx + 1) % n;
                const slot = this.slots[idx];
                slot.active = true;
                return slot;
            }
        }
        // Pool full — steal the oldest slot at the cursor.
        const slot = this.slots[this._cursor];
        this._cursor = (this._cursor + 1) % n;
        slot.active = true;
        return slot;
    }

    clear() {
        for (const slot of this.slots) {
            slot.active = false;
        }
        this._cursor = 0;
    }

    forEachActive(fn) {
        for (const slot of this.slots) {
            if (slot.active) {
                fn(slot);
            }
        }
    }
}
