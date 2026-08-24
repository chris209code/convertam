// Composition layout math + the one canvas-drawing function shared by
// live preview and MediaRecorder export capture — the same "preview can
// never drift from export" principle videoCompose.js already established
// for the audiogram pipeline (spec's own requirement), generalized here to
// cover two video sources instead of one audio waveform.
//
// Three layouts, matching exactly what was asked for: split-lr / split-tb
// (two-video split screen) and pip (main + overlay / video-call layout).
// Deliberately not an open-ended set of arbitrary layouts.

import { getPersonMaskCanvas } from './segmentation';

export const COMPOSE_WIDTH = 1280;
export const COMPOSE_HEIGHT = 720;

// Output/canvas shape — height held at 720px across all three so switching
// between them doesn't also change render resolution, only orientation.
// 'landscape' keeps the original fixed 1280x720 default above; the other
// two are what let a single main video (no overlay at all) be reframed for
// vertical/square platforms (TikTok, Reels, Shorts, IG feed) via the same
// canvas-composition pipeline used for split-screen/PIP.
export const FRAME_ASPECTS = {
  landscape: { width: 1280, height: 720, label: 'Landscape (16:9)' },
  square: { width: 720, height: 720, label: 'Square (1:1)' },
  vertical: { width: 720, height: 1280, label: 'Vertical (9:16)' },
};

// '720p' is the unscaled baseline matching FRAME_ASPECTS' own numbers
// above (landscape's 720px height, etc) — omitting `resolution` (every
// existing caller, all live preview) keeps that exact baseline size
// unchanged. Export passes the timeline's own exportResolution to scale
// up/down from there. Rounded to even pixel counts, since odd dimensions
// can trip up H.264 encoders.
const RESOLUTION_SCALE = { '480p': 480 / 720, '720p': 1, '1080p': 1080 / 720 };
export function getComposeSize(frameAspect, resolution = '720p') {
  const base = FRAME_ASPECTS[frameAspect] || FRAME_ASPECTS.landscape;
  const scale = RESOLUTION_SCALE[resolution] ?? 1;
  return {
    width: Math.max(2, Math.round((base.width * scale) / 2) * 2),
    height: Math.max(2, Math.round((base.height * scale) / 2) * 2),
  };
}

export const CORNER_PRESETS = {
  'top-left': { x: 0, y: 0 },
  'top-right': { x: 1, y: 0 },
  'bottom-left': { x: 0, y: 1 },
  'bottom-right': { x: 1, y: 1 },
};

// Shared by computeLayoutRects and pipPositionFromPoint so the forward
// (position -> pixels) and inverse (pixels -> position) math can never
// drift apart — the single source of truth the spec asks for.
export function getPipRange(canvasWidth, canvasHeight, pipSizeRatio) {
  const pipW = canvasWidth * pipSizeRatio;
  const pipH = canvasHeight * pipSizeRatio; // keep same aspect as canvas (pipW/pipH === canvasWidth/canvasHeight)
  const margin = canvasWidth * 0.03;
  const rangeX = Math.max(0, canvasWidth - pipW - margin * 2);
  const rangeY = Math.max(0, canvasHeight - pipH - margin * 2);
  return { pipW, pipH, margin, rangeX, rangeY };
}

