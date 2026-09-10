// Smart Reframe — locally analyzes a video clip's source footage once
// (never per export-frame) to find where the main subject is over time,
// then produces the same {cropFocus, cropZoom} shape the timeline's
// existing manual crop control and Ken Burns animation already use (see
// getKenBurnsTransform in timeline.js). This is deliberately NOT a new
// rendering path: it slots into the exact mechanism that already exists,
// so drawCover() in compositionLayouts.js needs zero changes, and the
// exported video automatically matches the preview.
//
// Detection is 100% local: lib/media/segmentation.js's MediaPipe person
// segmenter (self-hosted, already used for PIP cutout) gives a per-frame
// person-confidence mask. No frame or file is ever sent to Gemini or any
// external API for this feature — that would also make per-frame tracking
// far too slow/expensive to be usable. Two honest scope limits, both
// documented here rather than silently overclaimed:
// - "Face" mode is a head-region-weighted read of the SAME person mask
//   (biased toward its upper portion), not a separate face-landmark model.
// - "Main Subject" with no person detected falls back to Center Crop —
//   there is no local generic-object detector in this codebase, and this
//   feature doesn't justify adding one.
//
// Multiple distinct people aren't given separate identities either (the
// segmenter outputs one person-vs-background mask, not per-instance
// boxes) — proximity/dominance is approximated via connected-component
// blob analysis on that mask, which is enough to satisfy "keep both
// visible when close, pick the dominant one when far apart" without
// needing real multi-person tracking.

import { ensureSegmenterLoaded, getPersonMaskCanvas } from './segmentation';

export const SUBJECT_MODES = [
  { id: 'auto', label: 'Auto' },
  { id: 'person', label: 'Person' },
  { id: 'face', label: 'Face' },
  { id: 'main', label: 'Main Subject' },
];

// Window size (in SAMPLES, not seconds) for the moving-average smoothing
// pass applied to raw detections before they're stored as trackingData —
// this is the "real camera operator, not a jittery tracker" requirement.
// Larger window = smoother but slower to react; smaller = snappier but
// jumpier. Interpolation between the smoothed keyframes (in
// getSmartReframeTransform below) is what actually produces continuous
// motion during playback — this window controls the underlying path's
// shape, not the frame-to-frame interpolation itself.
export const SMOOTHING_PRESETS = {
  smooth: { window: 5, sampleIntervalSeconds: 1.0 },
  balanced: { window: 3, sampleIntervalSeconds: 0.75 },
  responsive: { window: 1, sampleIntervalSeconds: 0.5 },
};

// ---- Geometry: subject position -> cropFocus -------------------------
//
// Mirrors drawCover()'s own crop-window math in compositionLayouts.js
// exactly (same "cover" fit, same zoom convention), just run in reverse:
// instead of a fixed cropFocus telling drawCover which window to crop,
// this computes WHICH cropFocus centers a given normalized subject point
// inside that same window. Works in normalized (0..1) units throughout, so
// only the source's ASPECT RATIO matters, never its absolute pixel size —
// these two functions must be kept in sync if either ever changes.
export function computeCropFocusForTarget(subjectX, subjectY, mediaAspect, targetAspect, zoom = 1) {
  let normW, normH;
  if (mediaAspect > targetAspect) {
    normH = 1;
    normW = targetAspect / mediaAspect;
  } else {
    normW = 1;
    normH = mediaAspect / targetAspect;
  }
  const z = Math.max(1, zoom || 1);
  normW = Math.min(1, normW / z);
  normH = Math.min(1, normH / z);
  const slackX = 1 - normW;
  const slackY = 1 - normH;
  // Centers the crop window exactly on the subject whenever there's slack
  // to do so — the simplest way to guarantee a real margin on every side
  // (the spec's "don't jam the subject against the edge" requirement),
  // short of a more elaborate rule-of-thirds placement this feature
  // doesn't need. Clamped into the available slack at either end of the
  // clip's own frame, which is the only time the subject can end up
  // closer to an edge — an unavoidable physical limit, not a bug.
  const desiredX = subjectX - normW / 2;
  const desiredY = subjectY - normH / 2;
  const x = slackX > 1e-6 ? Math.max(0, Math.min(1, desiredX / slackX)) : 0.5;
  const y = slackY > 1e-6 ? Math.max(0, Math.min(1, desiredY / slackY)) : 0.5;
  return { x, y };
}

