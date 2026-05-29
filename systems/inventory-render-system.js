class InventoryRenderSystem extends System {
    constructor(getPlayerEntity, canvasWidth, canvasHeight) {
        super(['Inventory']);
        this.getPlayerEntity = getPlayerEntity;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.panelWidth = 120;
        this.slotHeight = 72;
        this.padding = 8;
    }

    update(deltaTime, entities, ctx) {
        const player = this.getPlayerEntity();
        if (!player) return;

        const inventory = player.getComponent('Inventory');
        const panelX = this.canvasWidth - this.panelWidth;

        ctx.save();
        ctx.fillStyle = 'rgba(30, 30, 30, 0.85)';
        ctx.fillRect(panelX, 0, this.panelWidth, this.canvasHeight);

        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tangram', panelX + this.panelWidth / 2, 22);
        ctx.fillText(`${inventory.collected.length} / ${TANGRAM_PIECE_IDS.length}`, panelX + this.panelWidth / 2, 38);
        ctx.textAlign = 'left';

        for (let i = 0; i < TANGRAM_PIECE_IDS.length; i++) {
            const slotY = 48 + i * this.slotHeight;
            const slotCenterX = panelX + this.panelWidth / 2;

            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(panelX + this.padding, slotY, this.panelWidth - this.padding * 2, this.slotHeight - 6);

            const pieceId = inventory.collected[i];
            if (pieceId) {
                const def = getTangramPiece(pieceId);
                const drawX = slotCenterX - def.width / 2;
                const drawY = slotY + (this.slotHeight - 6 - def.height) / 2;
                drawTangramPiece(ctx, pieceId, drawX, drawY);
            }
        }

        ctx.restore();
    }
}
