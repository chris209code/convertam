'use client';

// Dropbox's Chooser widget is the simplest of the three by design — no
// OAuth consent flow, no server involvement. The script tag itself must
// carry the app key as a `data-app-key` attribute BEFORE it executes
// (Dropbox reads it off its own <script id="dropboxjs"> tag on load), so
// this can't reuse the generic loadScript() helper — it needs a dedicated
// tag with that attribute set at creation time.
const APP_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY;

export const isDropboxConfigured = Boolean(APP_KEY);

function ensureDropboxScript() {
  if (document.getElementById('dropboxjs')) return;
  const script = document.createElement('script');
  script.id = 'dropboxjs';
  script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
  script.dataset.appKey = APP_KEY;
  document.body.appendChild(script);
}

function mapAcceptToExtensions(accept) {
  if (!accept) return undefined;
  if (accept.includes('pdf')) return ['.pdf'];
  if (accept.includes('image')) return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.tiff'];
  return undefined;
}

// Resolves with a real File object, or rejects with Error('CANCELLED') if
// the user closes the chooser without picking anything. `linkType: 'direct'`
// asks Dropbox for a link meant to be fetched straight from the browser
// (that's the whole point of this mode — no auth header needed, unlike the
// Google Drive picker's bearer-token download).
export function pickDropboxFile({ accept } = {}) {
  return new Promise((resolve, reject) => {
    if (!isDropboxConfigured) { reject(new Error('Dropbox upload is not configured on this site yet.')); return; }
    ensureDropboxScript();

    const deadline = Date.now() + 10000;
    (function waitForDropbox() {
      if (window.Dropbox) { openChooser(); return; }
      if (Date.now() > deadline) { reject(new Error('Could not load Dropbox.')); return; }
      setTimeout(waitForDropbox, 100);
    })();

    function openChooser() {
      window.Dropbox.choose({
        success: async (files) => {
          try {
            const picked = files[0];
            const res = await fetch(picked.link);
            if (!res.ok) throw new Error('Could not download that file from Dropbox.');
            const blob = await res.blob();
            resolve(new File([blob], picked.name, { type: blob.type }));
          } catch (err) {
            reject(err);
          }
        },
        cancel: () => reject(new Error('CANCELLED')),
        linkType: 'direct',
        multiselect: false,
        extensions: mapAcceptToExtensions(accept),
      });
    }
  });
}
