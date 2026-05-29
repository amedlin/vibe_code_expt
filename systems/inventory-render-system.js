class InventoryRenderSystem extends System {
    constructor(getPlayerEntity, panelWidth, panelHeight) {
        super(['Inventory']);
        this.getPlayerEntity = getPlayerEntity;
        this.panelWidth = panelWidth;
        this.panelHeight = panelHeight;
        this.slotHeight = 72;
        this.padding = 8;
    }

    update(deltaTime, entities, ctx) {
        const player = this.getPlayerEntity();
        if (!player) {
            this.clear(ctx);
            return;
        }

        const inventory = player.getComponent('Inventory');

        ctx.save();
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, this.panelWidth, this.panelHeight);

        ctx.fillStyle = '#ecf0f1';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Tangram', this.panelWidth / 2, 22);
        ctx.fillText(`${inventory.collected.length} / ${TANGRAM_PIECE_IDS.length}`, this.panelWidth / 2, 38);
        ctx.textAlign = 'left';

        for (let i = 0; i < TANGRAM_PIECE_IDS.length; i++) {
            const slotY = 48 + i * this.slotHeight;
            const slotCenterX = this.panelWidth / 2;

            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(this.padding, slotY, this.panelWidth - this.padding * 2, this.slotHeight - 6);

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

    clear(ctx) {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, this.panelWidth, this.panelHeight);
    }
}
