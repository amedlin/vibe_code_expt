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

// System - logic that operates on entities with specific components
class System {
    constructor(requiredComponents = []) {
        this.requiredComponents = requiredComponents;
    }

    update(deltaTime, entities) {
        // Override in subclasses
    }

    getEntitiesWithComponents(entities) {
        if (this.requiredComponents.length === 0) {
            return entities;
        }
        return entities.filter(entity =>
            this.requiredComponents.every(comp => entity.hasComponent(comp))
        );
    }
}

// ECS World - manages entities and systems
class ECS {
    constructor() {
        this.entities = [];
        this.updateSystems = [];
        this.renderSystems = [];
        this.nextEntityId = 0;
    }

    createEntity() {
        const entity = new Entity(this.nextEntityId++);
        this.entities.push(entity);
        return entity;
    }

    destroyEntity(entity) {
        const idx = this.entities.indexOf(entity);
        if (idx !== -1) {
            this.entities.splice(idx, 1);
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

    clearEntities() {
        this.entities = [];
        this.playerEntity = null;
        this.nextEntityId = 0;
    }

    clear() {
        this.clearEntities();
        this.updateSystems = [];
        this.renderSystems = [];
    }

    getStats() {
        return {
            entityCount: this.entities.length,
            updateSystemCount: this.updateSystems.length,
            renderSystemCount: this.renderSystems.length
        };
    }
}
