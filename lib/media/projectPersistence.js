// Auto-save/restore for the Video Editor's in-memory timeline. Everything in
// a `timeline` object (see createTimeline() in timeline.js) is either plain
// JSON or a File object living on a source — no live DOM/decoder objects,
// no blob: URLs baked in — so the whole thing is directly IndexedDB-clonable
// (structured clone supports File/Blob natively) with no manual
// serialize/reconstruct step. Restoring just means handing the cloned
// timeline back to setTimeline(); every <video>/<img> element, object URL,
// thumbnail, etc. gets lazily rebuilt from source.file exactly as it would
// for a fresh upload.
const DB_NAME = 'convertam-video-editor';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const RECORD_KEY = 'autosave';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// A timeline with no sources yet (the empty starting state) is never worth
// persisting — saving it on every mount would just race the real
// restore-check below and could clobber a genuine save with nothing.
export function isWorthSaving(timeline) {
  return !!(timeline && timeline.sources && timeline.sources.length > 0);
}

export async function saveProject(timeline) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ timeline, savedAt: Date.now() }, RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// Returns { timeline, savedAt } or null if nothing's saved.
export async function loadProject() {
  const db = await openDB();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return record;
}

export async function clearProject() {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(RECORD_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
