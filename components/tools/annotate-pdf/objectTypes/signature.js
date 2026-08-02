import { pointInRect } from '../../redact-edit/geometry';
import { getCachedImage, loadImageElement } from './image';
import { rotateAround, unrotatePoint } from './canvasUtils';

// Signatures/initials are raster stamps just like image.js, sharing its
// decode cache (both are data-URL PNGs) — kept as a distinct object `type`
// purely so the Review Panel and exports can label them "Signature" /
// "Initials" instead of the generic "Image" (Phase 4's SignaturePad.js
// builds the capture UI; this module only needs to place/render the result).
export { loadImageElement };

export const interaction = 'select';

export function createDefaults({ src, w, h, kind = 'signature' }) {
  return { src, w, h, kind }; // kind: 'signature' | 'initials'
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
