// Level class for managing level data and platform definitions
class Level {
    constructor(name, themeId, seed, platforms = [], collectibles = [], decorations = []) {
        this.name = name;
        this.themeId = themeId ?? DEFAULT_THEME_ID;
        // Optional explicit background seed. When null, LevelManager
        // derives one from the level name so backgrounds stay deterministic
        // without needing an author-supplied value.
        this.seed = seed ?? null;
        this.platforms = platforms;
        this.collectibles = collectibles;
        this.decorations = decorations;
    }

    static parse(text) {
        const lines = text.split('\n');
        const platforms = [];
        const collectibles = [];
        const decorations = [];
        let levelName = 'Unnamed Level';
        let themeId = DEFAULT_THEME_ID;
        let seed = null;

        for (let line of lines) {
            line = line.trim();

            if (!line || line.startsWith('#')) {
                if (line.startsWith('# Level')) {
                    const raw = line.replace(/^#\s*Level\s*[-:]?\s*/i, '').trim();
                    if (raw) {
                        levelName = raw;
                    }
                } else if (/^#\s*Theme\b/i.test(line)) {
                    const raw = line.replace(/^#\s*Theme\s*[-:]?\s*/i, '').trim();
                    if (raw) {
                        themeId = raw;
                    }
                } else if (/^#\s*Seed\b/i.test(line)) {
                    const raw = line.replace(/^#\s*Seed\s*[-:]?\s*/i, '').trim();
                    const parsed = parseInt(raw, 10);
                    if (Number.isFinite(parsed)) {
                        seed = parsed;
                    } else if (raw) {
                        console.warn(`Ignoring non-integer seed '${raw}' in level header.`);
                    }
                }
                continue;
            }

            const parts = line.split(',').map((p) => p.trim());

            if (parts.length >= 2 && isDecorationType(parts[0])) {
                const x = parseFloat(parts[1]);
                const yHint = parts.length >= 3 ? parseFloat(parts[2]) : null;
                if (!isNaN(x)) {
                    decorations.push({
                        type: parts[0],
                        x,
                        yHint: parts.length >= 3 && !isNaN(yHint) ? yHint : null
                    });
                }
                continue;
            }

            // Collectibles: `pill, x, y`. Only one collectible kind today;
            // additional kinds would slot in as parallel branches here.
            if (parts.length === 3 && parts[0] === PILL_ID) {
                const x = parseFloat(parts[1]);
                const y = parseFloat(parts[2]);
                if (!isNaN(x) && !isNaN(y)) {
                    collectibles.push({ kind: PILL_ID, x, y });
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

        return new Level(levelName, themeId, seed, platforms, collectibles, decorations);
    }
}
