// Embedded level data (fallback when file:// protocol is used)
const EMBEDDED_LEVELS = {
    'default': `# Level 1 - Platformer Challenge
# Format: x, y, width, height
# Ground platform
0, 550, 800, 50
# Lower platforms
250, 450, 150, 20
100, 350, 150, 20
500, 350, 150, 20
# Higher platforms
300, 250, 200, 20
150, 150, 100, 20
550, 150, 100, 20`
};

// Level class for managing level data and platform definitions
class Level {
    constructor(name, platforms = []) {
        this.name = name;
        this.platforms = platforms;
    }

    static async loadFromFile(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                console.error(`Failed to load level: HTTP ${response.status}, using embedded level`);
                return Level.parse(EMBEDDED_LEVELS['default']);
            }
            const text = await response.text();
            const level = Level.parse(text);
            console.log(`Loaded level "${level.name}" with ${level.platforms.length} platforms`);
            return level;
        } catch (error) {
            console.warn(`Failed to load level from ${filename}, using embedded level:`, error);
            return Level.parse(EMBEDDED_LEVELS['default']);
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
                console.log(`Parsed platform: x=${parts[0]}, y=${parts[1]}, w=${parts[2]}, h=${parts[3]}`);
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
        console.log(`Created ${bodies.length} platform bodies`);
        return bodies;
    }
}
