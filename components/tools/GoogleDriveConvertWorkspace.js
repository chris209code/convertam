'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';

// Must be a multiple of 256KB per Google's resumable upload protocol — 3.5MB keeps
// each individual request comfortably under Vercel's server request-size limit.
const CHUNK_SIZE = 3670016;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function GoogleDriveConvertWorkspace({
  accept,
  sourceMimeType,
  googleNativeType,
  exportMimeType,
  downloadExt,
  toLabel,
}) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function handleFiles(files) {
    setError('');
    setStatus('');
    setFile(files[0] || null);
  }

  async function handleConvert() {
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError('File is larger than the 100MB limit.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      setStatus('Starting…');
      const startRes = await fetch('/api/gdrive/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, sourceMimeType, googleNativeType }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Could not start the conversion.');

      const uploadUrl = startData.uploadUrl;
      let fileId = null;
      let offset = 0;

      while (offset < file.size) {
        const end = Math.min(offset + CHUNK_SIZE, file.size);
        const chunk = file.slice(offset, end);
        const pct = Math.round((offset / file.size) * 100);
        setStatus(`Uploading… ${pct}%`);

        const chunkForm = new FormData();
        chunkForm.append('uploadUrl', uploadUrl);
        chunkForm.append('chunk', chunk);
        chunkForm.append('rangeStart', String(offset));
        chunkForm.append('rangeEnd', String(end - 1));
        chunkForm.append('totalSize', String(file.size));

        const chunkRes = await fetch('/api/gdrive/upload-chunk', { method: 'POST', body: chunkForm });
        const chunkData = await chunkRes.json();
        if (!chunkRes.ok) throw new Error(chunkData.error || 'Upload failed partway through.');

        if (chunkData.status === 'complete') {
          fileId = chunkData.fileId;
          break;
        }
        offset = end;
      }

      if (!fileId) throw new Error('Upload did not complete. Please try again.');

      setStatus('Converting…');
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const downloadName = `${baseName}.${downloadExt}`;
      const exportRes = await fetch('/api/gdrive/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, exportMimeType, filename: downloadName }),
      });

      if (!exportRes.ok) {
        const data = await exportRes.json().catch(() => ({}));
        throw new Error(data.error || 'Conversion failed.');
      }

      const blob = await exportRes.blob();
      downloadBlob(blob, downloadName);
      setStatus('Done — your file has downloaded.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <UploadBox accept={accept} multiple={false} onFiles={handleFiles} maxSizeLabel="Max 100MB for now." />

      {file && (
        <div className="file-list">
          <div className="file-row">
            <span className="badge">{(file.name.split('.').pop() || 'FILE').toUpperCase()}</span>
            <span className="name">{file.name}</span>
            <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            <button className="remove" onClick={() => setFile(null)} aria-label="Remove file">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="actions">
        <button className="btn btn-primary" disabled={!file || busy} onClick={handleConvert}>
          {busy ? 'Working…' : `Convert to ${toLabel}`}
        </button>
      </div>

      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">Your file is converted securely and deleted automatically afterward.</p>
    </div>
  );
}
