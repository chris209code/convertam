import { getFrame, roundedRect, FRAME_TYPES } from './frames';
import { drawTweetCard, drawQuotedTweetCard, drawReplyThreadCard, drawLinkedInPost, drawRedditPost, drawFacebookPost, drawInstagramPost } from './socialCards';
import { drawBeforeAfter, drawProductShowcase } from './showcaseLayouts';
import { drawAnnotation, applyBlurRegion } from './annotations';

export const CANVAS_PRESETS = [
  { id: 'auto', label: 'Auto (fit content)' },
  { id: 'social-og', label: 'Social / OG — 1200×630', w: 1200, h: 630 },
  { id: 'square', label: 'Square — 1080×1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait — 1080×1350', w: 1080, h: 1350 },
  { id: 'widescreen', label: 'Widescreen — 1600×900', w: 1600, h: 900 },
];

// Website Showcase and App Showcase are two entry doors onto the same frame
// engine (frames.js) — the only difference is which frame ids each door
// offers. Desktop Monitor appears in both lists on purpose: it's a valid
// backdrop for a website or a native desktop app.
export const WEBSITE_FRAME_IDS = ['generic-browser', 'chrome', 'safari', 'edge', 'windows-laptop', 'macbook', 'desktop-monitor'];
export const APP_FRAME_IDS = ['iphone', 'android', 'tablet', 'desktop-monitor'];

export function framesFor(workspace) {
  const ids = workspace === 'app' ? APP_FRAME_IDS : WEBSITE_FRAME_IDS;
  return FRAME_TYPES.filter((f) => ids.includes(f.id));
}

export const SOCIAL_TYPES = [
  { id: 'tweet', label: 'Post', platform: 'x' },
  { id: 'quoted-tweet', label: 'Quote Post', platform: 'x' },
  { id: 'reply-thread', label: 'Thread', platform: 'x' },
  { id: 'linkedin', label: 'Post', platform: 'linkedin' },
  { id: 'linkedin-carousel', label: 'Carousel', platform: 'linkedin' },
  { id: 'reddit', label: 'Reddit Post', platform: 'reddit' },
  { id: 'facebook', label: 'Facebook Post', platform: 'facebook' },
  { id: 'instagram', label: 'Instagram Post', platform: 'instagram' },
];

// X and LinkedIn are the two platforms this spec calls for at launch; Reddit,
// Facebook and Instagram already existed in this codebase and work fine, so
// they stay available rather than being thrown away — they just aren't the
// two featured tabs. Adding a real new platform later means one more entry
// here plus a draw function, not a new workspace.
export const SOCIAL_PLATFORMS = [
  { id: 'x', label: 'X / Twitter' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'reddit', label: 'Reddit' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
];

export function socialTypesFor(platform) {
  return SOCIAL_TYPES.filter((t) => t.platform === platform);
}

function renderDeviceContent(ctx, img, { contentWidth, subType, headline }) {
  return drawProductShowcase(ctx, img, { x: 0, y: 0, w: contentWidth, headline, frameId: subType });
}

function renderSocialContent(ctx, img, { contentWidth, subType, fields }) {
  const box = { x: 0, y: 0, w: contentWidth };
  switch (subType) {
    case 'tweet': return drawTweetCard(ctx, img, box, fields);
    case 'quoted-tweet': return drawQuotedTweetCard(ctx, img, box, fields);
    case 'reply-thread': return drawReplyThreadCard(ctx, img, box, fields);
    case 'linkedin': return drawLinkedInPost(ctx, img, box, fields);
    case 'linkedin-carousel': return drawLinkedInPost(ctx, img, box, fields, { carousel: true });
    case 'reddit': return drawRedditPost(ctx, img, box, fields);
    case 'facebook': return drawFacebookPost(ctx, img, box, fields);
    case 'instagram': return drawInstagramPost(ctx, img, box, fields);
    default: return drawTweetCard(ctx, img, box, fields);
  }
}

// Renders the "content" (frame, social card, or before/after layout) onto
// its own trimmed canvas at natural size — a separate stage from the final
// canvas so background/padding/corner-radius/shadow can be applied
// uniformly afterward, regardless of which workspace produced the content.
// Just Annotate never reaches this — see composeFinalCanvas — because it
// has no chrome to compose in the first place.
function renderContent({ workspace, subType, img, imgB, fields, contentWidth, headline, dividerPct }) {
  const SCRATCH_H = 6000;
  const scratch = document.createElement('canvas');
  scratch.width = contentWidth;
  scratch.height = SCRATCH_H;
  const ctx = scratch.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, contentWidth, SCRATCH_H);

  let h = contentWidth;

  if (workspace === 'website' || workspace === 'app') {
    h = renderDeviceContent(ctx, img, { contentWidth, subType, headline });
  } else if (workspace === 'social') {
    h = renderSocialContent(ctx, img, { contentWidth, subType, fields });
  } else if (workspace === 'before-after') {
    h = (img.height / img.width) * contentWidth;
    drawBeforeAfter(ctx, img, imgB || img, { x: 0, y: 0, w: contentWidth, h, dividerPct });
  }

  h = Math.min(Math.ceil(h), SCRATCH_H);
  const trimmed = document.createElement('canvas');
  trimmed.width = contentWidth;
  trimmed.height = h;
  trimmed.getContext('2d').drawImage(scratch, 0, 0, contentWidth, h, 0, 0, contentWidth, h);
  return { canvas: trimmed, w: contentWidth, h };
}

function drawBrandLogo(ctx, logoImg, finalW, finalH) {
  const maxW = Math.min(finalW * 0.14, 150);
  const scale = maxW / logoImg.width;
  const w = logoImg.width * scale, h = logoImg.height * scale;
  const margin = finalW * 0.03;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.drawImage(logoImg, finalW - w - margin, finalH - h - margin, w, h);
  ctx.restore();
}

// The single entry point the workspace calls for both the live preview and
// the final export — same function, so what you see is genuinely what you
// get. `interactive` controls whether selection handles/blur outlines
// (editing aids, never part of a real export) are drawn.
export function composeFinalCanvas({
  workspace, subType, img, imgB, fields, contentWidth, headline, dividerPct,
  bgColor, bgGradientTo, padding, cornerRadius, shadow,
  canvasPresetId, annotations, selectedId, interactive = false,
  brandLogoImg, showBrandLogo,
}) {
  // Just Annotate has no framing decisions at all — the output is the
  // original screenshot, at its own size, with markup on top. Routing it
  // through the same background/padding/shadow pipeline as every other
  // workspace would mean it could never actually have "no background," so
  // it gets its own short-circuit here instead.
  if (workspace === 'annotate') {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    annotations.filter((a) => a.type === 'blur').forEach((a) => applyBlurRegion(ctx, a.x, a.y, a.w, a.h));
    annotations.forEach((a) => {
      if (a.type !== 'blur') drawAnnotation(ctx, a, { selected: a.id === selectedId, interactive });
    });
    return canvas;
  }

  const content = renderContent({ workspace, subType, img, imgB, fields, contentWidth, headline, dividerPct });
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

  if (showBrandLogo && brandLogoImg) drawBrandLogo(ctx, brandLogoImg, finalW, finalH);

  annotations.filter((a) => a.type === 'blur').forEach((a) => applyBlurRegion(ctx, a.x, a.y, a.w, a.h));
  annotations.forEach((a) => {
    if (a.type !== 'blur') drawAnnotation(ctx, a, { selected: a.id === selectedId, interactive });
  });

  return canvas;
}
