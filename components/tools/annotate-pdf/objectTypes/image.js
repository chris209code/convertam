import { pointInRect } from '../../redact-edit/geometry';
import { rotateAround, unrotatePoint } from './canvasUtils';

export const interaction = 'select';

// draw() has to be synchronous (it runs inside the shared canvas redraw
// loop), but decoding a data URL into a paintable <img> is async — so
// images are decoded once up front, before the object is ever committed to
// history (see loadImageElement below, used by Stage.js's insert-image
// flow), and cached here by src. By the time draw() runs for a given
// object, its image is already in this cache.
const imageCache = new Map();

export function loadImageElement(src) {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src));
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

export function getCachedImage(src) {
  return imageCache.get(src) || null;
}

export function createDefaults({ src, w, h }) {
  return { src, w, h, kind: 'image' };
}

export function draw(ctx, o) {
  const img = getCachedImage(o.src);
  if (!img) return; // not decoded yet — next redraw (triggered by the load promise resolving) will paint it
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
