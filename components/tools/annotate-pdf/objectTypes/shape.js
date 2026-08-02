import { pointInRect } from '../../redact-edit/geometry';
import { rotateAround, unrotatePoint } from './canvasUtils';

export const SHAPE_KINDS = ['rectangle', 'circle', 'arrow', 'line', 'cloud', 'polygon'];
export const DEFAULT_THICKNESS = 3;

// select+delete/resize, no inline editor — polygon is the one kind built by
// a click-sequence (see Stage.js's polygonDraft) rather than a single drag,
// but once committed it's a normal select-interaction object like the rest.
export const interaction = 'select';

export function createDefaults({ color, shapeKind = 'rectangle' }) {
  return { color, shapeKind, thickness: DEFAULT_THICKNESS, fill: false };
}

function drawCloud(ctx, x, y, w, h) {
  // Classic "cloud" markup: a ring of overlapping arcs traced around the
  // bounding box perimeter instead of a plain rounded rect — arc size scales
  // with the box so small clouds don't get an unreadably lumpy outline.
  const bumps = Math.max(6, Math.round((w + h) / 40));
  const r = Math.min(w, h) / bumps;
  ctx.beginPath();
  const perimeterPoints = [];
  const top = [[x, y], [x + w, y]];
  const right = [[x + w, y], [x + w, y + h]];
  const bottom = [[x + w, y + h], [x, y + h]];
  const left = [[x, y + h], [x, y]];
  [top, right, bottom, left].forEach(([[x1, y1], [x2, y2]]) => {
    const segBumps = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / (r * 1.6)));
    for (let i = 0; i < segBumps; i++) {
      const t = (i + 0.5) / segBumps;
      perimeterPoints.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
    }
  });
  perimeterPoints.forEach((p) => {
    ctx.moveTo(p.x + r, p.y);
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  });
}

function drawArrowhead(ctx, fromX, fromY, toX, toY, size) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

export function draw(ctx, o) {
  const { x, y, w, h, shapeKind } = o;
  const b = bounds(o);
  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.fillStyle = o.color;
  ctx.lineWidth = o.thickness ?? DEFAULT_THICKNESS;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.globalAlpha = o.opacity ?? 1;

  rotateAround(ctx, b.x + b.w / 2, b.y + b.h / 2, o.rotation, () => drawShapeBody(ctx, o, x, y, w, h, shapeKind));
  ctx.restore();
}

function drawShapeBody(ctx, o, x, y, w, h, shapeKind) {
  if (shapeKind === 'rectangle') {
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    if (o.fill) ctx.fill();
    ctx.stroke();
  } else if (shapeKind === 'circle') {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
    if (o.fill) ctx.fill();
    ctx.stroke();
  } else if (shapeKind === 'line') {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
  } else if (shapeKind === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();
    drawArrowhead(ctx, x, y, x + w, y + h, Math.max(10, (o.thickness ?? DEFAULT_THICKNESS) * 4));
  } else if (shapeKind === 'cloud') {
    drawCloud(ctx, x, y, w, h);
    if (o.fill) ctx.fill();
    ctx.stroke();
  } else if (shapeKind === 'polygon' && o.points?.length > 1) {
    ctx.beginPath();
    ctx.moveTo(o.points[0].x, o.points[0].y);
    o.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    if (o.fill) ctx.fill();
    ctx.stroke();
  }
}

export function bounds(o) {
  if (o.shapeKind === 'polygon' && o.points?.length) {
    const xs = o.points.map((p) => p.x);
    const ys = o.points.map((p) => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  // Lines/arrows can have negative w/h (dragged up/left) — normalize so the
  // selection box and hit-test rect always have a positive width/height.
  const x = Math.min(o.x, o.x + o.w);
  const y = Math.min(o.y, o.y + o.h);
  return { x, y, w: Math.abs(o.w), h: Math.abs(o.h) };
}

export function hitTest(pos, o) {
  const b = bounds(o);
  const p = unrotatePoint(pos, b.x + b.w / 2, b.y + b.h / 2, o.rotation);
  const pad = 6;
  return pointInRect(p, { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 });
}
