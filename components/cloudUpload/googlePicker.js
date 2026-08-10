'use client';

import { loadScript } from './loadScript';

// Distinct from lib/google-auth.js — that one signs requests as OUR OWN
// Google service account for the Google Drive Convert tool's server-side
// conversion pipeline (app/api/gdrive/*). This picker instead authenticates
// as the VISITOR, via a client-side OAuth consent popup, purely so they can
// pick a file already sitting in THEIR Drive — no server involvement, no
// shared credentials with that other feature.
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_PICKER_CLIENT_ID;
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

export const isGoogleDriveConfigured = Boolean(API_KEY && CLIENT_ID);

let pickerLibReady = null;
async function ensurePickerLib() {
  await loadScript('https://apis.google.com/js/api.js');
  if (!pickerLibReady) {
    pickerLibReady = new Promise((resolve) => {
      window.gapi.load('picker', { callback: resolve });
    });
  }
  return pickerLibReady;
}

// Best-effort mapping from the `accept` string our upload inputs already
// use (e.g. "application/pdf", "image/*") to Picker's mimeTypes filter —
// only narrows what's shown, never blocks picking if it can't map cleanly.
function mimeTypesForAccept(accept) {
  if (!accept) return null;
  if (accept.includes('pdf')) return 'application/pdf';
  if (accept.includes('image')) return 'image/png,image/jpeg,image/gif,image/webp,image/bmp,image/tiff';
  return null;
}

// Resolves with a real File object containing the picked file's bytes, or
// rejects with Error('CANCELLED') if the user closes the picker/consent
// popup without choosing anything. Only works for actual binary files
// (PDFs, images, ...) uploaded into Drive — a native Google Doc/Sheet/Slide
// can't be read this way (that needs Drive's separate `files.export`
// endpoint with a target format, which is a different, bigger feature);
// the mimeTypes filter above keeps native docs out of the picker for our
// supported accept types so this limitation shouldn't surface in practice.
export async function pickGoogleDriveFile({ accept } = {}) {
  if (!isGoogleDriveConfigured) throw new Error('Google Drive upload is not configured on this site yet.');

  await loadScript('https://accounts.google.com/gsi/client');
  await ensurePickerLib();

  const accessToken = await new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error) reject(new Error('CANCELLED'));
        else resolve(resp.access_token);
      },
    });
    client.requestAccessToken();
  });

  const pickedDoc = await new Promise((resolve, reject) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setIncludeFolders(false)
      .setSelectFolderEnabled(false);
    const mimeTypes = mimeTypesForAccept(accept);
    if (mimeTypes) view.setMimeTypes(mimeTypes);

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .setCallback((data) => {
        if (data.action === window.google.picker.Action.PICKED) resolve(data.docs[0]);
        else if (data.action === window.google.picker.Action.CANCEL) reject(new Error('CANCELLED'));
      })
      .build();
    picker.setVisible(true);
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${pickedDoc.id}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Could not download that file from Google Drive.');
  const blob = await res.blob();
  return new File([blob], pickedDoc.name, { type: pickedDoc.mimeType || blob.type });
}