// ---- Per-sample subject detection from one person-confidence mask ----

// Downsamples the (typically already-small) mask canvas onto a coarse
// grid via the canvas's own bilinear scaling — cheap, and area-averaging
// is exactly what a connected-components pass over a smaller grid needs
// (no need for per-pixel analysis on a mask that's just going to become
// one or two blob centroids).
const GRID_W = 48;
const GRID_H = 27;
const PERSON_ALPHA_THRESHOLD = 130; // out of 255 — matches getPersonMaskCanvas's confidence-as-alpha encoding

function downsampleMaskToGrid(maskCanvas) {
  const grid = document.createElement('canvas');
  grid.width = GRID_W;
  grid.height = GRID_H;
  const ctx = grid.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(maskCanvas, 0, 0, GRID_W, GRID_H);
  return ctx.getImageData(0, 0, GRID_W, GRID_H).data;
}

// 4-connected flood fill over the thresholded grid — cells, not pixels, so
// this is at most ~1300 iterations per sample, negligible next to the
// segmentation inference itself. Returns blobs sorted by area (cell count)
// descending, each with a normalized (0..1) centroid — optionally biased
// toward the upper portion of its own bounding box for 'face' mode, since
// that's roughly where a standing/seated person's head is.
function findBlobs(gridAlpha, { biasUpper = false } = {}) {
  const visited = new Uint8Array(GRID_W * GRID_H);
  const blobs = [];
  for (let sy = 0; sy < GRID_H; sy++) {
    for (let sx = 0; sx < GRID_W; sx++) {
      const idx = sy * GRID_W + sx;
      if (visited[idx] || gridAlpha[idx * 4 + 3] < PERSON_ALPHA_THRESHOLD) continue;
      // BFS this connected region.
      const queue = [[sx, sy]];
      visited[idx] = 1;
      let area = 0, sumX = 0, sumY = 0, minY = sy, maxY = sy;
      const cells = [];
      while (queue.length) {
        const [cx, cy] = queue.pop();
        area++; sumX += cx; sumY += cy;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        cells.push([cx, cy]);
        const neighbors = [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
          const nIdx = ny * GRID_W + nx;
          if (visited[nIdx] || gridAlpha[nIdx * 4 + 3] < PERSON_ALPHA_THRESHOLD) continue;
          visited[nIdx] = 1;
          queue.push([nx, ny]);
        }
      }
      if (area < 3) continue; // ignore noise specks
      let cx = sumX / area, cy = sumY / area;
      if (biasUpper && maxY > minY) {
        // Head/face bias: recompute the centroid using only cells in the
        // upper ~55% of this blob's own bounding box.
        const headCutoff = minY + (maxY - minY) * 0.55;
        const headCells = cells.filter(([, y]) => y <= headCutoff);
        if (headCells.length) {
          cx = headCells.reduce((s, [x]) => s + x, 0) / headCells.length;
          cy = headCells.reduce((s, [, y]) => s + y, 0) / headCells.length;
        }
      }
      blobs.push({ x: cx / GRID_W, y: cy / GRID_H, area });
    }
  }
  return blobs.sort((a, b) => b.area - a.area);
}

// Distance (normalized units) within which two subjects are considered
// "close enough" to frame together rather than picking one — roughly a
// third of the frame width, wide enough for two people standing shoulder
// to shoulder in typical footage without being so wide it merges people
// who are genuinely on opposite sides of the shot.
const TOGETHER_DISTANCE = 0.32;
// How much larger the runner-up blob must be than whichever blob the
// PREVIOUS sample tracked before switching to it — this is the "only
// switch when clearly, persistently dominant" rule from a single
// comparison against the last sample, not a rolling multi-sample vote,
// which keeps this a plain per-sample function.
const SWITCH_DOMINANCE_RATIO = 1.5;

