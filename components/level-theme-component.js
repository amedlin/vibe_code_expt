// LevelThemeComponent — singleton component attached to the level entity
// created by LevelManager at spawn time. Carries the resolved Theme object
// so any system that wants the level's visual style can find it via ECS
// without a back-reference to the engine.
class LevelThemeComponent {
    constructor(theme) {
        this.theme = theme;
    }
}
