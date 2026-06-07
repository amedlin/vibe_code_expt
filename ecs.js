// Entity - container for components
class Entity {
    constructor(id) {
        this.id = id;
        this.components = new Map();
    }

    addComponent(componentType, component) {
        this.components.set(componentType, component);
        return this;
    }

    getComponent(componentType) {
        return this.components.get(componentType);
    }

    hasComponent(componentType) {
        return this.components.has(componentType);
    }

    hasComponents(...componentTypes) {
        return componentTypes.every(ct => this.components.has(ct));
    }

    removeComponent(componentType) {
        return this.components.delete(componentType);
    }

    removeAllComponents() {
        this.components.clear();
    }
}

// System - logic that operates on entities with specific components.
// Filtered entity list is cached and invalidated only when the ECS entity
// set changes, so we don't re-filter every frame.
class System {
    constructor(requiredComponents = []) {
        this.requiredComponents = requiredComponents;
        this._cachedEntities = null;
    }

    update(deltaTime, entities) {
        // Override in subclasses
    }

    getEntitiesWithComponents(entities) {
        if (this._cachedEntities !== null) {
            return this._cachedEntities;
        }
        if (this.requiredComponents.length === 0) {
            this._cachedEntities = entities.slice();
            return this._cachedEntities;
        }
        this._cachedEntities = entities.filter((entity) =>
            this.requiredComponents.every((comp) => entity.hasComponent(comp))
        );
        return this._cachedEntities;
    }

    invalidateEntityCache() {
        this._cachedEntities = null;
    }
}

// ECS World - manages entities and systems
class ECS {
    constructor() {
        this.entities = [];
        this.updateSystems = [];
        // { layerId, system, bakeToProps }[]
        this._renderSystems = [];
        this.nextEntityId = 0;
        this.entitySetListeners = [];
    }

    onEntitySetChanged(listener) {
        this.entitySetListeners.push(listener);
    }

    _invalidateRenderCaches() {
        for (const entry of this._renderSystems) {
            entry.system.invalidateEntityCache();
        }
    }

    // event.affectsStaticLayer is consulted by external listeners (notably
    // the engine's cached-background invalidator). System entity caches
    // always invalidate regardless — new entities must still be picked up
    // by their respective systems on the next frame.
    _notifyEntitySetChanged(event = { affectsStaticLayer: true }) {
        for (const system of this.updateSystems) {
            system.invalidateEntityCache();
        }
        this._invalidateRenderCaches();
        for (const listener of this.entitySetListeners) {
            listener(event);
        }
    }

    // Pass `{ affectsStaticLayer: false }` for ambient entities (sky
    // elements, particles, etc.) that should not force the cached static
    // background canvas to regenerate when they spawn or despawn.
    createEntity({ affectsStaticLayer = true } = {}) {
        const entity = new Entity(this.nextEntityId++);
        this.entities.push(entity);
        this._notifyEntitySetChanged({ affectsStaticLayer });
        return entity;
    }

    destroyEntity(entity, { affectsStaticLayer = true } = {}) {
        const idx = this.entities.indexOf(entity);
        if (idx !== -1) {
            this.entities.splice(idx, 1);
            this._notifyEntitySetChanged({ affectsStaticLayer });
        }
    }

    getEntity(id) {
        return this.entities.find(e => e.id === id);
    }

    addUpdateSystem(system) {
        this.updateSystems.push(system);
        return this;
    }

    // Register a render system on an explicit layer (see render-layers.js).
    // options.bakeToProps: when true, the system draws into the cached
    // propsCanvas during ensureStaticLayer instead of each frame.
    addRenderSystem(system, layerId, options = {}) {
        if (!isKnownRenderLayer(layerId)) {
            throw new Error(`Unknown render layer id: ${layerId}`);
        }
        system.renderLayer = layerId;
        this._renderSystems.push({
            layerId,
            system,
            bakeToProps: options.bakeToProps === true
        });
        return this;
    }

    _systemsForLayer(layerId) {
        const out = [];
        for (const entry of this._renderSystems) {
            if (entry.layerId === layerId) {
                out.push(entry.system);
            }
        }
        return out;
    }

    renderLayer(layerId, ctx, entities) {
        for (const system of this._systemsForLayer(layerId)) {
            system.update(0, entities, ctx);
        }
    }

    renderBakedLayers(ctx, entities) {
        for (const entry of this._renderSystems) {
            if (entry.bakeToProps) {
                entry.system.update(0, entities, ctx);
            }
        }
    }

    update(deltaTime) {
        for (let system of this.updateSystems) {
            system.update(deltaTime, this.entities);
        }
    }

    clearEntities() {
        this.entities = [];
        this.playerEntity = null;
        this.nextEntityId = 0;
        this._notifyEntitySetChanged({ affectsStaticLayer: true });
    }

    clear() {
        this.clearEntities();
        this.updateSystems = [];
        this._renderSystems = [];
    }

    getStats() {
        return {
            entityCount: this.entities.length,
            updateSystemCount: this.updateSystems.length,
            renderSystemCount: this._renderSystems.length
        };
    }
}