// Picks the point Smart Reframe should track for one sample, given this
// sample's detected blobs and whichever point the previous sample settled
// on (null on the very first sample). `subjectMode` only changes HOW a
// blob's own centroid is computed (see biasUpper above); the dominance/
// proximity logic here is the same regardless of mode.
function pickSubjectPoint(blobs, prevPoint) {
  if (!blobs.length) return null;
  const top = blobs[0];
  const second = blobs[1];
  if (!second) return { x: top.x, y: top.y };

  const dist = Math.hypot(top.x - second.x, top.y - second.y);
  if (dist < TOGETHER_DISTANCE) {
    // Close together — frame both via their area-weighted midpoint.
    const totalArea = top.area + second.area;
    return { x: (top.x * top.area + second.x * second.area) / totalArea, y: (top.y * top.area + second.y * second.area) / totalArea };
  }

  // Far apart — stick with whichever one the previous sample was
  // tracking, unless the OTHER one is now decisively larger.
  if (!prevPoint) return { x: top.x, y: top.y };
  const distToPrevFromTop = Math.hypot(top.x - prevPoint.x, top.y - prevPoint.y);
  const distToPrevFromSecond = Math.hypot(second.x - prevPoint.x, second.y - prevPoint.y);
  const trackedIsTop = distToPrevFromTop <= distToPrevFromSecond;
  const tracked = trackedIsTop ? top : second;
  const other = trackedIsTop ? second : top;
  if (other.area > tracked.area * SWITCH_DOMINANCE_RATIO) return { x: other.x, y: other.y };
  return { x: tracked.x, y: tracked.y };
}

export class SmartReframeCancelledError extends Error {
  constructor() { super('Smart Reframe analysis was cancelled.'); }
}

// Analyzes one clip's own source range and returns raw (pre-smoothing)
// per-sample subject points: [{ sourceTime, x, y }]. Indexed by absolute
// SOURCE time (not clip-relative elapsed time) deliberately — that's a
// property of the footage itself, so it stays valid even if the clip is
// later re-trimmed or its speed changed, with no re-analysis required.
//
// `onProgress(fraction)` and `cancelToken.cancelled` follow the same
// contract as renderTimelineAudio()/extractThumbnails() elsewhere in this
// module — same offscreen <video> + seek pattern as extractThumbnails.
export async function analyzeClipForSmartReframe({ file, sourceStart, sourceEnd, subjectMode = 'auto', smoothing = 'balanced', onProgress, cancelToken }) {
  const segmenterReady = await ensureSegmenterLoaded();
  if (!segmenterReady) {
    return { trackingData: [], mediaAspect: null, fallbackReason: 'no-segmenter' };
  }

  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = url;
  try {
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error('Could not read this video to analyze it.'));
    });
    if (cancelToken?.cancelled) throw new SmartReframeCancelledError();

    const mediaAspect = (video.videoWidth || 16) / (video.videoHeight || 9);
    const { sampleIntervalSeconds } = SMOOTHING_PRESETS[smoothing] || SMOOTHING_PRESETS.balanced;
    const span = Math.max(0, sourceEnd - sourceStart);
    const sampleCount = Math.max(2, Math.ceil(span / sampleIntervalSeconds) + 1);
    const biasUpper = subjectMode === 'face';

    const raw = [];
    let prevPoint = null;
    let anyDetected = false;
    for (let i = 0; i < sampleCount; i++) {
      if (cancelToken?.cancelled) throw new SmartReframeCancelledError();
      const t = sourceStart + (span * i) / (sampleCount - 1);
      await new Promise((resolve) => {
        const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
        video.addEventListener('seeked', onSeeked);
        video.currentTime = Math.min(Math.max(0, video.duration - 0.05), Math.max(0, t));
      });
      const mask = getPersonMaskCanvas(video);
      const point = mask ? pickSubjectPoint(findBlobs(downsampleMaskToGrid(mask), { biasUpper }), prevPoint) : null;
      if (point) {
        anyDetected = true;
        prevPoint = point;
        raw.push({ sourceTime: t, x: point.x, y: point.y });
      } else if (prevPoint) {
        // No person visible in this sample (e.g. briefly off-screen) —
        // hold the last known position rather than snapping to center,
        // so a momentary detection miss doesn't yank the crop.
        raw.push({ sourceTime: t, x: prevPoint.x, y: prevPoint.y });
      }
      onProgress?.((i + 1) / sampleCount);
    }

    if (!anyDetected) return { trackingData: [], mediaAspect, fallbackReason: 'no-subject-detected' };
    return { trackingData: smoothTrackingData(raw, smoothing), mediaAspect, fallbackReason: null };
  } finally {
    URL.revokeObjectURL(url);
    video.src = '';
  }
}

