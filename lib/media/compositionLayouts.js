// Composition layout math + the one canvas-drawing function shared by
// live preview and MediaRecorder export capture — the same "preview can
// never drift from export" principle videoCompose.js already established
// for the audiogram pipeline (spec's own requirement), generalized here to
// cover two video sources instead of one audio waveform.
//
// Three layouts, matching exactly what was asked for: split-lr / split-tb
// (two-video split screen) and pip (main + overlay / video-call layout).
// Deliberately not an open-ended set of arbitrary layouts.

export const COMPOSE_WIDTH = 1280;
export const COMPOSE_HEIGHT = 720;

export const CORNER_PRESETS = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
};

// Shared by computeLayoutRects and pipPositionFromPoint so the forward
// (position -> pixels) and inverse (pixels -> position) math can never
// drift apart — the single source of truth the spec asks for.
function getPipRange(canvasWidth, canvasHeight, pipSizeRatio) {
  const pipW = canvasWidth * pipSizeRatio;
  const pipH = (canvasHeight * pipSizeRatio * canvasHeight) / canvasWidth; // keep same aspect as canvas
  const margin = canvasWidth * 0.03;
  const rangeX = Math.max(0, canvasWidth - pipW - margin * 2);
  const rangeY = Math.max(0, canvasHeight - pipH - margin * 2);
  return { pipW, pipH, margin, rangeX, rangeY };
}

// Returns the destination rect (in canvas pixels) for each track given the
// current layout — the single source of truth both drawing and the
// drag-to-reposition UI read from, so a dragged overlay always ends up
// exactly where the export will actually draw it.
export function computeLayoutRects(timeline, canvasWidth = COMPOSE_WIDTH, canvasHeight = COMPOSE_HEIGHT) {
  const { compositionMode, dividerRatio, pipCorner, pipPosition, pipSizeRatio } = timeline;

  if (compositionMode === 'split-lr') {
    const splitX = canvasWidth * dividerRatio;
    return {
      main: { x: 0, y: 0, w: splitX, h: canvasHeight },
      overlay: { x: splitX, y: 0, w: canvasWidth - splitX, h: canvasHeight },
    };
  }
  if (compositionMode === 'split-tb') {
    const splitY = canvasHeight * dividerRatio;
    return {
      main: { x: 0, y: 0, w: canvasWidth, h: splitY },
      overlay: { x: 0, y: splitY, w: canvasWidth, h: canvasHeight - splitY },
    };
  }
  if (compositionMode === 'pip') {
    const { pipW, pipH, margin, rangeX, rangeY } = getPipRange(canvasWidth, canvasHeight, pipSizeRatio);
    // pipPosition is a 0..1 fraction of the valid drag range (not raw
    // pixels), so it stays meaningful across canvas-size and pip-size
    // changes and can never place the overlay outside the composition —
    // clamped again here as a last line of defense against stale state.
    const pos = pipPosition || CORNER_PRESETS[pipCorner] || CORNER_PRESETS['bottom-right'];
    const x = margin + Math.max(0, Math.min(1, pos.x)) * rangeX;
    const y = margin + Math.max(0, Math.min(1, pos.y)) * rangeY;
    return {
      main: { x: 0, y: 0, w: canvasWidth, h: canvasHeight },
      overlay: { x, y, w: pipW, h: pipH },
    };
  }
  // 'single' — only a main track, no overlay.
  return { main: { x: 0, y: 0, w: canvasWidth, h: canvasHeight }, overlay: null };
}

// Inverse of the pip branch above — converts a canvas-pixel point (where
// the user is dragging, minus their initial grab offset within the
// overlay box) back into the same 0..1 pipPosition fraction, clamped so a
// drag can never push the overlay outside the composition. Used only by
// the free-drag UI; computeLayoutRects is what actually places the pixel
// during both live preview and export, so preview and export always agree.
export function pipPositionFromPoint(canvasWidth, canvasHeight, pipSizeRatio, pointX, pointY, grabOffset = { dx: 0, dy: 0 }) {
  const { margin, rangeX, rangeY } = getPipRange(canvasWidth, canvasHeight, pipSizeRatio);
  const rectX = pointX - grabOffset.dx;
  const rectY = pointY - grabOffset.dy;
  const fx = rangeX > 0 ? (rectX - margin) / rangeX : 0;
  const fy = rangeY > 0 ? (rectY - margin) / rangeY : 0;
  return { x: Math.max(0, Math.min(1, fx)), y: Math.max(0, Math.min(1, fy)) };
}

