import { pointInRect } from '../../redact-edit/geometry';

export const DEFAULT_THICKNESS = 5;

export const interaction = 'select'; // select+delete, no inline editor

export function createDefaults({ color }) {
  return { color, thickness: DEFAULT_THICKNESS, tool: 'pen' };
}

// Bounding box of a freehand stroke's points, padded so the selection
// outline/hit box isn't razor-thin against the stroke itself.
export function strokeBounds(points, pad = 8) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
}

export function draw(ctx, o) {
  if (o.points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.lineWidth = o.thickness ?? DEFAULT_THICKNESS;
  ctx.globalAlpha = o.opacity ?? 1;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(o.points[0].x, o.points[0].y);
  o.points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.stroke();
  ctx.restore();
}

export function bounds(o) {
  return strokeBounds(o.points);
}

export function hitTest(pos, o) {
  return pointInRect(pos, bounds(o));
}
