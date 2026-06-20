'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { runCloudConvertJob, downloadBlob } from '@/lib/cloudconvert-client';

const PROFILES = [
  { id: 'web', label: 'Smaller file (web/sharing)' },
  { id: 'print', label: 'Balanced (print quality)' },
  { id: 'max', label: 'Maximum compression' },
];

export default function CompressPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [profile, setProfile] = useState('web');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [savings, setSavings] = useState(null);

  function handleFiles(files) {
    setError('');
    setStatus('');
    setSavings(null);
    setFile(files[0] || null);
  }

  async function handleCompress() {
    if (!file) return;
    setBusy(true);
    setError('');
    setSavings(null);
    try {
      const { blob, filename } = await runCloudConvertJob({
        file,
        operation: 'optimize',
        profile,
        onStatus: setStatus,
      });

      if (file.size > 0) {
        const reduction = Math.round((1 - blob.size / file.size) * 100);
        setSavings(reduction);
      }

      downloadBlob(blob, filename || 'convertam-compressed.pdf');
      setStatus('Done — your compressed file has downloaded.');
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
      <UploadBox accept="application/pdf" multiple={false} onFiles={handleFiles} />

      {file && (
        <div className="file-list">
          <div className="file-row">
            <span className="badge">PDF</span>
            <span className="name">{file.name}</span>
            <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            <button className="remove" onClick={() => setFile(null)} aria-label="Remove file">
              ×
            </button>
          </div>
        </div>
      )}

      {file && (
        <div className="mt-4">
          <label className="text-sm font-medium block mb-2">Compression level</label>
          <div className="flex gap-2 flex-wrap">
            {PROFILES.map((p) => (
              <button
                key={p.id}
                onClick={() => setProfile(p.id)}
                className={`btn-ghost-sm ${profile === p.id ? 'active-choice' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="actions">
        <button className="btn btn-primary" disabled={!file || busy} onClick={handleCompress}>
          {busy ? 'Compressing…' : 'Compress PDF'}
        </button>
      </div>

      {status && <div className="status success">{status}</div>}
      {savings !== null && (
        <div className="status success">
          {savings > 0
            ? `File size reduced by about ${savings}%.`
            : 'Compressed — size reduction varies depending on the original file.'}
        </div>
      )}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">Your file is sent securely for compression and deleted automatically afterward.</p>
    </div>
  );
}