// Works for a <video> (videoWidth/videoHeight) or a static <img>
// (naturalWidth/naturalHeight) — an image overlay reuses this same "cover"
// drawing path rather than a parallel implementation.
function getMediaSize(el) {
  if (el.videoWidth != null) return { w: el.videoWidth, h: el.videoHeight };
  if (el.naturalWidth != null) return { w: el.naturalWidth, h: el.naturalHeight };
  return { w: el.width, h: el.height };
}

// Draws a video or image element into a rect using "cover" fit (fills the
// rect, cropping overflow) so mismatched aspect ratios never distort — the
// spec's explicit "never distort" requirement for aspect-ratio handling.
function drawCover(ctx, mediaEl, rect) {
  if (!mediaEl) return;
  const { w: mediaW, h: mediaH } = getMediaSize(mediaEl);
  if (!mediaW || !mediaH) return;
  const srcRatio = mediaW / mediaH;
  const dstRatio = rect.w / rect.h;
  let sx, sy, sw, sh;
  if (srcRatio > dstRatio) {
    sh = mediaH;
    sw = sh * dstRatio;
    sx = (mediaW - sw) / 2;
    sy = 0;
  } else {
    sw = mediaW;
    sh = sw / dstRatio;
    sx = 0;
    sy = (mediaH - sh) / 2;
  }
  ctx.drawImage(mediaEl, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
}

// "contain" fit — the whole frame is always visible, never cropped, at the
// cost of a letterboxed gap on two sides when the source aspect ratio
// doesn't match the rect. Callers are responsible for filling that gap
// (backgroundFill) before this draws, since this only ever draws the media
// itself, never a fill color, to stay consistent with drawCover's contract.
function drawContain(ctx, mediaEl, rect) {
  if (!mediaEl) return;
  const { w: mediaW, h: mediaH } = getMediaSize(mediaEl);
  if (!mediaW || !mediaH) return;
  const scale = Math.min(rect.w / mediaW, rect.h / mediaH);
  const dw = mediaW * scale;
  const dh = mediaH * scale;
  const dx = rect.x + (rect.w - dw) / 2;
  const dy = rect.y + (rect.h - dh) / 2;
  ctx.drawImage(mediaEl, dx, dy, dw, dh);
}

// { ctx, timeline, mainEl, overlayEl, rounded, border } — mainEl is always
// a <video>; overlayEl may be a <video> or a static <img> (image overlay).
export function drawCompositionFrame(ctx, { timeline, mainEl, overlayEl, rounded = false, border = false }) {
  const w = COMPOSE_WIDTH;
  const h = COMPOSE_HEIGHT;
  const bg = timeline.backgroundFill || '#0F172A';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const drawInto = timeline.fitMode === 'contain' ? drawContain : drawCover;
  // 'contain' can leave a letterbox gap inside a rect that a track drawn
  // earlier (e.g. a full-canvas main track in pip mode) already painted
  // over — filling each rect with backgroundFill immediately before
  // drawing into it keeps the gap a clean, predictable solid color rather
  // than "whatever happened to already be there."
  function fillRectBg(rect) {
    if (timeline.fitMode !== 'contain') return;
    ctx.fillStyle = bg;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  const rects = computeLayoutRects(timeline, w, h);
  if (mainEl) { fillRectBg(rects.main); drawInto(ctx, mainEl, rects.main); }

  if (rects.overlay && overlayEl) {
    const r = rects.overlay;
    if (timeline.compositionMode === 'pip' && rounded) {
      ctx.save();
      const radius = Math.min(r.w, r.h) * 0.06;
      ctx.beginPath();
      ctx.moveTo(r.x + radius, r.y);
      ctx.arcTo(r.x + r.w, r.y, r.x + r.w, r.y + r.h, radius);
      ctx.arcTo(r.x + r.w, r.y + r.h, r.x, r.y + r.h, radius);
      ctx.arcTo(r.x, r.y + r.h, r.x, r.y, radius);
      ctx.arcTo(r.x, r.y, r.x + r.w, r.y, radius);
      ctx.closePath();
      ctx.clip();
      fillRectBg(r);
      drawInto(ctx, overlayEl, r);
      ctx.restore();
    } else {
      fillRectBg(r);
      drawInto(ctx, overlayEl, r);
    }
    if (timeline.compositionMode === 'pip' && border) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    if (timeline.compositionMode !== 'pip') {
      // A thin divider line at the split boundary makes the composition
      // read clearly as two intentional halves, not a rendering glitch.
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      if (timeline.compositionMode === 'split-lr') ctx.fillRect(rects.overlay.x - 1, 0, 2, h);
      else ctx.fillRect(0, rects.overlay.y - 1, w, 2);
    }
  }
}
