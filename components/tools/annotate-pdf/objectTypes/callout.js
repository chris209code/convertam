import { pointInRect } from '../../redact-edit/geometry';
import { roundedRectPath, truncateToWidth, wrapText } from './canvasUtils';

export const CALLOUT_W = 180;
export const CALLOUT_H = 90;
// Default bubble placement relative to the anchor point the user clicked —
// up-and-right, so the leader line reads naturally pointing down-left at
// whatever was called out (matches Adobe/typical PDF-annotator defaults).
export const DEFAULT_OFFSET = { dx: 40, dy: -110 };

export const interaction = 'edit'; // click reopens the inline comment editor, same as note/text

export function createDefaults({ color, x, y }) {
  return {
    color, text: '', w: CALLOUT_W, h: CALLOUT_H,
    // The bubble is offset from the clicked point; leaderPoint is the fixed
    // anchor tip in page-space — it does NOT move when the bubble itself is
    // dragged/resized, matching how a real callout keeps pointing at the
    // thing being annotated. x/y here (the bubble's own position) override
    // the raw click coordinates createObject() would otherwise use.
    x: x + DEFAULT_OFFSET.dx,
    y: y + DEFAULT_OFFSET.dy,
    leaderPoint: { x, y },
  };
}

export function bounds(o) {
  return { x: o.x, y: o.y, w: o.w || CALLOUT_W, h: o.h || CALLOUT_H };
}

export function hitTest(pos, o) {
  return pointInRect(pos, bounds(o));
}

// Where the leader line should touch the bubble: whichever edge midpoint is
// closest to the anchor tip, so the line never crosses through the bubble.
function closestEdgePoint(b, tip) {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tip.x - cx;
  const dy = tip.y - cy;
  if (Math.abs(dx) / b.w > Math.abs(dy) / b.h) {
    return { x: dx > 0 ? b.x + b.w : b.x, y: cy };
  }
  return { x: cx, y: dy > 0 ? b.y + b.h : b.y };
}

export function draw(ctx, o) {
  const b = bounds(o);
  const tip = o.leaderPoint || { x: b.x - 20, y: b.y + b.h + 20 };

  ctx.save();
  ctx.strokeStyle = o.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
  ctx.fill();
  const edge = closestEdgePoint(b, tip);
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(edge.x, edge.y);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowColor = 'rgba(15,23,42,0.24)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = 'white';
  ctx.strokeStyle = o.color;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, b.x, b.y, b.w, b.h, 8);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.stroke();
  ctx.restore();

  if (o.text) {
    ctx.save();
    ctx.fillStyle = '#1E293B';
    ctx.font = '13px sans-serif';
    ctx.textBaseline = 'top';
    const pad = 10;
    const lineHeight = 17;
    const maxTextW = b.w - pad * 2;
    const maxLines = Math.max(1, Math.floor((b.h - pad * 2) / lineHeight));
    let lines = wrapText(ctx, o.text, maxTextW);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      lines[maxLines - 1] = truncateToWidth(ctx, lines[maxLines - 1], maxTextW);
    }
    lines.forEach((line, i) => ctx.fillText(line, b.x + pad, b.y + pad + i * lineHeight));
    ctx.restore();
  }
}
