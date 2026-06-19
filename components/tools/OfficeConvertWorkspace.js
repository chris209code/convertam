'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';

export default function OfficeConvertWorkspace({ accept, toFormat, toLabel }) {
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
    setBusy(true);
    setError('');
    setStatus('Uploading and converting — this can take up to ~30 seconds…');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('to', toFormat);

      const res = await fetch('/api/convert', { method: 'POST', body: formData });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Conversion failed.');
      }

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="(.+)"/);
      const filename = match ? match[1] : `convertam-converted.${toFormat}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

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
      <p className="privacy-note">Your file is sent securely for conversion and deleted automatically afterward.</p>
    </div>
  );
}
