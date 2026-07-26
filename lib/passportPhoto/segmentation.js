// Full-person background segmentation via MediaPipe Selfie Segmentation,
// loaded on demand from a CDN. This replaces an earlier corner-seeded
// flood-fill ("chroma key from the corners") approach, which could only
// ever separate foreground from background by color difference — it had
// no actual concept of "this pixel belongs to a person." A dark suit
// against a dark background, or a white shirt against a white wall, broke
// that approach by design, in exactly the way real segmentation is built
// to handle. Nothing here has any notion of "face" — the model segments
// the whole person (hair, ears, neck, shoulders, clothing) from everything
// else in the frame.
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation';

let loadPromise = null;
function loadSelfieSegmentationScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.SelfieSegmentation) return Promise.resolve();
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${CDN_BASE}/selfie_segmentation.js`;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve();
    script.onerror = () => { loadPromise = null; reject(new Error('Failed to load the segmentation model.')); };
    document.head.appendChild(script);
  });
  return loadPromise;
}

let modelInstance = null;
let modelBusy = null; // serializes calls — the model's onResults callback is a single slot, not a queue
async function getModel() {
  await loadSelfieSegmentationScript();
  if (!window.SelfieSegmentation) throw new Error('Segmentation model unavailable.');
  if (!modelInstance) {
    modelInstance = new window.SelfieSegmentation({ locateFile: (file) => `${CDN_BASE}/${file}` });
    // modelSelection 0 = the "general" model, meant for a person roughly
    // head-to-shoulders through half-body in frame — the right fit for a
    // passport-style crop, as opposed to option 1 ("landscape"), which is
    // tuned for wide-angle, further-away shots.
    modelInstance.setOptions({ modelSelection: 0 });
  }
  return modelInstance;
}

// Runs segmentation on a canvas already cropped to the target frame and
// returns a Uint8ClampedArray sized width*height where 255 = person (keep)
// and 0 = background (remove).
export async function segmentPerson(sourceCanvas, width, height) {
  const model = await getModel();
  while (modelBusy) await modelBusy.catch(() => {}); // one in-flight call at a time — onResults is overwritten per call
  let release;
  modelBusy = new Promise((r) => { release = r; });
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Segmentation timed out.')), 15000);
      model.onResults((results) => {
        clearTimeout(timeout);
        try {
          const maskCanvas = document.createElement('canvas');
          maskCanvas.width = width;
          maskCanvas.height = height;
          const mctx = maskCanvas.getContext('2d');
          mctx.drawImage(results.segmentationMask, 0, 0, width, height);
          const raw = mctx.getImageData(0, 0, width, height).data;
          const mask = new Uint8ClampedArray(width * height);
          for (let i = 0; i < mask.length; i++) mask[i] = raw[i * 4]; // grayscale mask value carried in the red channel
          resolve(mask);
        } catch (err) {
          reject(err);
        }
      });
      model.send({ image: sourceCanvas }).catch(reject);
    });
  } finally {
    release();
    modelBusy = null;
  }
}

// A rough, honest proxy for "did this look like a clean separation" — the
// fraction of pixels the model itself left in the ambiguous middle ground
// (neither confidently person nor confidently background). A clean
// segmentation has a thin ambiguous band right at the subject's outline;
// a large ambiguous area usually means lighting, low contrast, or a
// background too close in tone to the subject confused the model — the
// scenarios this feature exists to catch rather than silently mangle.
export function ambiguousRatio(mask) {
  let ambiguous = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 60 && mask[i] < 200) ambiguous++;
  }
  return ambiguous / mask.length;
}

export const LOW_CONFIDENCE_THRESHOLD = 0.12;
