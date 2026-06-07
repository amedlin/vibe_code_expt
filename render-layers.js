// Canonical render layer registry. Each layer has a sort order and a
// composite kind that tells the engine how to present it each frame.
// Render systems register against a layer id; reordering visuals is
// done by editing order values here, not by shuffling registration calls.
//
// Composite kinds:
//   blit-background — engine blits backgroundCanvas (procedural theme bg)
//   blit-props      — engine blits propsCanvas (cached platforms + back props)
//   draw            — ECS runs all systems registered to this layer id

const RENDER_LAYER = {
    BACKGROUND: {
        id:        'background',
        order:     10,
        composite: 'blit-background'
    },
    SKY: {
        id:        'sky',
        order:     20,
        composite: 'draw'
    },
    PROPS: {
        id:        'props',
        order:     30,
        composite: 'blit-props'
    },
    PLAYER: {
        id:        'player',
        order:     40,
        composite: 'draw'
    },
    PARTICLES: {
        id:        'particles',
        order:     50,
        composite: 'draw'
    },
    COLLECTIBLES: {
        id:        'collectibles',
        order:     60,
        composite: 'draw'
    },
    DECORATIONS_FRONT: {
        id:        'decorationsFront',
        order:     70,
        composite: 'draw'
    }
};

const RENDER_LAYER_BY_ID = Object.create(null);
for (const layer of Object.values(RENDER_LAYER)) {
    RENDER_LAYER_BY_ID[layer.id] = layer;
}

const RENDER_LAYER_PIPELINE = Object.values(RENDER_LAYER)
    .slice()
    .sort((a, b) => a.order - b.order);

function getRenderLayer(id) {
    return RENDER_LAYER_BY_ID[id] ?? null;
}

function getRenderLayerPipeline() {
    return RENDER_LAYER_PIPELINE;
}

function isKnownRenderLayer(id) {
    return id in RENDER_LAYER_BY_ID;
}
