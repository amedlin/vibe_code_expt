// Level class for managing level data and platform definitions
class Level {
    constructor(name, platforms = [], tangramPieces = []) {
        this.name = name;
        this.platforms = platforms;
        this.tangramPieces = tangramPieces;
    }

    static parse(text) {
        const lines = text.split('\n');
        const platforms = [];
        const tangramPieces = [];
        let levelName = 'Unnamed Level';

        for (let line of lines) {
            line = line.trim();

            if (!line || line.startsWith('#')) {
                if (line.startsWith('# Level')) {
                    const raw = line.replace(/^#\s*Level\s*[-:]?\s*/i, '').trim();
                    if (raw) {
                        levelName = raw;
                    }
                }
                continue;
            }

            const parts = line.split(',').map((p) => p.trim());

            if (parts.length === 3 && isTangramPieceId(parts[0])) {
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                if (!isNaN(x) && !isNaN(y)) {
                    tangramPieces.push({ pieceId: parts[0], x, y });
                }
                continue;
            }

            if (parts.length === 4) {
                const nums = parts.map((p) => parseFloat(p));
                if (nums.every((n) => !isNaN(n))) {
                    platforms.push({
                        x: nums[0],
                        y: nums[1],
                        width: nums[2],
                        height: nums[3]
                    });
                }
            }
        }

        return new Level(levelName, platforms, tangramPieces);
    }
}
