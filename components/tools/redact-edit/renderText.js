import { cssFontFamily } from './constants';

// Rasterizes a text object onto a 2D canvas context using the exact same
// primitives (ctx.font / fillText / rotate) the browser already uses to
// paint the live DOM preview — this is what lets export be a literal,
// low-risk match for what's on screen, rather than re-implementing text
// layout through a separate PDF text engine with different font metrics.
export function drawTextObjectToCanvas(ctx, t) {
  if (!t.text || !t.text.trim()) return;
  const lines = t.text.split('\n');
  const weight = t.bold ? 'bold' : 'normal';
  const style = t.italic ? 'italic' : 'normal';
  const family = cssFontFamily(t.fontFamily);

  ctx.save();
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate(((t.rotation || 0) * Math.PI) / 180);
  ctx.translate(-cx, -cy);

  ctx.font = `${style} ${weight} ${t.fontSizePx}px ${family}`;
  ctx.fillStyle = t.color;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) {
    try { ctx.letterSpacing = `${t.letterSpacing || 0}px`; } catch { /* older engines: skip, minor visual diff only */ }
  }

  const lineHeightPx = t.fontSizePx * (t.lineHeight || 1.25);
  lines.forEach((line, i) => {
    const lineY = t.y + lineHeightPx * i + t.fontSizePx * 0.85;
    const lineW = ctx.measureText(line).width;
    let lineX = t.x;
    if (t.align === 'center') lineX = t.x + (t.w - lineW) / 2;
    else if (t.align === 'right') lineX = t.x + t.w - lineW;
    ctx.fillText(line, lineX, lineY);
    if (t.underline && line.trim()) {
      ctx.save();
      ctx.strokeStyle = t.color;
      ctx.lineWidth = Math.max(1, t.fontSizePx * 0.06);
      const underlineY = lineY + t.fontSizePx * 0.12;
      ctx.beginPath();
      ctx.moveTo(lineX, underlineY);
      ctx.lineTo(lineX + lineW, underlineY);
      ctx.stroke();
      ctx.restore();
    }
  });
  ctx.restore();
}
