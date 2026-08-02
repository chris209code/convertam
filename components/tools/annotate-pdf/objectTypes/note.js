import { pointInRect } from '../../redact-edit/geometry';
import { roundedRectPath, truncateToWidth, wrapText } from './canvasUtils';

export const NOTE_SIZE = 170; // default square sticky-note size, in canvas px

// Soft pastel sticky-note background per ink color, so the note's paper
// color follows whichever swatch is selected instead of using the full-
// saturation ink color as a background (which would look like a bold
// colored card, not a Post-it). Dark maps to the classic sticky-note
// yellow since it's the default ink color and has no color of its own.
const NOTE_BG_COLORS = {
  '#DC2626': '#FECACA',
  '#2563EB': '#BFDBFE',
  '#059669': '#BBF7D0',
  '#0F172A': '#FEF08A',
};
export function noteBg(color) {
  return NOTE_BG_COLORS[color] || '#FEF08A';
}

export const interaction = 'edit'; // click reopens the inline comment editor

export function createDefaults({ color }) {
  return { color, text: '', w: NOTE_SIZE, h: NOTE_SIZE };
}

export function bounds(o) {
  return { x: o.x, y: o.y, w: o.w || NOTE_SIZE, h: o.h || NOTE_SIZE };
}

export function hitTest(pos, o) {
  return pointInRect(pos, bounds(o));
}

export function draw(ctx, o) {
  const { w, h } = bounds(o);
  const pad = 12;

  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.28)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = noteBg(o.color);
  roundedRectPath(ctx, o.x, o.y, w, h, 4);
  ctx.fill();
  ctx.restore();

  if (o.text) {
    ctx.save();
    ctx.fillStyle = '#1E293B';
    ctx.font = '15px sans-serif';
    ctx.textBaseline = 'top';
    const lineHeight = 19;
    const maxTextW = w - pad * 2;
    const maxLines = Math.max(1, Math.floor((h - pad * 2) / lineHeight));
    let lines = wrapText(ctx, o.text, maxTextW);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = truncateToWidth(ctx, lines[maxLines - 1], maxTextW);
    }
    lines.forEach((line, i) => ctx.fillText(line, o.x + pad, o.y + pad + i * lineHeight));
    ctx.restore();
  }
}
