'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { readPdfMetadata, removeMetadata } from '@/lib/pdf-tools';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

const FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'subject', label: 'Subject' },
  { key: 'keywords', label: 'Keywords' },
  { key: 'creator', label: 'Creator (app)' },
  { key: 'producer', label: 'Producer (app)' },
];

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

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString();
  } catch {
    return '';
  }
}

export default function RemovePdfMetadataWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [resultBytes, setResultBytes] = useState(null);
  const [usingSessionDoc, setUsingSessionDoc] = useState(false);

  async function handleFiles(files, { fromSession = false } = {}) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setError('');
    setStatus('');
    setResultBytes(null);
    setMetadata(null);
    setReading(true);
    try {
      const meta = await readPdfMetadata(f);
      setMetadata(meta);
    } catch {
      setError("Could not read this PDF. Make sure it's a valid, non-password-protected file.");
    }
    setReading(false);

    if (fromSession) {
      setUsingSessionDoc(true);
    } else {
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        startSession(f, { toolSlug: 'remove-pdf-metadata' });
      }
    }
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    await handleFiles([f], { fromSession: true });
  }

  const hasAnyMetadata = metadata && (
    FIELDS.some((f) => metadata[f.key]) || metadata.creationDate || metadata.modificationDate
  );

  async function handleRemove() {
    if (!file) return;
    setBusy(true);
    setError('');
    setStatus('Removing metadata…');
    try {
      const bytes = await removeMetadata(file);
      setResultBytes(bytes);
      await updateDocument(bytes, { toolSlug: 'remove-pdf-metadata', label: 'Metadata removed' });
      setStatus('Metadata removed — choose what to do next.');
    } catch {
      setError("Could not process this PDF. Make sure it's a valid, non-password-protected file.");
      setStatus('');
    }
    setBusy(false);
  }

  function downloadResult() {
    if (!resultBytes) return;
    downloadBlob(new Blob([resultBytes], { type: 'application/pdf' }), 'convertam-cleaned.pdf');
  }

  function reset() {
    setFile(null);
    setMetadata(null);
    setStatus('');
    setError('');
    setResultBytes(null);
    setUsingSessionDoc(false);
  }

  return (
    <div className="panel">
      {!file && session.status === 'active' && session.document && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Continue with {session.document.name}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
              {session.document.pageCount ? `${session.document.pageCount} pages · ` : ''}already in this session — no need to re-upload.
            </div>
          </div>
          <button onClick={continueWithSessionDocument} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            Continue
          </button>
        </div>
      )}

      <UploadBox accept="application/pdf" onFiles={handleFiles} compact={!!file} />

      {file && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: '0.85rem', color: '#1E293B', fontWeight: 600, marginBottom: 12 }}>
            {file.name}{usingSessionDoc ? ' (from session)' : ''}
          </div>

          {reading && <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Reading metadata…</p>}

          {!reading && metadata && (
            <div style={{ marginBottom: 16 }}>
              {!hasAnyMetadata ? (
                <div style={{ padding: 14, borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#166534', fontSize: '0.85rem' }}>
                  No metadata was found in this PDF — it already looks clean.
                </div>
              ) : (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
                  {FIELDS.filter((f) => metadata[f.key]).map(({ key, label }) => (
                    <div key={key} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '0.82rem' }}>
                      <span style={{ width: 110, flexShrink: 0, color: '#64748B', fontWeight: 600 }}>{label}</span>
                      <span style={{ color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{metadata[key]}</span>
                    </div>
                  ))}
                  {metadata.creationDate && (
                    <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid #F1F5F9', fontSize: '0.82rem' }}>
                      <span style={{ width: 110, flexShrink: 0, color: '#64748B', fontWeight: 600 }}>Created</span>
                      <span style={{ color: '#1E293B' }}>{formatDate(metadata.creationDate)}</span>
                    </div>
                  )}
                  {metadata.modificationDate && (
                    <div style={{ display: 'flex', gap: 10, padding: '10px 14px', fontSize: '0.82rem' }}>
                      <span style={{ width: 110, flexShrink: 0, color: '#64748B', fontWeight: 600 }}>Modified</span>
                      <span style={{ color: '#1E293B' }}>{formatDate(metadata.modificationDate)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {!resultBytes ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleRemove}
                disabled={busy || reading || !metadata}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: busy || reading || !metadata ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: busy || reading || !metadata ? 'default' : 'pointer' }}
              >
                {busy ? 'Removing…' : 'Remove All Metadata'}
              </button>
              <button onClick={reset} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Start Over
              </button>
            </div>
          ) : (
            <ContinueWorkingPanel toolSlug="remove-pdf-metadata" documentName={file.name} onDownload={downloadResult} downloading={busy} />
          )}
        </div>
      )}

      {status && <div className="status success" style={{ marginTop: 12 }}>{status}</div>}
      {error && <div className="status error" style={{ marginTop: 12 }}>{error}</div>}
      <p className="privacy-note">Everything happens in your browser — your PDF is never uploaded to a server.</p>
    </div>
  );
}
