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
