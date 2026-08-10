'use client';

import { useState } from 'react';
import { pickGoogleDriveFile, isGoogleDriveConfigured } from './googlePicker';
import { pickDropboxFile, isDropboxConfigured } from './dropboxChooser';

// A row of "or upload from..." buttons for cloud storage providers, dropped
// in alongside the existing native file input everywhere someone can
// upload a document. Deliberately renders nothing for a provider whose
// credentials aren't configured (see the env vars documented in
// .env.local.example) rather than showing a button that would just error —
// on a site with neither configured, this whole component is invisible.
//
// Apple/iCloud isn't a separate button here: there's no public "iCloud
// picker" SDK the way Google and Dropbox ship one. On iOS/iPadOS/macOS
// Safari, the plain native file input this sits next to ALREADY opens the
// system's own file browser, which includes iCloud Drive and the Files app
// — that's handled for free by the browser, not something to reimplement.
export default function CloudUploadButtons({ accept, onFile, disabled }) {
  const [busyProvider, setBusyProvider] = useState(null);
  const [error, setError] = useState('');

  if (!isGoogleDriveConfigured && !isDropboxConfigured) return null;

  async function handlePick(providerLabel, pickFn) {
    setError('');
    setBusyProvider(providerLabel);
    try {
      const file = await pickFn({ accept });
      onFile(file);
    } catch (err) {
      if (err.message !== 'CANCELLED') setError(`Could not get that file from ${providerLabel}. Please try again.`);
    } finally {
      setBusyProvider(null);
    }
  }

  // preventDefault + stopPropagation on every button: this component is
  // meant to be usable inside a click-to-browse dropzone (a <label> wrapping
  // a hidden file input, or a div with its own onClick), and without both
  // of these a click here would ALSO trigger that ancestor's native "open
  // the file picker" behavior — preventDefault stops a <label>'s built-in
  // click-forwarding to its input specifically (stopPropagation alone
  // doesn't, since that forwarding isn't a bubbling listener).
  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
      <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Or upload from:</span>
      {isGoogleDriveConfigured && (
        <button
          type="button"
          disabled={disabled || Boolean(busyProvider)}
          onClick={(e) => { stop(e); handlePick('Google Drive', pickGoogleDriveFile); }}
          style={cloudBtnStyle}
        >
          {busyProvider === 'Google Drive' ? 'Opening…' : 'Google Drive'}
        </button>
      )}
      {isDropboxConfigured && (
        <button
          type="button"
          disabled={disabled || Boolean(busyProvider)}
          onClick={(e) => { stop(e); handlePick('Dropbox', pickDropboxFile); }}
          style={cloudBtnStyle}
        >
          {busyProvider === 'Dropbox' ? 'Opening…' : 'Dropbox'}
        </button>
      )}
      {error && <div className="status error" style={{ width: '100%', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

const cloudBtnStyle = {
  padding: '5px 12px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white',
  color: '#334155', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
