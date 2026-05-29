class InventoryComponent {
    constructor() {
        this.collected = [];
    }

    has(pieceId) {
        return this.collected.includes(pieceId);
    }

    add(pieceId) {
        if (!this.has(pieceId)) {
            this.collected.push(pieceId);
        }
    }

    get isComplete() {
        return this.collected.length >= TANGRAM_PIECE_IDS.length;
    }
}
