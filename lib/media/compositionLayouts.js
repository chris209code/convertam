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
function getPipRange(canvasWidth, canvasHeight, pipSizeRatio) {
  const pipW = canvasWidth * pipSizeRatio;
  const pipH = (canvasHeight * pipSizeRatio * canvasHeight) / canvasWidth; // keep same aspect as canvas
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
function drawCover(ctx, mediaEl, rect, cropFocus = { x: 0.5, y: 0.5 }, zoom = 1) {
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
