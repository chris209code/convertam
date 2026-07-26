import { getFrame, roundedRect } from './frames';
import { drawTweetCard, drawQuotedTweetCard, drawReplyThreadCard, drawLinkedInPost, drawRedditPost, drawFacebookPost, drawInstagramPost } from './socialCards';
import { drawBeforeAfter, drawProductShowcase, drawPreviewShowcase } from './showcaseLayouts';
import { drawAnnotation, applyBlurRegion } from './annotations';

export const CANVAS_PRESETS = [
  { id: 'auto', label: 'Auto (fit content)' },
  { id: 'social-og', label: 'Social / OG — 1200×630', w: 1200, h: 630 },
  { id: 'square', label: 'Square — 1080×1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait — 1080×1350', w: 1080, h: 1350 },
  { id: 'widescreen', label: 'Widescreen — 1600×900', w: 1600, h: 900 },
];

export const MODES = [
  { id: 'device', label: 'Device & Browser Mockups' },
  { id: 'social', label: 'Social Content' },
  { id: 'showcase', label: 'Showcase' },
];

export const SOCIAL_TYPES = [
  { id: 'tweet', label: 'Tweet Card' },
  { id: 'quoted-tweet', label: 'Quoted Tweet' },
  { id: 'reply-thread', label: 'Reply Thread' },
  { id: 'linkedin', label: 'LinkedIn Post' },
  { id: 'linkedin-carousel', label: 'LinkedIn Carousel' },
  { id: 'reddit', label: 'Reddit Post' },
  { id: 'facebook', label: 'Facebook Post' },
  { id: 'instagram', label: 'Instagram Post' },
];

export const SHOWCASE_TYPES = [
  { id: 'before-after', label: 'Before & After' },
  { id: 'product', label: 'Product Showcase' },
  { id: 'website', label: 'Website Preview' },
  { id: 'mobile-app', label: 'Mobile App Preview' },
  { id: 'landing-page', label: 'Landing Page Showcase' },
];

// Renders the "content" (frame, social card, or showcase layout) onto its
// own trimmed canvas at natural size — a separate stage from the final
// canvas so background/padding/corner-radius/shadow can be applied
// uniformly afterward, regardless of which mode produced the content.
function renderContent({ mode, subType, img, imgB, fields, contentWidth, showcaseFrameId, dividerPct }) {
  const SCRATCH_H = 6000;
  const scratch = document.createElement('canvas');
  scratch.width = contentWidth;
  scratch.height = SCRATCH_H;
  const ctx = scratch.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, contentWidth, SCRATCH_H);

  let h = contentWidth;
  const box = { x: 0, y: 0, w: contentWidth };

  if (mode === 'device') {
    const frame = getFrame(subType);
    h = frame.draw(ctx, img, box).totalH;
  } else if (mode === 'social') {
    switch (subType) {
      case 'tweet': h = drawTweetCard(ctx, img, box, fields); break;
      case 'quoted-tweet': h = drawQuotedTweetCard(ctx, img, box, fields); break;
      case 'reply-thread': h = drawReplyThreadCard(ctx, img, box, fields); break;
      case 'linkedin': h = drawLinkedInPost(ctx, img, box, fields); break;
      case 'linkedin-carousel': h = drawLinkedInPost(ctx, img, box, fields, { carousel: true }); break;
      case 'reddit': h = drawRedditPost(ctx, img, box, fields); break;
      case 'facebook': h = drawFacebookPost(ctx, img, box, fields); break;
      case 'instagram': h = drawInstagramPost(ctx, img, box, fields); break;
      default: h = drawTweetCard(ctx, img, box, fields);
    }
  } else if (mode === 'showcase') {
    if (subType === 'before-after') {
      h = (img.height / img.width) * contentWidth;
      drawBeforeAfter(ctx, img, imgB || img, { x: 0, y: 0, w: contentWidth, h, dividerPct });
    } else if (subType === 'product') {
      h = drawProductShowcase(ctx, img, { x: 0, y: 0, w: contentWidth, headline: fields.headline, frameId: showcaseFrameId });
    } else {
      h = drawPreviewShowcase(ctx, img, { x: 0, y: 0, w: contentWidth, kind: subType, headline: fields.headline });
    }
  }

  h = Math.min(Math.ceil(h), SCRATCH_H);
  const trimmed = document.createElement('canvas');
  trimmed.width = contentWidth;
  trimmed.height = h;
  trimmed.getContext('2d').drawImage(scratch, 0, 0, contentWidth, h, 0, 0, contentWidth, h);
  return { canvas: trimmed, w: contentWidth, h };
}

// The single entry point the workspace calls for both the live preview and
// the final export — same function, so what you see is genuinely what you
// get. `interactive` controls whether selection handles/blur outlines
// (editing aids, never part of a real export) are drawn.
export function composeFinalCanvas({
  mode, subType, img, imgB, fields, contentWidth, showcaseFrameId, dividerPct,
  bgColor, bgGradientTo, padding, cornerRadius, shadow,
  canvasPresetId, annotations, selectedId, interactive = false,
}) {
  const content = renderContent({ mode, subType, img, imgB, fields, contentWidth, showcaseFrameId, dividerPct });
  const preset = CANVAS_PRESETS.find((p) => p.id === canvasPresetId) || CANVAS_PRESETS[0];

  let finalW, finalH, scale;
  if (preset.id === 'auto') {
    finalW = content.w + padding * 2;
    finalH = content.h + padding * 2;
    scale = 1;
  } else {
    finalW = preset.w;
    finalH = preset.h;
    const availW = Math.max(10, finalW - padding * 2);
    const availH = Math.max(10, finalH - padding * 2);
    scale = Math.min(availW / content.w, availH / content.h);
  }
  const drawW = content.w * scale, drawH = content.h * scale;
  const contentX = (finalW - drawW) / 2;
  const contentY = (finalH - drawH) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = finalW; canvas.height = finalH;
  const ctx = canvas.getContext('2d');

  if (bgGradientTo) {
    const grad = ctx.createLinearGradient(0, 0, finalW, finalH);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, bgGradientTo);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = bgColor;
  }
  ctx.fillRect(0, 0, finalW, finalH);

  const radius = cornerRadius * scale;
  if (shadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(15, 23, 42, 0.32)';
    ctx.shadowBlur = finalW * 0.025;
    ctx.shadowOffsetY = finalW * 0.012;
    roundedRect(ctx, contentX, contentY, drawW, drawH, radius);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  roundedRect(ctx, contentX, contentY, drawW, drawH, radius);
  ctx.clip();
  ctx.drawImage(content.canvas, contentX, contentY, drawW, drawH);
  ctx.restore();

  annotations.filter((a) => a.type === 'blur').forEach((a) => applyBlurRegion(ctx, a.x, a.y, a.w, a.h));
  annotations.forEach((a) => {
    if (a.type !== 'blur') drawAnnotation(ctx, a, { selected: a.id === selectedId, interactive });
  });

  return canvas;
}
