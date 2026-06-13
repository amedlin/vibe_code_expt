const STICK_FIGURE_LINE_WIDTH = 2;
const STICK_FIGURE_STROKE = '#000000';

const DRAW_LAYER_ORDER = [
    'upperLegL',
    'lowerLegL',
    'upperLegR',
    'lowerLegR',
    'torso',
    'upperArmL',
    'lowerArmL',
    'upperArmR',
    'lowerArmR'
];

const STICK_FIGURE_HIP_OFFSET_Y = PLAYER_HIP_OFFSET_Y;

function drawStickFigure(ctx, rootX, rootY, pose, skeleton, options = {}) {
    const facing = options.facing ?? 1;
    const solved = solvePose(skeleton, pose, 0, STICK_FIGURE_HIP_OFFSET_Y);
    const footMetrics = footSpanFromSolved(solved);

    ctx.save();
    ctx.translate(rootX, rootY);
    ctx.scale(facing, 1);
    ctx.translate(-footMetrics.centerX, 0);

    ctx.strokeStyle = STICK_FIGURE_STROKE;
    ctx.fillStyle = STICK_FIGURE_STROKE;
    ctx.lineWidth = STICK_FIGURE_LINE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const segmentsByName = new Map(solved.segments.map((segment) => [segment.name, segment]));

    for (const name of DRAW_LAYER_ORDER) {
        const segment = segmentsByName.get(name);
        if (!segment) {
            continue;
        }
        ctx.beginPath();
        ctx.moveTo(segment.x1, segment.y1);
        ctx.lineTo(segment.x2, segment.y2);
        ctx.stroke();
    }

    if (solved.head) {
        ctx.beginPath();
        ctx.arc(solved.head.x, solved.head.y, solved.head.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

function getPlayerFeetRoot(x, y, width, height) {
    return {
        x: x + width / 2,
        y: y + height - 2
    };
}
