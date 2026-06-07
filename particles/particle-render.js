// Draw a single pool slot as a soft translucent circle. Alpha interpolates
// from slot.alpha → slot.alphaEnd over the particle lifetime; a radial
// gradient adds spatial falloff so dust trails blend rather than stacking
// as opaque discs.
function drawParticle(ctx, slot, screenX, screenY) {
    if (!slot.active || slot.life <= 0 || slot.maxLife <= 0) {
        return;
    }

    const t = 1 - slot.life / slot.maxLife;
    const currentAlpha = slot.alpha + (slot.alphaEnd - slot.alpha) * t;
    const currentSize  = slot.size + (slot.sizeEnd - slot.size) * t;

    if (currentAlpha <= 0.001 || currentSize <= 0.1) {
        return;
    }

    const cx = screenX;
    const cy = screenY;
    const r  = currentSize * 0.5;

    ctx.save();
    ctx.globalAlpha = currentAlpha;

    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, slot.color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}
