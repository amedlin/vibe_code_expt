// Shared decoration sprite helpers.
//
// This file provides reusable building blocks for themes to construct their
// prop sprite sets. It no longer owns a global sprite cache — each theme
// builds and owns its own sprites (see themes/forest.js for an example).
//
// The draw* functions below produce the forest theme's classic look. New
// themes can either reuse these or define their own draw functions for the
// same semantic roles (grass / shrub / tree).

function buildDecorationSprite(width, height, drawFn) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);
    return { width, height, canvas };
}

function drawGrassSprite(ctx, w, h) {
    const bases = [0.15, 0.35, 0.55, 0.72, 0.88];
    const greens = ['#3d8c40', '#4caf50', '#66bb6a', '#2e7d32'];
    for (let i = 0; i < bases.length; i++) {
        const x = w * bases[i];
        const bladeH = h * (0.55 + (i % 3) * 0.12);
        ctx.fillStyle = greens[i % greens.length];
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.quadraticCurveTo(x - 6, h - bladeH * 0.6, x - 2, h - bladeH);
        ctx.quadraticCurveTo(x + 4, h - bladeH * 0.75, x + 3, h - bladeH);
        ctx.quadraticCurveTo(x + 8, h - bladeH * 0.5, x, h);
        ctx.fill();
    }
}

function drawShrubSprite(ctx, w, h) {
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(w * 0.42, h * 0.72, w * 0.16, h * 0.28);
    const blobs = [
        { x: w * 0.5, y: h * 0.55, rx: w * 0.38, ry: h * 0.32 },
        { x: w * 0.3, y: h * 0.62, rx: w * 0.22, ry: h * 0.24 },
        { x: w * 0.72, y: h * 0.64, rx: w * 0.2, ry: h * 0.22 }
    ];
    for (const b of blobs) {
        ctx.fillStyle = '#388e3c';
        ctx.beginPath();
        ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.45, w * 0.3, h * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawTreeSprite(ctx, w, h) {
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(w * 0.44, h * 0.55, w * 0.12, h * 0.45);
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.05);
    ctx.lineTo(w * 0.88, h * 0.58);
    ctx.lineTo(w * 0.12, h * 0.58);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#388e3c';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.42, w * 0.32, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
}

// --- Tundra prop sprites ------------------------------------------------

function drawSnowTuftSprite(ctx, w, h) {
    // Soft white mound with a faint cool underside.
    ctx.fillStyle = '#dde9f1';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.85, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.70, w * 0.40, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawIceRockSprite(ctx, w, h) {
    // Two stacked rock blobs in cool gray, with a snow cap on top.
    ctx.fillStyle = '#7d92a0';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.78, w * 0.46, h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9caab6';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, h * 0.55, w * 0.34, h * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3f7fa';
    ctx.beginPath();
    ctx.ellipse(w * 0.46, h * 0.40, w * 0.30, h * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawSnowPineSprite(ctx, w, h) {
    // Trunk
    ctx.fillStyle = '#3d2f24';
    ctx.fillRect(w * 0.46, h * 0.72, w * 0.08, h * 0.28);
    // Three tiers, each a green triangle with a slim snow-frosted top.
    const tiers = [
        { topY: h * 0.04, botY: h * 0.34, half: w * 0.50 },
        { topY: h * 0.26, botY: h * 0.56, half: w * 0.42 },
        { topY: h * 0.48, botY: h * 0.78, half: w * 0.36 }
    ];
    for (const t of tiers) {
        ctx.fillStyle = '#2c4a3d';
        ctx.beginPath();
        ctx.moveTo(w * 0.5, t.topY);
        ctx.lineTo(w * 0.5 + t.half, t.botY);
        ctx.lineTo(w * 0.5 - t.half, t.botY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#eef4f8';
        const snowFrac = 0.35;
        const snowBotY = t.topY + (t.botY - t.topY) * snowFrac;
        ctx.beginPath();
        ctx.moveTo(w * 0.5, t.topY);
        ctx.lineTo(w * 0.5 + t.half * snowFrac, snowBotY);
        ctx.lineTo(w * 0.5 - t.half * snowFrac, snowBotY);
        ctx.closePath();
        ctx.fill();
    }
}

// --- Desert prop sprites ------------------------------------------------

function drawDesertGrassSprite(ctx, w, h) {
    // Sparse golden straw blades — thinner and more spread out than the
    // lush forest grass, with browner tones to read as dry.
    const bases = [0.20, 0.42, 0.62, 0.85];
    const tans = ['#c4a04a', '#a07c34', '#d4b364', '#8b6c2a'];
    for (let i = 0; i < bases.length; i++) {
        const x = w * bases[i];
        const bladeH = h * (0.45 + (i % 3) * 0.12);
        ctx.fillStyle = tans[i % tans.length];
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.quadraticCurveTo(x - 3, h - bladeH * 0.6, x - 1, h - bladeH);
        ctx.quadraticCurveTo(x + 3, h - bladeH * 0.75, x + 2, h - bladeH);
        ctx.quadraticCurveTo(x + 5, h - bladeH * 0.5, x, h);
        ctx.fill();
    }
}

function drawDryShrubSprite(ctx, w, h) {
    // Tumbleweed-ish dry brush: dome of tangled wisps with radiating spokes.
    const cx = w * 0.5;
    const cy = h * 0.62;
    const r = Math.min(w, h) * 0.32;

    ctx.fillStyle = '#7d5a2e';
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.20, r * 1.05, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a07c34';
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#c19952';
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.18, cy - r * 0.22, r * 0.42, r * 0.30, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#604320';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r * 0.30, cy + Math.sin(a) * r * 0.30);
        ctx.lineTo(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.75);
        ctx.stroke();
    }
}

function drawPalmTreeSprite(ctx, w, h) {
    // Slightly curved trunk
    ctx.strokeStyle = '#6e4f31';
    ctx.lineWidth = w * 0.10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.50, h * 0.98);
    ctx.quadraticCurveTo(w * 0.42, h * 0.55, w * 0.52, h * 0.22);
    ctx.stroke();

    // Trunk segment hatches — short cross-strokes for palm-bark texture.
    ctx.strokeStyle = '#553a22';
    ctx.lineWidth = w * 0.025;
    for (let i = 0; i < 4; i++) {
        const t = 0.30 + i * 0.16;
        const y = h * (0.98 - t * 0.76);
        ctx.beginPath();
        ctx.moveTo(w * 0.42, y);
        ctx.lineTo(w * 0.58, y);
        ctx.stroke();
    }

    // Crown of fronds — six elongated leaves rotated around the trunk top.
    const crownX = w * 0.52;
    const crownY = h * 0.22;
    const frondAngles = [-2.6, -1.9, -1.1, -0.3, 0.5, 1.2];
    for (const a of frondAngles) {
        ctx.save();
        ctx.translate(crownX, crownY);
        ctx.rotate(a);
        ctx.fillStyle = '#345f2e';
        ctx.beginPath();
        ctx.ellipse(w * 0.22, h * 0.02, w * 0.28, h * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4f7d3e';
        ctx.beginPath();
        ctx.ellipse(w * 0.20, 0, w * 0.20, h * 0.02, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // Coconut cluster nestled at the base of the crown.
    ctx.fillStyle = '#4a3520';
    ctx.beginPath();
    ctx.arc(crownX + w * 0.05, crownY + h * 0.05, w * 0.045, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(crownX - w * 0.04, crownY + h * 0.06, w * 0.045, 0, Math.PI * 2);
    ctx.fill();
}