// Simple centered moving-average over the raw per-sample points — this is
// the actual "real camera operator, not a jittery tracker" smoothing step;
// getSmartReframeTransform's interpolation below only fills in continuous
// motion BETWEEN these already-smoothed keyframes, it doesn't smooth them
// further.
export function smoothTrackingData(raw, smoothing) {
  const { window } = SMOOTHING_PRESETS[smoothing] || SMOOTHING_PRESETS.balanced;
  if (window <= 1 || raw.length < 3) return raw;
  const half = Math.floor(window / 2);
  return raw.map((_, i) => {
    const lo = Math.max(0, i - half);
    const hi = Math.min(raw.length - 1, i + half);
    let sx = 0, sy = 0, n = 0;
    for (let j = lo; j <= hi; j++) { sx += raw[j].x; sy += raw[j].y; n++; }
    return { sourceTime: raw[i].sourceTime, x: sx / n, y: sy / n };
  });
}

// Pure per-frame resolver — the Smart Reframe equivalent of
// getKenBurnsTransform in timeline.js, called the same way from both the
// live preview loop and the composed export loop. Returns null (never
// throws) whenever there's nothing usable to interpolate, so callers can
// fall back to the clip's plain static cropFocus/cropZoom exactly as they
// already do when Ken Burns is off.
export function getSmartReframeTransform(clip, sourceTimeSeconds, { mediaAspect, targetAspect }) {
  const reframe = clip.reframe;
  if (!reframe || reframe.mode !== 'smart' || !reframe.trackingData?.length || !mediaAspect || !targetAspect) return null;
  const data = reframe.trackingData;

  let point;
  if (reframe.follow === false) {
    // Tracking off: a single smart-chosen (not moving) position — the
    // average of the analyzed path, still better than a blind center crop.
    const sx = data.reduce((s, p) => s + p.x, 0) / data.length;
    const sy = data.reduce((s, p) => s + p.y, 0) / data.length;
    point = { x: sx, y: sy };
  } else if (sourceTimeSeconds <= data[0].sourceTime) {
    point = data[0];
  } else if (sourceTimeSeconds >= data[data.length - 1].sourceTime) {
    point = data[data.length - 1];
  } else {
    let lo = data[0], hi = data[data.length - 1];
    for (let i = 0; i < data.length - 1; i++) {
      if (sourceTimeSeconds >= data[i].sourceTime && sourceTimeSeconds <= data[i + 1].sourceTime) {
        lo = data[i]; hi = data[i + 1];
        break;
      }
    }
    const span = hi.sourceTime - lo.sourceTime;
    const ratio = span > 1e-6 ? (sourceTimeSeconds - lo.sourceTime) / span : 0;
    point = { x: lo.x + (hi.x - lo.x) * ratio, y: lo.y + (hi.y - lo.y) * ratio };
  }

  const offset = reframe.offset || { x: 0, y: 0 };
  const subjectX = Math.max(0, Math.min(1, point.x + offset.x));
  const subjectY = Math.max(0, Math.min(1, point.y + offset.y));
  return { cropFocus: computeCropFocusForTarget(subjectX, subjectY, mediaAspect, targetAspect, 1), cropZoom: 1 };
}
