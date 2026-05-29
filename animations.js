// Player animation definitions
const PLAYER_ANIMATIONS = {
    idle: new Animation('idle', [
        new SpriteFrame(200, createColoredFrame(['#ff6b6b']))
    ], true),

    runningLeft: new Animation('runningLeft', [
        new SpriteFrame(100, createColoredFrame(['#ff6b6b'])),
        new SpriteFrame(100, createColoredFrame(['#ff5252']))
    ], true),

    runningRight: new Animation('runningRight', [
        new SpriteFrame(100, createColoredFrame(['#ff6b6b'])),
        new SpriteFrame(100, createColoredFrame(['#ff5252']))
    ], true),

    jumping: new Animation('jumping', [
        new SpriteFrame(200, createColoredFrame(['#ffa500']))
    ], true),

    falling: new Animation('falling', [
        new SpriteFrame(200, createColoredFrame(['#ff8c00']))
    ], true)
};
