// One canvas-drawing function, used identically for the live on-screen
// preview (driven by requestAnimationFrame while the user's audio plays)
// and for MediaRecorder capture during export — this is what guarantees the
// exported video never looks different from what the preview showed (spec
// §35's "do not create a preview that behaves differently from export").
//
// V1 P0 scope only: one fixed default branded background, one fixed
// caption style, one fixed aspect ratio — the visual/style/aspect-ratio
// pickers described in the spec are explicitly P1 (see the approved plan).

import { drawWaveform } from './waveform';

export const COMPOSE_WIDTH = 1080;
export const COMPOSE_HEIGHT = 1080; // 1:1 — legible on every platform without letterboxing, a reasonable single default for V1

const BRAND_GRADIENT_FROM = '#0891B2';
const BRAND_GRADIENT_TO = '#0E7490';

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

// { ctx, peaks, progress (0-1, for the waveform's played/unplayed split),
//   captionText (current caption line, or '' for none) }
export function drawComposeFrame(ctx, { peaks, progress = 0, captionText = '' }) {
  const w = COMPOSE_WIDTH;
  const h = COMPOSE_HEIGHT;

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, BRAND_GRADIENT_FROM);
  gradient.addColorStop(1, BRAND_GRADIENT_TO);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  // "Convertam" wordmark, small and unobtrusive — the "Default Convertam
  // Visual: Clean branded background" option from spec §25.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '600 28px "IBM Plex Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Convertam', w / 2, 90);

  if (peaks?.length) {
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
