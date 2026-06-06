// Side-panel renderer. The panel itself keeps the same DOM canvas /
// dimensions as the old tangram inventory (120 x canvasHeight); only
// the contents have been simplified to an icon + numeric counter so it
// can represent any number of collected pills (no 7-piece cap).
//
// The engine still drives this via a dirty/count check, so we only
// repaint when the count actually changes or the panel is explicitly
// invalidated (e.g. on level reset / re-entry to the level-select).
class InventoryRenderSystem extends System {
    constructor(getPlayerEntity, panelWidth, panelHeight) {
        super(['Inventory']);
        this.getPlayerEntity = getPlayerEntity;
        this.panelWidth = panelWidth;
        this.panelHeight = panelHeight;
    }

    update(deltaTime, entities, ctx) {
        const player = this.getPlayerEntity();
        if (!player) {
            this.clear(ctx);
            return;
        }

        const inventory = player.getComponent('Inventory');
        const count = inventory ? inventory.count : 0;

        ctx.save();
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, this.panelWidth, this.panelHeight);

        // Title at the top of the panel — kept compact so the icon +
        // counter row gets the prominent visual real-estate.
        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Pills', this.panelWidth / 2, 24);

        // Icon + count row. Drawn in the upper third of the panel,
        // centered horizontally as an icon-then-number pair so the
        // pacman pill reads as the unit and the count as the quantity.
        const rowY     = 84;
        const iconSize = 28;
        const gap      = 12;
        ctx.font = 'bold 28px Arial';
        const countText  = String(count);
        const countWidth = ctx.measureText(countText).width;
        const totalWidth = iconSize + gap + countWidth;

        const iconX = Math.round((this.panelWidth - totalWidth) / 2);
        const iconY = rowY - iconSize / 2;
        drawPill(ctx, iconX, iconY, iconSize, iconSize);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ecf0f1';
        ctx.fillText(countText, iconX + iconSize + gap, rowY);

        ctx.restore();
    }

    clear(ctx) {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, this.panelWidth, this.panelHeight);
    }
}
