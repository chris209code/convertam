import { pointInRect } from '../../redact-edit/geometry';

export const DEFAULT_SIZE = 28;

export const interaction = 'edit'; // click reopens the inline text editor

export function createDefaults({ color }) {
  return { color, size: DEFAULT_SIZE, text: '' };
}

export function draw(ctx, o) {
  if (!o.text) return;
  ctx.save();
  ctx.fillStyle = o.color;
  ctx.font = `bold ${o.size}px sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText(o.text, o.x, o.y);
  ctx.restore();
}

export function bounds(o, ctx) {
  ctx.save();
  ctx.font = `bold ${o.size}px sans-serif`;
  const w = ctx.measureText(o.text || ' ').width;
  ctx.restore();
  return { x: o.x, y: o.y, w: Math.max(w, 10), h: o.size };
}

export function hitTest(pos, o, ctx) {
  const b = bounds(o, ctx);
  return pointInRect(pos, { x: b.x - 4, y: b.y - 4, w: b.w + 8, h: b.h + 8 });
}
