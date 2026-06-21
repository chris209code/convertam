'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';

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

      setStatus('Uploading…');
      const uploadRes = await fetch(startData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': sourceMimeType },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Upload failed. Please try again.');
      const uploaded = await uploadRes.json();

      setStatus('Converting…');
      const baseName = file.name.replace(/\.[^.]+$/, '');
      const exportRes = await fetch('/api/gdrive/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: uploaded.id,
          exportMimeType,
          filename: `${baseName}.${downloadExt}`,
        }),
      });

      if (!exportRes.ok) {
        const data = await exportRes.json().catch(() => ({}));
        throw new Error(data.error || 'Conversion failed.');
      }

      const blob = await exportRes.blob();
      downloadBlob(blob, `${baseName}.${downloadExt}`);
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
      <UploadBox accept={accept} multiple={false} onFiles={handleFiles} />

      {file && (
        <div className="file-list">
          <div className="file-row">
            <span className="badge">{(file.name.split('.').pop() || 'FILE').toUpperCase()}</span>
            <span className="name">{file.name}</span>
            <button className="remove" onClick={() => setFile(null)} aria-label="Remove file">
              ×
            </button>
          </div>
        </div>
      )}

      <div className="actions">
        <button className="btn btn-primary" disabled={!file || busy} onClick={handleConvert}>
          {busy ? 'Converting…' : `Convert to ${toLabel}`}
        </button>
      </div>

      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">Your file is converted securely and deleted automatically afterward.</p>
    </div>
  );
}
