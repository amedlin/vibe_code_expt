// Pacman-style pill: a small collectible dot. The bounding box is the
// AABB used for pickup overlap; the rendered glyph fills most of it
// with a warm cream-yellow fill plus a soft outer glow so it reads
// against any of the procedural backgrounds.
const PILL_ID     = 'pill';
const PILL_WIDTH  = 14;
const PILL_HEIGHT = 14;

const PILL_FILL    = '#ffe066';
const PILL_OUTLINE = '#5a4313';
const PILL_GLOW    = 'rgba(255, 228, 102, 0.45)';

// Draw a pill into ctx, fitting its visual into the given bounding box.
// When width/height are omitted the canonical PILL_WIDTH/PILL_HEIGHT
// are used (the inventory panel and world render both go through this
// single function so the icon never drifts from the world sprite).
function drawPill(ctx, x, y, width = PILL_WIDTH, height = PILL_HEIGHT) {
    const cx = x + width  / 2;
    const cy = y + height / 2;
    const r  = Math.min(width, height) * 0.42;

    ctx.save();
    // Outer glow — drawn slightly larger so the pill pops against
    // mid-value backgrounds (forest, tundra) as well as the bright sky.
    ctx.fillStyle = PILL_GLOW;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.55, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle   = PILL_FILL;
    ctx.strokeStyle = PILL_OUTLINE;
    ctx.lineWidth   = Math.max(1, r * 0.18);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Highlight crescent to suggest a polished sphere.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
