// Level class for managing level data and platform definitions
class Level {
    constructor(name, platforms = []) {
        this.name = name;
        this.platforms = platforms;
    }

    static async loadFromFile(filename) {
        try {
            const response = await fetch(filename);
            const text = await response.text();
            return Level.parse(text);
        } catch (error) {
            console.error(`Failed to load level from ${filename}:`, error);
            return new Level('Default', []);
        }
    }

    static parse(text) {
        const lines = text.split('\n');
        const platforms = [];
        let levelName = 'Unnamed Level';

        for (let line of lines) {
            line = line.trim();

            // Skip empty lines and comments
            if (!line || line.startsWith('#')) {
                if (line.startsWith('# Level')) {
                    levelName = line.substring(1).trim();
                }
                continue;
            }

            // Parse platform definition: x, y, width, height
            const parts = line.split(',').map(p => parseFloat(p.trim()));
            if (parts.length === 4 && parts.every(p => !isNaN(p))) {
                platforms.push({
                    x: parts[0],
                    y: parts[1],
                    width: parts[2],
                    height: parts[3]
                });
            }
        }

        return new Level(levelName, platforms);
    }

    createBodies(physics) {
        const bodies = [];
        for (let platformDef of this.platforms) {
            const body = physics.addBody(new Body(
                platformDef.x,
                platformDef.y,
                platformDef.width,
                platformDef.height,
                {
                    type: 'platform',
                    collisionGroup: 1,
                    collisionMask: 0xFFFF,
                    userData: { name: 'platform' }
                }
            ));
            bodies.push(body);
        }
        return bodies;
    }
}
