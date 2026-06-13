// Tag component for ladder entities. Resolved platform IDs are filled in
// during NavigationGraph.rebuild() once walkable platform nodes exist.
class LadderComponent {
    constructor(options = {}) {
        this.topY = options.topY ?? 0;
        this.bottomY = options.bottomY ?? 0;
        this.extendedTopY = options.extendedTopY ?? computeLadderExtendedTopY(this.topY);
        this.topPlatformIndex = options.topPlatformIndex ?? -1;
        this.bottomPlatformIndex = options.bottomPlatformIndex ?? -1;
        this.topPlatformId = options.topPlatformId ?? null;
        this.bottomPlatformId = options.bottomPlatformId ?? null;
        this.centerX = options.centerX ?? 0;
    }
}
