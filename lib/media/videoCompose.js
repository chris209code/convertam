// One canvas-drawing function, used identically for the live static preview
// shown in the background picker and for MediaRecorder capture during
// export — this is what guarantees the exported video never looks
// different from what the preview showed (spec §35's "do not create a
// preview that behaves differently from export").

import { drawWaveform } from './waveform';

// 720x720 rather than a "true" 1080x1080 — the encode cost of the
// Finalizing MP4 step (a full software H.264 re-encode via ffmpeg.wasm's
// single-threaded core, since MediaRecorder's native webm codecs aren't
// broadly MP4-compatible — see ffmpegClient.js's remuxToMp4) scales with
// pixel count, and 1080x1080 made that step so slow it looked hung on
// anything but very short clips. 720x720 is still sharp on every platform
// this renders for (social feeds, WhatsApp, etc.) while cutting the
// encoder's per-frame pixel workload by more than half.
export const COMPOSE_WIDTH = 720;
export const COMPOSE_HEIGHT = 720; // 1:1 — legible on every platform without letterboxing, a reasonable single default for V1

const BRAND_GRADIENT_FROM = '#0891B2';
const BRAND_GRADIENT_TO = '#0E7490';

export const DEFAULT_BACKGROUND = { type: 'default' }; // { type: 'default'|'solid'|'image'|'none', colors?: [string,string], image?: CanvasImageSource, fit?: 'cover'|'contain', overlay?: boolean }

function wrapCaptionText(ctx, text, maxWidth) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// Draws image so it fully covers a w x h box, cropping overflow, centered —
// the standard CSS object-fit:cover behavior, hand-rolled for canvas.
function drawImageCover(ctx, image, w, h) {
  const iw = image.width || image.naturalWidth;
  const ih = image.height || image.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

// object-fit:contain — the whole image fits inside the box, letterboxed on
// a dark fill so it never looks like a rendering bug.
function drawImageContain(ctx, image, w, h) {
  const iw = image.width || image.naturalWidth;
  const ih = image.height || image.naturalHeight;
  if (!iw || !ih) return;
  ctx.fillStyle = '#0B1220';
  ctx.fillRect(0, 0, w, h);
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawBackground(ctx, w, h, background) {
  const bg = background || DEFAULT_BACKGROUND;
  if (bg.type === 'image' && bg.image) {
    if (bg.fit === 'contain') drawImageContain(ctx, bg.image, w, h);
    else drawImageCover(ctx, bg.image, w, h);
    if (bg.overlay) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, w, h);
    }
    return;
  }
  if (bg.type === 'solid') {
    const [from, to] = bg.colors?.length ? bg.colors : [BRAND_GRADIENT_FROM, BRAND_GRADIENT_TO];
    if (from === to) {
      ctx.fillStyle = from;
      ctx.fillRect(0, 0, w, h);
    } else {
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, from);
      gradient.addColorStop(1, to);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);
    }
    return;
  }
  if (bg.type === 'none') {
    ctx.fillStyle = '#0B1220';
    ctx.fillRect(0, 0, w, h);
    return;
  }
  // 'default' — the original clean branded gradient
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, BRAND_GRADIENT_FROM);
  gradient.addColorStop(1, BRAND_GRADIENT_TO);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 28px "IBM Plex Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Convertam', w / 2, 90);
}

// { ctx, peaks, progress (0-1, for the waveform's played/unplayed split),
//   captionText (current caption line, or '' for none), background (see
//   DEFAULT_BACKGROUND's shape above), showWaveform (default true) }
export function drawComposeFrame(ctx, { peaks, progress = 0, captionText = '', background, showWaveform = true }) {
  const w = COMPOSE_WIDTH;
  const h = COMPOSE_HEIGHT;

  drawBackground(ctx, w, h, background);

  if (showWaveform && peaks?.length) {
    drawWaveform(ctx, peaks, {
      x: w * 0.1, y: h * 0.42, width: w * 0.8, height: h * 0.18,
      color: '#FFFFFF', progress,
    });
  }

  if (captionText) {
    ctx.font = '600 44px "IBM Plex Sans", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const maxWidth = w * 0.82;
    const lines = wrapCaptionText(ctx, captionText, maxWidth).slice(0, 3);
    const lineHeight = 56;
    const startY = h * 0.72 - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      const y = startY + i * lineHeight;
      // Soft shadow for legibility over the gradient/waveform, not a full
      // background box — matches DEFAULT_CAPTION_STYLE's outline-only look
      // in captions.js for visual consistency between the two caption
      // surfaces (video burn-in and this audiogram render).
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 8;
      ctx.fillText(line, w / 2, y, maxWidth);
      ctx.shadowBlur = 0;
    });
  }
}
