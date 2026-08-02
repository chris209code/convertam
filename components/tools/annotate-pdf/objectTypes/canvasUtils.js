// Small canvas-2D text/shape helpers shared by object-type renderers
// (note.js today; callout.js will reuse these in Phase 2 for its speech
// bubble + wrapped text).

export function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

export function roundedRectPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Applies a rotation (degrees) around (cx, cy) for the duration of `fn`,
// then restores — shared by shape/image/signature draw() so object-level
// rotation (distinct from page-level rotation) is one line to opt into.
export function rotateAround(ctx, cx, cy, degrees, fn) {
  if (!degrees) { fn(); return; }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

// Inverse of rotateAround for hit-testing: rotates a pointer position
// backward around (cx, cy) so it can be tested against the object's
// unrotated bounds rect.
export function unrotatePoint(pos, cx, cy, degrees) {
  if (!degrees) return pos;
  const rad = (-degrees * Math.PI) / 180;
  const dx = pos.x - cx;
  const dy = pos.y - cy;
  return { x: cx + dx * Math.cos(rad) - dy * Math.sin(rad), y: cy + dx * Math.sin(rad) + dy * Math.cos(rad) };
}

// Wraps text into lines that fit maxWidth, honoring explicit line breaks
// from a multi-line textarea (unlike truncateToWidth's single-line ellipsis).
export function wrapText(ctx, text, maxWidth) {
  const lines = [];
  text.split('\n').forEach((paragraph) => {
    if (!paragraph) { lines.push(''); return; }
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    });
    lines.push(line);
  });
  return lines;
}
