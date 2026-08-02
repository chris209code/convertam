import { pointInRect } from '../../redact-edit/geometry';

export const DEFAULT_THICKNESS = 2;

export const interaction = 'select';

export function createDefaults({ color }) {
  return { color, thickness: DEFAULT_THICKNESS, style: 'solid' };
}

export function draw(ctx, o) {
  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.lineWidth = o.thickness ?? DEFAULT_THICKNESS;
  ctx.setLineDash(o.style === 'dashed' ? [8, 5] : []);
  ctx.beginPath();
  const y = o.y + o.h / 2;
  ctx.moveTo(o.x, y);
  ctx.lineTo(o.x + o.w, y);
  ctx.stroke();
  ctx.restore();
}

export function bounds(o) {
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}

export function hitTest(pos, o) {
  return pointInRect(pos, bounds(o));
}
