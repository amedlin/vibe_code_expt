// Level class for managing level data and platform definitions
class Level {
    constructor(name, platforms = []) {
        this.name = name;
        this.platforms = platforms;
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
