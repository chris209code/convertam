import { roundedRect, drawImageCover, getFrame } from './frames';

// Two images with a vertical divider and small "BEFORE"/"AFTER" tags — the
// divider position is adjustable so users can control how much of each
// side shows.
export function drawBeforeAfter(ctx, imgBefore, imgAfter, { x, y, w, h, dividerPct = 50 }) {
  const dividerX = x + (w * dividerPct) / 100;
  roundedRect(ctx, x, y, w, h, w * 0.015);
  ctx.save();
  ctx.clip();
  if (imgBefore) drawImageCover(ctx, imgBefore, x, y, dividerX - x, h);
  if (imgAfter) drawImageCover(ctx, imgAfter, dividerX, y, x + w - dividerX, h);
  ctx.restore();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(dividerX, y);
  ctx.lineTo(dividerX, y + h);
  ctx.stroke();

  const handleR = w * 0.018;
  ctx.beginPath();
  ctx.arc(dividerX, y + h / 2, handleR, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.fillStyle = '#334155';
  ctx.font = `700 ${handleR}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⇔', dividerX, y + h / 2);

  const tag = (text, tx) => {
    const padX = w * 0.014, padY = w * 0.008;
    ctx.font = `700 ${w * 0.024}px -apple-system, sans-serif`;
    const tw = ctx.measureText(text).width;
    roundedRect(ctx, tx, y + w * 0.02, tw + padX * 2, w * 0.024 + padY * 2, w * 0.008);
    ctx.fillStyle = 'rgba(15,23,42,0.7)';
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, tx + padX, y + w * 0.02 + padY + w * 0.012);
  };
  tag('BEFORE', x + w * 0.02);
  tag('AFTER', x + w - w * 0.02 - 140);
}

// Screenshot on a styled backdrop, optionally inside a device frame, with
// an optional headline above it — the generic "hero shot" layout used for
// product marketing images.
export function drawProductShowcase(ctx, img, { x, y, w, headline, frameId }) {
  let cy = y;
  if (headline) {
    ctx.font = `800 ${w * 0.045}px -apple-system, sans-serif`;
    ctx.fillStyle = '#0F172A';
    ctx.textAlign = 'center';
    ctx.fillText(headline, x + w / 2, cy + w * 0.05);
    ctx.textAlign = 'left';
    cy += w * 0.11;
  }
  if (frameId && frameId !== 'none') {
    const frame = getFrame(frameId);
    const { totalH } = frame.draw(ctx, img, { x, y: cy, w });
    return cy + totalH - y;
  }
  const h = (img.height / img.width) * w;
  roundedRect(ctx, x, cy, w, h, w * 0.02);
  ctx.save(); ctx.clip();
  drawImageCover(ctx, img, x, cy, w, h);
  ctx.restore();
  return cy + h - y;
}

const PREVIEW_FRAME_BY_KIND = { website: 'generic-browser', 'mobile-app': 'iphone', 'landing-page': 'generic-browser' };

export function drawPreviewShowcase(ctx, img, { x, y, w, kind = 'website', headline }) {
  return drawProductShowcase(ctx, img, { x, y, w, headline, frameId: PREVIEW_FRAME_BY_KIND[kind] || 'generic-browser' });
}
