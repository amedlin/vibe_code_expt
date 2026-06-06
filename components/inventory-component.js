// Generic collectible counter. We previously tracked each tangram piece
// by id (since the same id couldn't be collected twice), but now that
// pills are interchangeable we just keep a running tally — this also
// removes the implicit cap of "one of each known id" and lets a level
// place arbitrarily many collectibles.
class InventoryComponent {
    constructor() {
        this.count = 0;
    }

    add(_itemId) {
        this.count += 1;
    }

    reset() {
        this.count = 0;
    }
}
