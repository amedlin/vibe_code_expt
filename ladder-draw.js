// Shared ladder rail + rung drawing used by each theme's drawLadder.
function drawThemedLadder(ctx, x, y, w, h, railColor, rungColor) {
    const railWidth = Math.min(3, Math.max(2, w * 0.12));
    const rungHeight = 2;
    const rungSpacing = 18;

    ctx.fillStyle = railColor;
    ctx.fillRect(x, y, railWidth, h);
    ctx.fillRect(x + w - railWidth, y, railWidth, h);

    ctx.fillStyle = rungColor;
    for (let rungY = y + 10; rungY < y + h - 6; rungY += rungSpacing) {
        ctx.fillRect(x + railWidth + 1, rungY, w - (railWidth + 1) * 2, rungHeight);
    }
}
