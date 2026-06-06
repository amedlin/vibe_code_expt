// Theme framework
//
// A Theme defines the visual style of a level: its color palette, the
// procedural background that fills the back of the scene, how platforms are
// drawn, and the sprite set used for static props.
//
// Themes are registered once at script load (one JS file per theme calls
// Themes.register(id, theme)). A level text file declares which theme to use
// via a `# Theme: <id>` header; the level manager resolves the ID through
// this registry at spawn time.
//
// Required Theme shape:
//   {
//     palette:              { ...colors },
//     generateBackground(ctx, width, height, rng?): void
//     drawPlatform(ctx, x, y, width, height): void
//     getPropSprite(role): { canvas, width, height } | null
//   }
//
// `role` is one of THEME_PROP_ROLES — semantic size/silhouette classes that
// level files reference (grass/shrub/tree). Each theme picks its own visual
// realization for each role, so level files stay portable across themes.

const THEME_PROP_ROLES = ['grass', 'shrub', 'tree'];

const DEFAULT_THEME_ID = 'forest';

const THEMES = {};

const Themes = {
    register(id, theme) {
        if (THEMES[id]) {
            console.warn(`Theme '${id}' is being re-registered; replacing.`);
        }
        THEMES[id] = { id, ...theme };
    },

    get(id) {
        return THEMES[id] ?? null;
    },

    has(id) {
        return Object.prototype.hasOwnProperty.call(THEMES, id);
    },

    getDefault() {
        return THEMES[DEFAULT_THEME_ID] ?? null;
    },

    list() {
        return Object.keys(THEMES);
    }
};

function isThemePropRole(role) {
    return THEME_PROP_ROLES.includes(role);
}
