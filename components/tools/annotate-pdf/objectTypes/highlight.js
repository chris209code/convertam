import { pointInRect } from '../../redact-edit/geometry';

// Adjustable per-object in Phase 2 (opacity slider); this is just the
// default a freshly-drawn highlight gets.
export const DEFAULT_OPACITY = 0.42;

export const interaction = 'select'; // select+delete, no inline editor

export function createDefaults({ color }) {
  return { color, opacity: DEFAULT_OPACITY };
}

export function draw(ctx, o) {
  ctx.save();
  ctx.globalAlpha = o.opacity ?? DEFAULT_OPACITY;
  ctx.fillStyle = o.color;
  ctx.fillRect(o.x, o.y, o.w, o.h);
  ctx.restore();
}

export function bounds(o) {
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}

export function hitTest(pos, o) {
  return pointInRect(pos, bounds(o));
}
