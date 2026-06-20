'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { runCloudConvertJob, downloadBlob } from '@/lib/cloudconvert-client';

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
    try {
      const { blob, filename } = await runCloudConvertJob({
        file,
        operation: 'convert',
        to: toFormat,
        onStatus: setStatus,
      });
      downloadBlob(blob, filename || `convertam-converted.${toFormat}`);
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
