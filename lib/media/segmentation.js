// Lazy-loaded, self-hosted person segmenter — powers the Person cutout
// overlay mode (background removal without a green screen). Same
// "self-host, no CDN, lazy import" approach as ffmpegClient.js: the wasm
// runtime + model are only ever fetched the moment a user enables cutout
// on an overlay track, never on initial page load. Assets live under
// /public/mediapipe-vision/ (wasm/ copied from node_modules unmodified —
// MediaPipe requires that — and models/selfie_segmenter.tflite, Google's
// published single-class "person confidence" model), never a CDN.

let segmenterSingleton = null;
let loadingPromise = null;
let loadFailed = false;

async function loadSegmenter() {
  const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks('/mediapipe-vision/wasm');
  const baseOptions = { modelAssetPath: '/mediapipe-vision/models/selfie_segmenter.tflite' };
  const taskOptions = { runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true };
  try {
    return await ImageSegmenter.createFromOptions(fileset, { baseOptions: { ...baseOptions, delegate: 'GPU' }, ...taskOptions });
  } catch {
    // Headless/software-rendering environments (or older GPUs) can lack a
    // WebGL2 context the GPU delegate needs — CPU is slower but works
    // everywhere, so it's the fallback, not the default.
    return ImageSegmenter.createFromOptions(fileset, { baseOptions: { ...baseOptions, delegate: 'CPU' }, ...taskOptions });
  }
}

export class SegmentationLoadError extends Error {
  constructor(cause) {
    super('Could not load the background removal engine. Check your connection and try again.');
    this.cause = cause;
  }
}

// Kicks off (or reuses) loading the segmentation engine — call this as
// soon as a user enables Person cutout so the model is warm before the
// render loop's first frame needs it. The render loop itself only ever
// calls the SYNC getPersonMaskCanvas below, which simply skips masking
// (falls back to the plain, un-cut-out clip) on any frame before loading
// finishes, self-healing the moment this resolves.
export async function ensureSegmenterLoaded() {
  if (segmenterSingleton) return true;
  if (loadFailed) return false;
  if (!loadingPromise) {
    loadingPromise = loadSegmenter()
      .then((s) => { segmenterSingleton = s; loadingPromise = null; return s; })
      .catch((err) => { loadFailed = true; loadingPromise = null; throw new SegmentationLoadError(err); });
  }
  try {
    await loadingPromise;
    return true;
  } catch {
    return false;
  }
}

export function isSegmentationLoaded() { return !!segmenterSingleton; }
export function didSegmentationFailToLoad() { return loadFailed; }

// segmentForVideo (VIDEO running mode) requires a strictly increasing
// timestamp per call on the same segmenter instance — this counter is
// shared across every cutout-enabled layer/track so concurrent callers in
// the same render tick can never hand it two equal or out-of-order values.
// The actual value has no meaning beyond "later than the last one".
let lastTimestampMs = 0;
function nextTimestampMs() {
  const t = Math.max(lastTimestampMs + 1, Math.round(performance.now()));
  lastTimestampMs = t;
  return t;
}

// Synchronous — safe to call every render-loop tick. Runs person
// segmentation on the CURRENT frame of `mediaEl` (a <video> element) and
// returns a same-size canvas whose ALPHA channel is the person-confidence
// mask (opaque = person, transparent = background; RGB is always flat
// white, irrelevant on its own) — feed it to buildCutoutCanvas in
// compositionLayouts.js. Returns null (meaning "draw the plain clip
// instead, unmasked") whenever the source has no frame yet, the engine
// hasn't finished loading, or inference itself throws for any reason —
// this never throws, so a segmentation hiccup on one frame can never
// break playback/export.
export function getPersonMaskCanvas(mediaEl) {
  if (!segmenterSingleton) return null;
  const w = mediaEl.videoWidth || mediaEl.width;
  const h = mediaEl.videoHeight || mediaEl.height;
  if (!w || !h) return null;
  let result;
  try {
    result = segmenterSingleton.segmentForVideo(mediaEl, nextTimestampMs());
  } catch {
    return null;
  }
  const mask = result?.confidenceMasks?.[0];
  if (!mask) { result?.close(); return null; }
  const floats = mask.getAsFloat32Array();
  const canvas = document.createElement('canvas');
  canvas.width = mask.width;
  canvas.height = mask.height;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(mask.width, mask.height);
  for (let i = 0; i < floats.length; i++) {
    const a = Math.max(0, Math.min(255, Math.round(floats[i] * 255)));
    const o = i * 4;
    imageData.data[o] = 255;
    imageData.data[o + 1] = 255;
    imageData.data[o + 2] = 255;
    imageData.data[o + 3] = a;
  }
  ctx.putImageData(imageData, 0, 0);
  result.close();
  return canvas;
}
