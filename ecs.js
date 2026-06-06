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
        this.renderSystems = [];
        this.staticRenderSystems = [];
        this.nextEntityId = 0;
        this.entitySetListeners = [];
    }

    onEntitySetChanged(listener) {
        this.entitySetListeners.push(listener);
    }

    _notifyEntitySetChanged() {
        for (const system of this.updateSystems) {
            system.invalidateEntityCache();
        }
        for (const system of this.renderSystems) {
            system.invalidateEntityCache();
        }
        for (const system of this.staticRenderSystems) {
            system.invalidateEntityCache();
        }
        for (const listener of this.entitySetListeners) {
            listener();
        }
    }

    createEntity() {
        const entity = new Entity(this.nextEntityId++);
        this.entities.push(entity);
        this._notifyEntitySetChanged();
        return entity;
    }

    destroyEntity(entity) {
        const idx = this.entities.indexOf(entity);
        if (idx !== -1) {
            this.entities.splice(idx, 1);
            this._notifyEntitySetChanged();
        }
    }

    getEntity(id) {
        return this.entities.find(e => e.id === id);
    }

    addUpdateSystem(system) {
        this.updateSystems.push(system);
        return this;
    }

    addRenderSystem(system) {
        this.renderSystems.push(system);
        return this;
    }

    // Render systems whose output never changes during gameplay (sky,
    // platforms, back decorations). The engine renders these once into an
    // offscreen canvas at level load and just blits the result each frame.
    addStaticRenderSystem(system) {
        this.staticRenderSystems.push(system);
        return this;
    }

    update(deltaTime) {
        for (let system of this.updateSystems) {
            system.update(deltaTime, this.entities);
        }
    }

    render(ctx) {
        for (let system of this.renderSystems) {
            system.update(0, this.entities, ctx);
        }
    }

    renderStatic(ctx) {
        for (let system of this.staticRenderSystems) {
            system.update(0, this.entities, ctx);
        }
    }

    clearEntities() {
        this.entities = [];
        this.playerEntity = null;
        this.nextEntityId = 0;
        this._notifyEntitySetChanged();
    }

    clear() {
        this.clearEntities();
        this.updateSystems = [];
        this.renderSystems = [];
        this.staticRenderSystems = [];
    }

    getStats() {
        return {
            entityCount: this.entities.length,
            updateSystemCount: this.updateSystems.length,
            renderSystemCount: this.renderSystems.length + this.staticRenderSystems.length
        };
    }
}