// Returns the destination rect (in canvas pixels) for the main track and
// for EACH overlay track (timeline.overlayTracks, keyed by track id) given
// their individual layouts — the single source of truth both drawing and
// the drag-to-reposition UI read from, so a dragged overlay always ends up
// exactly where the export will actually draw it.
//
// split-lr/split-tb only take effect when there's exactly one overlay
// track — with two or more, a 2-way split has no well-defined meaning, so
// every track falls back to independent pip placement (which is also what
// a multi-participant video-call layout wants: several independently
// positioned/sized tiles over the main track, not a forced N-way split).
export function computeLayoutRects(timeline, canvasWidth = COMPOSE_WIDTH, canvasHeight = COMPOSE_HEIGHT) {
  const overlayTracks = timeline.overlayTracks || [];
  const overlays = {};

  if (overlayTracks.length === 1 && (overlayTracks[0].mode === 'split-lr' || overlayTracks[0].mode === 'split-tb')) {
    const t = overlayTracks[0];
    if (t.mode === 'split-lr') {
      const splitX = canvasWidth * t.dividerRatio;
      overlays[t.id] = { x: splitX, y: 0, w: canvasWidth - splitX, h: canvasHeight };
      return { main: { x: 0, y: 0, w: splitX, h: canvasHeight }, overlays };
    }
    const splitY = canvasHeight * t.dividerRatio;
    overlays[t.id] = { x: 0, y: splitY, w: canvasWidth, h: canvasHeight - splitY };
    return { main: { x: 0, y: 0, w: canvasWidth, h: splitY }, overlays };
  }

  for (const t of overlayTracks) {
    const { pipW, pipH, margin, rangeX, rangeY } = getPipRange(canvasWidth, canvasHeight, t.pipSizeRatio);
    // pipPosition is a 0..1 fraction of the valid drag range (not raw
    // pixels), so it stays meaningful across canvas-size and pip-size
    // changes and can never place the overlay outside the composition —
    // clamped again here as a last line of defense against stale state.
    const pos = t.pipPosition || CORNER_PRESETS[t.pipCorner] || CORNER_PRESETS['bottom-right'];
    const x = margin + Math.max(0, Math.min(1, pos.x)) * rangeX;
    const y = margin + Math.max(0, Math.min(1, pos.y)) * rangeY;
    overlays[t.id] = { x, y, w: pipW, h: pipH };
  }
  return { main: { x: 0, y: 0, w: canvasWidth, h: canvasHeight }, overlays };
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
// cropFocus (0..1, default dead-center) shifts WHICH part of an oversized
// source survives the crop — e.g. keeping a speaker's face in frame when
// reframing a 16:9 interview into 9:16 instead of always cropping to center.
// zoom (>=1, default 1) crops in tighter than the minimum needed to fill
// the rect, still centered on the same cropFocus point — combined, these
// two are the whole "manual crop" control: pan via cropFocus, tighten via
// zoom. Computing sx/sy from cropFocus on BOTH axes (rather than only
// whichever axis the base cover-crop actually clips) also means panning
// works even at zoom=1 once the OTHER axis has room, which the previous
// single-axis version couldn't do.
export function drawCover(ctx, mediaEl, rect, cropFocus = { x: 0.5, y: 0.5 }, zoom = 1) {
  if (!mediaEl) return;
  const { w: mediaW, h: mediaH } = getMediaSize(mediaEl);
  if (!mediaW || !mediaH) return;
  const srcRatio = mediaW / mediaH;
  const dstRatio = rect.w / rect.h;
  let sw, sh;
  if (srcRatio > dstRatio) {
    sh = mediaH;
    sw = sh * dstRatio;
  } else {
    sw = mediaW;
    sh = sw / dstRatio;
  }
  const z = Math.max(1, zoom || 1);
  sw = Math.min(mediaW, sw / z);
  sh = Math.min(mediaH, sh / z);
  const sx = (mediaW - sw) * cropFocus.x;
  const sy = (mediaH - sh) * cropFocus.y;
  ctx.drawImage(mediaEl, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
}

// ---- Person cutout: automatic background removal on a pip overlay's own
// video, via lib/media/segmentation.js. Produces a same-size canvas (the
// overlay video's own color pixels, with the segmenter's person-confidence
// mask as ALPHA) that drawCover then treats exactly like any other
// video/canvas source — the cover-crop-into-a-pip-rect math is completely
// unaware anything ML-driven happened upstream. ----

// Blurring the ALPHA channel is what "feathers" the cutout edge — canvas
// filter blur affects RGBA uniformly, and since the mask's own RGB is flat
// white (see segmentation.js), only the alpha's softness is visually
// meaningful. `feather` is 0..1 (the panel's Edge softness slider); scaled
// by the media's own width so it reads the same regardless of source
// resolution.
export function buildCutoutCanvas(mediaEl, maskCanvas, feather) {
  const { w, h } = getMediaSize(mediaEl);
  if (!w || !h) return null;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  if (feather > 0) octx.filter = `blur(${Math.max(0, feather) * w * 0.02}px)`;
  octx.drawImage(maskCanvas, 0, 0, w, h);
  octx.filter = 'none';
  // 'source-in': keeps the NEW draw's color only where the EXISTING
  // (mask) content is opaque, taking the mask's own alpha — exactly
  // "video pixels, masked by the person-confidence alpha".
  octx.globalCompositeOperation = 'source-in';
  octx.drawImage(mediaEl, 0, 0, w, h);
  return out;
}

// Draws a cutout-enabled overlay's masked person into `rect`, with an
// optional drop shadow and/or a colored outline glow (a soft
// shadowBlur-based glow along the silhouette's own edge, not literal
// contour tracing — far cheaper and reads clearly at normal preview/export
// sizes). Returns false (draw nothing — caller falls back to the plain,
// unmasked clip) when no mask is available yet (segmenter still loading,
// or this frame's inference failed) so a cutout never flashes an
// un-cut-out frame; it just holds the LAST successfully masked frame via
// the caller's own layer.lastCutoutCanvas cache instead.
function drawCutoutOverlay(ctx, cutoutCanvas, rect, { shadow, outline, outlineColor } = {}) {
  if (!cutoutCanvas) return false;
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = rect.w * 0.05;
    ctx.shadowOffsetY = rect.h * 0.025;
    drawCover(ctx, cutoutCanvas, rect, { x: 0.5, y: 0.5 }, 1);
    ctx.shadowOffsetY = 0;
  }
  if (outline) {
    ctx.shadowColor = outlineColor || '#FFFFFF';
    ctx.shadowBlur = Math.max(3, rect.w * 0.02);
    drawCover(ctx, cutoutCanvas, rect, { x: 0.5, y: 0.5 }, 1);
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  drawCover(ctx, cutoutCanvas, rect, { x: 0.5, y: 0.5 }, 1);
  ctx.restore();
  return true;
}

// Builds a canvas 2D `ctx.filter` CSS filter string from a clip's filters
// object — the same property canvas preview and (via an offscreen canvas
// pass, see timelineRender.js) export both read, so a filter never looks
// different in the exported file than it did in the preview. 1 = neutral
// for brightness/contrast/saturate (matches the CSS filter functions'
// own neutral value); grayscale is 0..1 intensity, same as CSS.
export function buildFilterString(filters) {
  if (!filters) return 'none';
  const { brightness = 1, contrast = 1, saturation = 1, grayscale = 0 } = filters;
  if (brightness === 1 && contrast === 1 && saturation === 1 && grayscale === 0) return 'none';
  return `brightness(${brightness}) contrast(${contrast}) saturate(${saturation}) grayscale(${grayscale})`;
}

// Shared by preview and export so a fade never looks different between the
// two — elapsedInClip and the clip's fadeIn/fadeOut/sourceStart/sourceEnd
// are all in the same "seconds within this clip's own source range" units
// (see timeline.js's setClipFade), so this needs no other timeline context.
export function getFadeOpacity(clip, elapsedInClip) {
  if (!clip) return 1;
  const { fadeIn = 0, fadeOut = 0, sourceStart = 0, sourceEnd = 0 } = clip;
  const dur = Math.max(0.001, sourceEnd - sourceStart);
  let opacity = 1;
  if (fadeIn > 0 && elapsedInClip < fadeIn) opacity = Math.min(opacity, elapsedInClip / fadeIn);
  if (fadeOut > 0 && elapsedInClip > dur - fadeOut) opacity = Math.min(opacity, (dur - elapsedInClip) / fadeOut);
  return Math.max(0, Math.min(1, opacity));
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

// { ctx, timeline, mainEl, mainClip, mainOpacity, crossfadeEl, crossfadeClip,
// crossfadeOpacity, overlayLayers, rounded, border, canvasWidth,
// canvasHeight }. mainEl is always a <video>. crossfadeEl/crossfadeClip/
// crossfadeOpacity (0..1, default 0) draw the NEXT main-track clip into the
// same rect as mainEl, on top of it — the visual half of a 'crossfade'
// transition (see timeline.js's transitionOut): callers hold crossfadeEl
// frozen on its own first frame (a genuinely overlapping, continuously
// advancing crossfade would need the timeline's own duration math to know
// two clips are simultaneously active, which this deliberately doesn't
// change) while crossfadeOpacity ramps 0->1, so both clips are visibly
// blended without any risk of the incoming clip jumping/repeating once its
// own official slot begins. overlayLayers is an array of { trackId, el,
// clip, opacity } — el may be a <video> or a static <img> (image overlay);
// clip supplies per-clip filters and crop focus; opacity (0..1, default 1)
// is the fade multiplier from getFadeOpacity(). Callers compute each
// layer's opacity once and pass the numbers through rather than this
// function reaching back into timeline state, keeping this module's only
// dependency on a clip shape minimal. overlayLayers are drawn in array
// order (bottom to top), which callers should keep aligned with
// timeline.overlayTracks' own order.
// backgroundImageEl is an optional <img> for backgroundType 'image' — the
// caller manages loading it (same division of responsibility as
// overlayLayers' elements). Re-drawn every frame like everything else here,
// which is what lets 'blur' mode track the main clip's CURRENT frame rather
// than a stale snapshot.
export function drawCompositionFrame(ctx, { timeline, mainEl, mainClip, mainOpacity = 1, crossfadeEl, crossfadeClip, crossfadeOpacity = 0, transitionType = 'crossfade', overlayLayers = [], backgroundImageEl, rounded = false, border = false, canvasWidth, canvasHeight }) {
  const { width: w, height: h } = canvasWidth && canvasHeight ? { width: canvasWidth, height: canvasHeight } : getComposeSize(timeline.frameAspect);
  const bg = timeline.backgroundFill || '#0F172A';
  const backgroundType = timeline.backgroundType || 'solid';
  if (backgroundType === 'gradient' && timeline.backgroundGradient) {
    const { from, to, angle = 135 } = timeline.backgroundGradient;
    const rad = (angle * Math.PI) / 180;
    const x1 = w / 2 - (Math.cos(rad) * w) / 2, y1 = h / 2 - (Math.sin(rad) * h) / 2;
    const x2 = w / 2 + (Math.cos(rad) * w) / 2, y2 = h / 2 + (Math.sin(rad) * h) / 2;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, from || bg);
    grad.addColorStop(1, to || bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else if (backgroundType === 'blur' && mainEl) {
    // A blurred, overscanned (cover-fit + a small margin, to hide the blur
    // filter's own edge softening) copy of the main clip's CURRENT frame —
    // the "fill the letterbox with the video itself" look most short-form
    // apps use when reframing landscape footage vertical.
    ctx.save();
    ctx.filter = 'blur(30px)';
    drawCover(ctx, mainEl, { x: -w * 0.05, y: -h * 0.05, w: w * 1.1, h: h * 1.1 }, { x: 0.5, y: 0.5 });
    ctx.filter = 'none';
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; // darken slightly so foreground content stays readable against busy footage
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  } else if (backgroundType === 'image' && backgroundImageEl) {
    drawCover(ctx, backgroundImageEl, { x: 0, y: 0, w, h }, { x: 0.5, y: 0.5 });
  } else {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  // Rotation/flip are applied as a canvas transform around the rect's own
  // center rather than pre-processing the media — for a 90/270 rotation,
  // the content drawn (in the transform's own coordinate space) needs a
  // width/height-swapped rect so that, once the rotation is applied, the
  // result fills the ORIGINAL rect's visual bounds exactly (the standard
  // "rotate to fit a fixed box" technique).
  function drawInto(mediaEl, rect, clip) {
    const cropFocus = clip?.cropFocus || { x: 0.5, y: 0.5 };
    const cropZoom = clip?.cropZoom || 1;
    const rotation = clip?.rotation || 0;
    const flipH = !!clip?.flipH;
    const flipV = !!clip?.flipV;
    const needsTransform = rotation !== 0 || flipH || flipV;
    if (!needsTransform) {
      if (timeline.fitMode === 'contain') drawContain(ctx, mediaEl, rect);
      else drawCover(ctx, mediaEl, rect, cropFocus, cropZoom);
      return;
    }
    ctx.save();
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.translate(cx, cy);
    if (rotation) ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.translate(-cx, -cy);
    const swapped = rotation === 90 || rotation === 270;
    const effectiveRect = swapped
      ? { x: cx - rect.h / 2, y: cy - rect.w / 2, w: rect.h, h: rect.w }
      : rect;
    if (timeline.fitMode === 'contain') drawContain(ctx, mediaEl, effectiveRect);
    else drawCover(ctx, mediaEl, effectiveRect, cropFocus, cropZoom);
    ctx.restore();
  }
  // 'contain' can leave a letterbox gap inside a rect that a track drawn
  // earlier (e.g. a full-canvas main track under a pip overlay) already
  // painted over — filling each rect with backgroundFill immediately before
  // drawing into it keeps the gap a clean, predictable solid color rather
  // than "whatever happened to already be there."
  function fillRectBg(rect) {
    if (timeline.fitMode !== 'contain') return;
    ctx.fillStyle = bg;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  const rects = computeLayoutRects(timeline, w, h);
  // 'slide' pushes the outgoing clip off one side while the incoming clip
  // pushes in from the other, so the outgoing draw also needs a transform
  // during that blend — every other transition type leaves mainEl's draw
  // untouched and only transforms the incoming (crossfade*) layer below.
  if (mainEl) {
    fillRectBg(rects.main);
    ctx.save();
    ctx.filter = buildFilterString(mainClip?.filters);
    ctx.globalAlpha = mainOpacity;
    if (transitionType === 'slide' && crossfadeOpacity > 0) ctx.translate(-rects.main.w * crossfadeOpacity, 0);
    else if (transitionType === 'push' && crossfadeOpacity > 0) ctx.translate(0, -rects.main.h * crossfadeOpacity);
    drawInto(mainEl, rects.main, mainClip);
    ctx.restore();
  }

  if (crossfadeEl && crossfadeOpacity > 0) {
    const rect = rects.main;
    const baseFilter = buildFilterString(crossfadeClip?.filters);
    ctx.save();
    ctx.filter = baseFilter;
    if (transitionType === 'slide') {
      // Incoming clip pushes in from the right as the outgoing one (above)
      // pushes out to the left — a "push" transition, not a fade.
      ctx.globalAlpha = 1;
      ctx.translate(rect.w * (1 - crossfadeOpacity), 0);
      drawInto(crossfadeEl, rect, crossfadeClip);
    } else if (transitionType === 'push') {
      // Vertical counterpart to 'slide' (which pushes horizontally) — the
      // incoming clip rises up from the bottom as the outgoing one (above)
      // is pushed off the top, both moving together with no held frame.
      ctx.globalAlpha = 1;
      ctx.translate(0, rect.h * (1 - crossfadeOpacity));
      drawInto(crossfadeEl, rect, crossfadeClip);
    } else if (transitionType === 'iris') {
      // Classic circular reveal: a growing circle clip path centered on the
      // frame, fully opaque incoming clip inside it — same hard-edged-reveal
      // family as 'wipe', just a circle instead of a rectangle. The radius
      // reaches corner-to-center distance at full progress so the circle
      // fully covers the frame by the time the transition completes.
      ctx.globalAlpha = 1;
      const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
      const maxRadius = Math.hypot(rect.w, rect.h) / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, maxRadius * crossfadeOpacity, 0, Math.PI * 2);
      ctx.clip();
      drawInto(crossfadeEl, rect, crossfadeClip);
    } else if (transitionType === 'wipe') {
      // A hard-edged reveal (left to right) rather than a blend — the
      // incoming clip is fully opaque, just clipped to a growing rect.
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.rect(rect.x, rect.y, rect.w * crossfadeOpacity, rect.h);
      ctx.clip();
      drawInto(crossfadeEl, rect, crossfadeClip);
    } else if (transitionType === 'zoom') {
      ctx.globalAlpha = crossfadeOpacity;
      const scale = 0.85 + 0.15 * crossfadeOpacity;
      const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
      drawInto(crossfadeEl, rect, crossfadeClip);
    } else if (transitionType === 'blur') {
      // Blur ramps up then back down across the blend (peaking at the
      // transition's midpoint) so it reads as a soft dissolve rather than a
      // plain cross-fade.
      const blurPx = Math.sin(Math.min(1, crossfadeOpacity) * Math.PI) * 14;
      ctx.globalAlpha = crossfadeOpacity;
      if (blurPx > 0.3) ctx.filter = `${baseFilter === 'none' ? '' : baseFilter + ' '}blur(${blurPx}px)`;
      drawInto(crossfadeEl, rect, crossfadeClip);
    } else {
      // 'crossfade' (default): plain opacity dissolve, no extra transform.
      ctx.globalAlpha = crossfadeOpacity;
      drawInto(crossfadeEl, rect, crossfadeClip);
    }
    ctx.restore();
  }

  for (const layer of overlayLayers) {
    const r = rects.overlays[layer.trackId];
    if (!r || !layer.el) continue;
    const track = (timeline.overlayTracks || []).find((t) => t.id === layer.trackId);
    const mode = track?.mode || 'pip';
    // Cutout draws the masked silhouette instead of a plain rect — no
    // rounded-corner clip or rectangular border, since the whole point is
    // an irregular (non-rectangular) shape. layer.cutoutCanvas is computed
    // by the CALLER each frame (see segmentation.js's getPersonMaskCanvas +
    // buildCutoutCanvas above) and cached across any frame where inference
    // momentarily has nothing new, so this never flashes an un-cut-out
    // frame once cutout has successfully rendered at least once.
    if (mode === 'pip' && track?.cutoutEnabled && layer.cutoutCanvas) {
      ctx.save();
      ctx.globalAlpha = layer.opacity ?? 1;
      drawCutoutOverlay(ctx, layer.cutoutCanvas, r, { shadow: track.cutoutShadow, outline: track.cutoutOutline, outlineColor: track.cutoutOutlineColor });
      ctx.restore();
      continue;
    }
    if (mode === 'pip' && rounded) {
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
      ctx.filter = buildFilterString(layer.clip?.filters);
      ctx.globalAlpha = layer.opacity ?? 1;
      drawInto(layer.el, r, layer.clip);
      ctx.restore();
    } else {
      ctx.save();
      fillRectBg(r);
      ctx.filter = buildFilterString(layer.clip?.filters);
      ctx.globalAlpha = layer.opacity ?? 1;
      drawInto(layer.el, r, layer.clip);
      ctx.restore();
    }
    if (mode === 'pip' && border) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    }
    if (mode !== 'pip') {
      // A thin divider line at the split boundary makes the composition
      // read clearly as two intentional halves, not a rendering glitch.
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      if (mode === 'split-lr') ctx.fillRect(r.x - 1, 0, 2, h);
      else ctx.fillRect(0, r.y - 1, w, 2);
    }
  }
}

// ---- Text overlays (titles, lower thirds, watermark text, quotes, etc) ----
// Drawn last, on top of everything the composition already painted — same
// shared-function principle as drawCompositionFrame, called identically by
// live preview and by the composed export's per-frame canvas pass.

// How long an entrance animation takes, regardless of the overlay's own
// duration — a fixed, short beat (not configurable) so this stays the
// "lightweight" effect it's meant to be rather than growing its own timing
// UI. elapsedInOverlay is timelineSeconds - o.start, i.e. "how long this
// overlay has been on screen"; animation only affects the first
// ANIMATION_DURATION seconds of that, then settles to the identity.
const ANIMATION_DURATION = 0.35;

function drawOneTextOverlay(ctx, o, w, h, elapsedInOverlay = Infinity) {
  if (!o.text) return;
  ctx.save();
  const weight = o.bold ? '700' : '400';
  const style = o.italic ? 'italic' : 'normal';
  ctx.font = `${style} ${weight} ${o.size}px ${o.font || 'sans-serif'}, sans-serif`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = 'middle';
  // Not every browser implements ctx.letterSpacing (a fairly recent Canvas
  // 2D addition) — setting it is a silent no-op where unsupported rather
  // than an error, so this degrades gracefully to "no extra spacing".
  if (o.letterSpacing) ctx.letterSpacing = `${o.letterSpacing}px`;

  const x = (o.x ?? 0.5) * w;
  const y = (o.y ?? 0.85) * h;

  // Entrance animation: a short ease-out over the overlay's first moments,
  // expressed as an opacity ramp plus (for slide/pop) a transform around
  // the overlay's own anchor point — settles to the identity afterward, so
  // steady-state rendering (and every existing overlay with no animation
  // set) is completely unaffected.
  let animOpacity = 1, animOffsetX = 0, animScale = 1;
  if (o.animation && o.animation !== 'none' && elapsedInOverlay < ANIMATION_DURATION) {
    const p = Math.max(0, Math.min(1, elapsedInOverlay / ANIMATION_DURATION));
    const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
    animOpacity = eased;
    if (o.animation === 'slide') animOffsetX = (1 - eased) * o.size * 1.5;
    else if (o.animation === 'pop') animScale = 0.7 + 0.3 * eased;
  }
  ctx.globalAlpha = (o.opacity ?? 1) * animOpacity;
  if (animScale !== 1) {
    ctx.translate(x, y);
    ctx.scale(animScale, animScale);
    ctx.translate(-x, -y);
  }
  const drawX = x + animOffsetX;

  const lines = String(o.text).split('\n');
  const lineHeight = o.size * (o.lineHeight || 1.2);
  const blockH = lineHeight * lines.length;
  const firstLineY = y - blockH / 2 + lineHeight / 2;
  const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width));

  if (o.background && o.background !== 'none') {
    const padX = o.size * 0.4;
    const padY = o.size * 0.3;
    let boxX = drawX - padX;
    if (o.align === 'center') boxX = drawX - maxLineW / 2 - padX;
    else if (o.align === 'right') boxX = drawX - maxLineW - padX;
    ctx.fillStyle = o.backgroundColor || '#000000';
    // backgroundOpacity may be unset on an overlay created before this field
    // existed — falls back to 'bar''s old hardcoded 0.6 (translucent strip)
    // or 1 (solid) so existing overlays render identically to before.
    const bgOpacity = o.backgroundOpacity ?? (o.background === 'bar' ? 0.6 : 1);
    ctx.globalAlpha = (o.opacity ?? 1) * animOpacity * bgOpacity;
    ctx.fillRect(boxX, firstLineY - lineHeight / 2 - padY, maxLineW + padX * 2, blockH + padY * 2);
    ctx.globalAlpha = (o.opacity ?? 1) * animOpacity;
  }
  if (o.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = o.size * 0.15;
    ctx.shadowOffsetX = o.size * 0.03;
    ctx.shadowOffsetY = o.size * 0.05;
  }
  lines.forEach((line, i) => {
    const lineY = firstLineY + i * lineHeight;
    if (o.outline) {
      ctx.strokeStyle = o.outlineColor || '#000000';
      ctx.lineWidth = Math.max(1, o.size * 0.06);
      ctx.lineJoin = 'round';
      ctx.strokeText(line, drawX, lineY);
    }
    ctx.fillStyle = o.color || '#FFFFFF';
    ctx.fillText(line, drawX, lineY);
  });
  ctx.restore();
}

// Bounding box (canvas pixel space) an overlay's rendered text actually
// occupies — the align-aware, multi-line-aware layout math mirrors what
// drawOneTextOverlay itself computes, kept as a separate function (rather
// than having that one return it) so the already-verified draw path stays
// completely untouched; this exists purely for hit-testing drag-to-
// reposition on the preview. Ignores any in-progress entrance animation
// offset — hit-testing uses the settled, steady-state position.
export function getTextOverlayBounds(ctx, o, w, h) {
  if (!o.text) return null;
  const weight = o.bold ? '700' : '400';
  const style = o.italic ? 'italic' : 'normal';
  ctx.font = `${style} ${weight} ${o.size}px ${o.font || 'sans-serif'}, sans-serif`;
  const lines = String(o.text).split('\n');
  const lineHeight = o.size * (o.lineHeight || 1.2);
  const blockH = lineHeight * lines.length;
  const anchorX = (o.x ?? 0.5) * w;
  const anchorY = (o.y ?? 0.85) * h;
  const firstLineY = anchorY - blockH / 2 + lineHeight / 2;
  const maxLineW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const align = o.align || 'center';
  let left;
  if (align === 'center') left = anchorX - maxLineW / 2;
  else if (align === 'right') left = anchorX - maxLineW;
  else left = anchorX;
  return { x: left, y: firstLineY - lineHeight / 2, w: maxLineW, h: blockH };
}

// timelineSeconds selects which overlays are currently active (start <= t
// < end, end:null meaning "through the end of the timeline") — the same
// active-window check findActiveClipAt() uses for clips, just simpler since
// overlays don't reference a source file with its own trim points.
export function drawTextOverlays(ctx, { timeline, timelineSeconds, canvasWidth, canvasHeight }) {
  const { width: w, height: h } = canvasWidth && canvasHeight ? { width: canvasWidth, height: canvasHeight } : getComposeSize(timeline.frameAspect);
  for (const o of timeline.textOverlays) {
    if (timelineSeconds < o.start) continue;
    if (o.end != null && timelineSeconds >= o.end) continue;
    drawOneTextOverlay(ctx, o, w, h, timelineSeconds - o.start);
  }
}

// ---- Captions (Auto Captions / Burn Subtitles) — drawn on canvas so the
// live preview and the export are pixel-identical by construction (the
// same draw call captured by the composed export's MediaRecorder), unlike
// the old ffmpeg-ASS-filter burn + approximate CSS preview this replaces.
// `event` is one already-resolved caption event ({ start, end, text, words }
// — see lib/media/captions.js's getCaptionEvents/findActiveCaptionEvent,
// which normalize either an Auto Captions transcript or a parsed .srt/.vtt
// into this same shape) or null when nothing should be shown right now;
// resolving which event is active is the caller's job (the live preview
// loop and the composed export loop each already do the equivalent lookup
// for clips/other overlays), not this module's. `style` is timeline.
// captionStyle. Reuses drawOneTextOverlay's box/outline/shadow/animation
// look (same field names, same math) but wraps text itself at draw time to
// the style's own boxWidth, and draws word-by-word so word/karaoke
// highlight can recolor individual words as the playhead passes them.

// Greedy wrap of pre-tokenized words (not a plain string — see
// synthesizeWordTimings/segment.words) into lines no wider than maxWidthPx,
// using the CURRENT ctx.font (caller must set it first, same requirement
// getTextOverlayBounds already has for measureText to be accurate).
function wrapCaptionWords(ctx, words, maxWidthPx) {
  const spaceWidth = ctx.measureText(' ').width;
  const lines = [];
  let currentLine = [];
  let currentWidth = 0;
  for (const word of words) {
    const wordWidth = ctx.measureText(word.text).width;
    const addedWidth = currentLine.length ? spaceWidth + wordWidth : wordWidth;
    if (currentLine.length && currentWidth + addedWidth > maxWidthPx) {
      lines.push(currentLine);
      currentLine = [word];
      currentWidth = wordWidth;
    } else {
      currentLine.push(word);
      currentWidth += addedWidth;
    }
  }
  if (currentLine.length) lines.push(currentLine);
  return lines.length ? lines : [[]];
}

function measureCaptionLineWidth(ctx, line, spaceWidth) {
  return line.reduce((sum, word, i) => sum + ctx.measureText(word.text).width + (i > 0 ? spaceWidth : 0), 0);
}

export function drawCaptions(ctx, { style, event, timelineSeconds, timeline, canvasWidth, canvasHeight }) {
  if (!style || !event?.words?.length) return;
  const { width: w, height: h } = canvasWidth && canvasHeight ? { width: canvasWidth, height: canvasHeight } : getComposeSize(timeline.frameAspect);
  ctx.save();
  ctx.font = `${style.bold ? '700' : '400'} ${style.fontSize}px ${style.fontFamily || 'sans-serif'}, sans-serif`;
  ctx.textBaseline = 'middle';
  if (style.letterSpacing) ctx.letterSpacing = `${style.letterSpacing}px`;

  const anchorX = (style.x ?? 0.5) * w;
  const anchorY = (style.y ?? 0.85) * h;
  const boxWidthPx = Math.max(40, (style.boxWidth ?? 0.82) * w);
  const boxLeft = anchorX - boxWidthPx / 2;

  // Same short, fixed entrance beat as a text overlay's own animation —
  // 'rise' (a caption-specific option, floating up from slightly below its
  // resting position) is the one addition beyond fade/pop.
  let animOpacity = 1, animScale = 1, animOffsetY = 0;
  const elapsedInEvent = timelineSeconds - event.start;
  if (style.animation && style.animation !== 'none' && elapsedInEvent < ANIMATION_DURATION) {
    const p = Math.max(0, Math.min(1, elapsedInEvent / ANIMATION_DURATION));
    const eased = 1 - Math.pow(1 - p, 3);
    animOpacity = eased;
    if (style.animation === 'pop') animScale = 0.7 + 0.3 * eased;
    else if (style.animation === 'rise') animOffsetY = (1 - eased) * style.fontSize * 1.2;
  }
  ctx.globalAlpha = (style.opacity ?? 1) * animOpacity;
  if (animScale !== 1) {
    ctx.translate(anchorX, anchorY);
    ctx.scale(animScale, animScale);
    ctx.translate(-anchorX, -anchorY);
  }

  const lines = wrapCaptionWords(ctx, event.words, boxWidthPx);
  const lineHeight = style.fontSize * (style.lineHeight || 1.25);
  const blockH = lineHeight * lines.length;
  const firstLineY = anchorY - blockH / 2 + lineHeight / 2 + animOffsetY;
  const spaceWidth = ctx.measureText(' ').width;
  const lineWidths = lines.map((line) => measureCaptionLineWidth(ctx, line, spaceWidth));
  const maxLineW = Math.max(0, ...lineWidths);
  const align = style.align || 'center';

  if (style.background === 'box') {
    const padX = style.fontSize * 0.4;
    const padY = style.fontSize * 0.3;
    let boxX;
    if (align === 'center') boxX = anchorX - maxLineW / 2 - padX;
    else if (align === 'right') boxX = boxLeft + boxWidthPx - maxLineW - padX;
    else boxX = boxLeft - padX;
    ctx.fillStyle = style.backgroundColor || '#000000';
    ctx.globalAlpha = (style.opacity ?? 1) * animOpacity * (style.backgroundOpacity ?? 0.6);
    ctx.fillRect(boxX, firstLineY - lineHeight / 2 - padY, maxLineW + padX * 2, blockH + padY * 2);
    ctx.globalAlpha = (style.opacity ?? 1) * animOpacity;
  }
  if (style.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = style.fontSize * 0.15;
    ctx.shadowOffsetX = style.fontSize * 0.03;
    ctx.shadowOffsetY = style.fontSize * 0.05;
  }

  ctx.textAlign = 'left';
  lines.forEach((line, li) => {
    const lineY = firstLineY + li * lineHeight;
    const lineW = lineWidths[li];
    let cursorX;
    if (align === 'center') cursorX = anchorX - lineW / 2;
    else if (align === 'right') cursorX = boxLeft + boxWidthPx - lineW;
    else cursorX = boxLeft;
    for (const word of line) {
      // 'word' highlights only the single word the playhead is currently
      // inside; 'karaoke' also keeps every earlier word in this same event
      // highlighted (the classic "fill in as you go" look), both driven by
      // each word's own (real or approximated — see synthesizeWordTimings)
      // start/end rather than a separate animation clock of their own.
      const isActive = timelineSeconds >= word.start && timelineSeconds < word.end;
      const isPast = timelineSeconds >= word.end;
      let color = style.color || '#FFFFFF';
      if (style.highlightMode === 'word' && isActive) color = style.highlightColor || '#FFD400';
      else if (style.highlightMode === 'karaoke' && (isActive || isPast)) color = style.highlightColor || '#FFD400';
      if (style.outline) {
        ctx.strokeStyle = style.outlineColor || '#000000';
        ctx.lineWidth = Math.max(1, style.fontSize * 0.06);
        ctx.lineJoin = 'round';
        ctx.strokeText(word.text, cursorX, lineY);
      }
      ctx.fillStyle = color;
      ctx.fillText(word.text, cursorX, lineY);
      cursorX += ctx.measureText(word.text).width + spaceWidth;
    }
  });
  ctx.restore();
}

// Bounding box (canvas pixel space) of the caption's own editable BOX — not
// just the ink its current text happens to fill, unlike getTextOverlayBounds
// — so the resize handles stay grabbable even where a short line leaves
// margin inside a wider box. Ignores in-progress entrance animation, same
// steady-state convention as getTextOverlayBounds.
export function getCaptionBounds(ctx, style, event, w, h) {
  if (!style || !event?.words?.length) return null;
  ctx.font = `${style.bold ? '700' : '400'} ${style.fontSize}px ${style.fontFamily || 'sans-serif'}, sans-serif`;
  const anchorX = (style.x ?? 0.5) * w;
  const anchorY = (style.y ?? 0.85) * h;
  const boxWidthPx = Math.max(40, (style.boxWidth ?? 0.82) * w);
  const boxLeft = anchorX - boxWidthPx / 2;
  const lines = wrapCaptionWords(ctx, event.words, boxWidthPx);
  const lineHeight = style.fontSize * (style.lineHeight || 1.25);
  const blockH = lineHeight * lines.length;
  const firstLineY = anchorY - blockH / 2 + lineHeight / 2;
  return { x: boxLeft, y: firstLineY - lineHeight / 2, w: boxWidthPx, h: blockH };
}

// ---- Image overlays (logo/watermark) ----
// imageElements is a Map<sourceId, HTMLImageElement> the caller manages
// (loading/decoding is DOM/element-lifecycle work this module deliberately
// stays out of, same division of responsibility drawCompositionFrame
// already has with mainEl/overlayEl).
export function drawImageOverlays(ctx, { timeline, timelineSeconds, imageElements, canvasWidth, canvasHeight }) {
  if (!imageElements) return;
  const { width: w, height: h } = canvasWidth && canvasHeight ? { width: canvasWidth, height: canvasHeight } : getComposeSize(timeline.frameAspect);
  for (const o of timeline.imageOverlays) {
    if (timelineSeconds < o.start) continue;
    if (o.end != null && timelineSeconds >= o.end) continue;
    const img = imageElements.get(o.sourceId);
    if (!img || !img.naturalWidth) continue;
    const dw = w * o.scale;
    const dh = dw * (img.naturalHeight / img.naturalWidth);
    const dx = o.x * w - dw / 2;
    const dy = o.y * h - dh / 2;
    ctx.save();
    ctx.globalAlpha = o.opacity ?? 1;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  }
}

// ---- Shape overlays (rectangle/circle/line/arrow annotations) — same
// active-window + draw-last-on-top pattern as text/image overlays. ----

function drawArrowhead(ctx, fromX, fromY, toX, toY, size) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - size * Math.cos(angle - Math.PI / 6), toY - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - size * Math.cos(angle + Math.PI / 6), toY - size * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function drawOneShapeOverlay(ctx, o, w, h) {
  ctx.save();
  ctx.globalAlpha = o.opacity ?? 1;
  ctx.strokeStyle = o.color || '#EF4444';
  ctx.fillStyle = o.color || '#EF4444';
  ctx.lineWidth = o.strokeWidth || 4;
  ctx.lineCap = 'round';

  if (o.type === 'rectangle') {
    const x = (o.x - o.width / 2) * w;
    const y = (o.y - o.height / 2) * h;
    const rw = o.width * w;
    const rh = o.height * h;
    if (o.filled) ctx.fillRect(x, y, rw, rh);
    else ctx.strokeRect(x, y, rw, rh);
  } else if (o.type === 'circle') {
    const cx = o.x * w;
    const cy = o.y * h;
    ctx.beginPath();
    ctx.ellipse(cx, cy, (o.width * w) / 2, (o.height * h) / 2, 0, 0, Math.PI * 2);
    if (o.filled) ctx.fill();
    else ctx.stroke();
  } else if (o.type === 'line' || o.type === 'arrow') {
    const x1 = o.x * w, y1 = o.y * h, x2 = (o.x2 ?? o.x) * w, y2 = (o.y2 ?? o.y) * h;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (o.type === 'arrow') drawArrowhead(ctx, x1, y1, x2, y2, Math.max(10, (o.strokeWidth || 4) * 3));
  }
  ctx.restore();
}

export function drawShapeOverlays(ctx, { timeline, timelineSeconds, canvasWidth, canvasHeight }) {
  const { width: w, height: h } = canvasWidth && canvasHeight ? { width: canvasWidth, height: canvasHeight } : getComposeSize(timeline.frameAspect);
  for (const o of timeline.shapeOverlays || []) {
    if (timelineSeconds < o.start) continue;
    if (o.end != null && timelineSeconds >= o.end) continue;
    drawOneShapeOverlay(ctx, o, w, h);
  }
}

// ---- Convertam watermark — burned into the bottom-right corner of every
// EXPORTED video (the composed/canvas export path calls this directly;
// the simple/ffmpeg path has no canvas, so it renders an equivalent PNG
// via ffmpeg's overlay filter instead — see timelineRender.js's
// createWatermarkPngBlob, kept visually consistent with this). Never
// drawn in the live editing preview — this is an export-only mark, same
// "preview stays clean, only actual output files carry it" principle the
// safe-zone guides use in reverse. Deliberately not user-configurable. ----
export function drawWatermark(ctx, w, h) {
  const fontSize = Math.max(10, Math.round(h * 0.022));
  const pad = Math.round(fontSize * 0.9);
  ctx.save();
  ctx.font = `700 ${fontSize}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = fontSize * 0.3;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText('convertam.app', w - pad, h - pad);
  ctx.restore();
}
