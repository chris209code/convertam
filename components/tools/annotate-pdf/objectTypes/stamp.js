import { pointInRect } from '../../redact-edit/geometry';
import { getCachedImage, loadImageElement } from './image';
import { rotateAround, unrotatePoint } from './canvasUtils';

// Stamps (preset library + custom upload) are raster images just like
// image.js/signature.js, sharing the same decode cache — a distinct object
// `type` purely so the Review Panel and exports can label them "Stamp"
// instead of the generic "Image".
export { loadImageElement };

export const interaction = 'select';

export function createDefaults({ src, w, h, label }) {
  return { src, w, h, label };
}

export function draw(ctx, o) {
  const img = getCachedImage(o.src);
  if (!img) return;
  ctx.save();
  ctx.globalAlpha = o.opacity ?? 1;
  rotateAround(ctx, o.x + o.w / 2, o.y + o.h / 2, o.rotation, () => ctx.drawImage(img, o.x, o.y, o.w, o.h));
  ctx.restore();
}

export function bounds(o) {
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}

export function hitTest(pos, o) {
  const p = unrotatePoint(pos, o.x + o.w / 2, o.y + o.h / 2, o.rotation);
  return pointInRect(p, bounds(o));
}
