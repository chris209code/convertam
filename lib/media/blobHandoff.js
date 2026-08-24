// Cross-studio handoff for an actual media Blob (not just text) — used by
// Video Studio's "Extract Audio → Open in Audio Studio" so the extracted
// WAV goes straight into Audio Studio without a forced download+re-upload
// round trip. lib/dataTools/shared.js's sendToTool/receiveHandoff is
// sessionStorage-based (string/JSON only) and deliberately stays that way
// for the many existing text/CSV handoffs — a multi-hundred-MB extracted
// WAV doesn't belong in sessionStorage's much smaller string quota, so this
// is a separate, small mechanism: the Cache Storage API (available on
// `window` without registering a service worker) holds pending Blobs, and a
// parallel sessionStorage entry holds just their tiny metadata (tool, role,
// filename, mime, timestamp) using the same one-shot, 5-minute staleness
// policy as the text handoff.
//
// `role` (optional, defaults to 'default') lets more than one blob be
// pending for the SAME destination tool at once — e.g. Replace Video/Sync
// Audio hands off a replacement video (role 'default', so it's received by
// the exact same code path every other single-file 'video-editor' handoff
// already uses) alongside the audio it should be synced with (role
// 'project-audio') in one navigation, without either call clobbering the
// other. Every existing caller passes no role at all, so nothing about
// today's single-blob handoffs changes.
const CACHE_NAME = 'cvt-media-blob-handoff';
const META_KEY = 'cvt-media-blob-handoff-meta';

function cacheUrlFor(tool, role) {
  return `/__media-blob-handoff/${encodeURIComponent(tool)}/${encodeURIComponent(role)}`;
}

function readPending() {
  try {
    const raw = sessionStorage.getItem(META_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed]; // defensive: tolerate the old single-object shape if it's ever still around
  } catch {
    return [];
  }
}
function writePending(list) {
  if (list.length) sessionStorage.setItem(META_KEY, JSON.stringify(list));
  else sessionStorage.removeItem(META_KEY);
}

export async function sendBlobToTool(tool, blob, filename, role = 'default') {
  try {
    if (typeof caches === 'undefined') return false;
    const url = cacheUrlFor(tool, role);
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(blob));
    const pending = readPending().filter((m) => !(m.tool === tool && (m.role || 'default') === role));
    pending.push({ tool, role, filename, mimeType: blob.type, at: Date.now(), url });
    writePending(pending);
    return true;
  } catch {
    return false;
  }
}

export async function receiveBlobHandoff(tool, role = 'default') {
  try {
    const pending = readPending();
    const idx = pending.findIndex((m) => m.tool === tool && (m.role || 'default') === role);
    if (idx === -1) return null;
    const meta = pending[idx];
    pending.splice(idx, 1);
    writePending(pending);
    if (!meta.at || Date.now() - meta.at > 5 * 60 * 1000) return null;

    if (typeof caches === 'undefined') return null;
    const cache = await caches.open(CACHE_NAME);
    const url = meta.url || cacheUrlFor(tool, meta.role || 'default');
    const res = await cache.match(url);
    if (!res) return null;
    const blob = await res.blob();
    await cache.delete(url);
    return { blob, filename: meta.filename, mimeType: meta.mimeType };
  } catch {
    return null;
  }
}
