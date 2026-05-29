// Canonical tangram set — seven pieces that tile a square when solved.
const TANGRAM_PIECE_IDS = [
    'large_tri_1',
    'large_tri_2',
    'medium_tri',
    'small_tri_1',
    'small_tri_2',
    'square',
    'parallelogram'
];

const TANGRAM_PIECES = {
    large_tri_1: {
        label: 'Large triangle',
        color: '#e74c3c',
        width: 80,
        height: 80,
        points: [[0, 80], [80, 80], [0, 0]]
    },
    large_tri_2: {
        label: 'Large triangle',
        color: '#e67e22',
        width: 80,
        height: 80,
        points: [[0, 0], [80, 0], [80, 80]]
    },
    medium_tri: {
        label: 'Medium triangle',
        color: '#f1c40f',
        width: 56,
        height: 56,
        points: [[0, 56], [56, 56], [0, 0]]
    },
    small_tri_1: {
        label: 'Small triangle',
        color: '#2ecc71',
        width: 40,
        height: 40,
        points: [[0, 40], [40, 40], [0, 0]]
    },
    small_tri_2: {
        label: 'Small triangle',
        color: '#1abc9c',
        width: 40,
        height: 40,
        points: [[40, 0], [40, 40], [0, 0]]
    },
    square: {
        label: 'Square',
        color: '#3498db',
        width: 40,
        height: 40,
        points: [[20, 0], [40, 20], [20, 40], [0, 20]]
    },
    parallelogram: {
        label: 'Parallelogram',
        color: '#9b59b6',
        width: 70,
        height: 35,
        points: [[15, 0], [70, 0], [55, 35], [0, 35]]
    }
};

function getTangramPiece(pieceId) {
    return TANGRAM_PIECES[pieceId] ?? null;
}

function isTangramPieceId(pieceId) {
    return pieceId in TANGRAM_PIECES;
}

function drawTangramPiece(ctx, pieceId, x, y) {
    const piece = getTangramPiece(pieceId);
    if (!piece) return;

    ctx.save();
    ctx.fillStyle = piece.color;
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + piece.points[0][0], y + piece.points[0][1]);
    for (let i = 1; i < piece.points.length; i++) {
        ctx.lineTo(x + piece.points[i][0], y + piece.points[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function rectanglesOverlap(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
}
