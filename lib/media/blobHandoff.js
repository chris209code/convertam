// Cross-studio handoff for an actual media Blob (not just text) — used by
// Video Studio's "Extract Audio → Open in Audio Studio" so the extracted
// WAV goes straight into Audio Studio without a forced download+re-upload
// round trip. lib/dataTools/shared.js's sendToTool/receiveHandoff is
// sessionStorage-based (string/JSON only) and deliberately stays that way
// for the many existing text/CSV handoffs — a multi-hundred-MB extracted
// WAV doesn't belong in sessionStorage's much smaller string quota, so this
// is a separate, small mechanism: the Cache Storage API (available on
// `window` without registering a service worker) holds the one pending
// Blob, and a parallel sessionStorage entry holds just its tiny metadata
// (tool, filename, mime, timestamp) using the same one-shot, 5-minute
// staleness policy as the text handoff.
const CACHE_NAME = 'cvt-media-blob-handoff';
const CACHE_URL = '/__media-blob-handoff';
const META_KEY = 'cvt-media-blob-handoff-meta';

export async function sendBlobToTool(tool, blob, filename) {
  try {
    if (typeof caches === 'undefined') return false;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(CACHE_URL, new Response(blob));
    sessionStorage.setItem(META_KEY, JSON.stringify({ tool, filename, mimeType: blob.type, at: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export async function receiveBlobHandoff(tool) {
  try {
    const raw = sessionStorage.getItem(META_KEY);
    if (!raw) return null;
    const meta = JSON.parse(raw);
    if (meta.tool !== tool) return null;
    sessionStorage.removeItem(META_KEY);
    if (!meta.at || Date.now() - meta.at > 5 * 60 * 1000) return null;

    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(CACHE_NAME);
    const res = await cache.match(CACHE_URL);
    if (!res) return null;
    const blob = await res.blob();
    await cache.delete(CACHE_URL);
    return { blob, filename: meta.filename, mimeType: meta.mimeType };
  } catch {
    return null;
  }
}
