'use client';

import { useState } from 'react';
import UploadBox from '@/components/UploadBox';
import { cropPdf } from '@/lib/pdf-tools';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

const PRESETS = [
  { label: 'None', value: 0 },
  { label: 'Trim margins', value: 5 },
  { label: 'Tight crop', value: 15 },
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

function clampMargin(n) {
  if (Number.isNaN(n)) return 0;
  return Math.min(45, Math.max(0, n));
}

export default function CropPdfWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [pageCount, setPageCount] = useState(null);
  const [crop, setCrop] = useState({ top: 5, right: 5, bottom: 5, left: 5 });
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
    setPreviewUrl(null);
    setPreviewLoading(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      const buffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      setPageCount(pdf.numPages);
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1.4 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      setPreviewUrl(canvas.toDataURL());
    } catch {
      // Preview rendering failed (e.g. an unusual PDF, or a network hiccup
      // loading the pdf.js worker) — cropping itself only needs pdf-lib, so
      // this isn't fatal. Fall back to the no-preview message below instead
      // of blocking the user with an error.
    }
    setPreviewLoading(false);

    if (fromSession) {
      setUsingSessionDoc(true);
    } else {
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        startSession(f, { toolSlug: 'crop-pdf' });
      }
    }
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    await handleFiles([f], { fromSession: true });
  }

  function setMargin(side, raw) {
    setCrop((prev) => ({ ...prev, [side]: clampMargin(Number(raw)) }));
    setResultBytes(null);
  }

  function applyPreset(value) {
    setCrop({ top: value, right: value, bottom: value, left: value });
    setResultBytes(null);
  }

  const invalid = crop.left + crop.right >= 90 || crop.top + crop.bottom >= 90;
  const noCrop = crop.top === 0 && crop.right === 0 && crop.bottom === 0 && crop.left === 0;

  async function handleCrop() {
    if (!file || invalid || noCrop) return;
    setBusy(true);
    setError('');
    setStatus('Cropping…');
    try {
      const fractions = { top: crop.top / 100, right: crop.right / 100, bottom: crop.bottom / 100, left: crop.left / 100 };
      const bytes = await cropPdf(file, fractions);
      setResultBytes(bytes);
      await updateDocument(bytes, { toolSlug: 'crop-pdf', label: 'Cropped' });
      setStatus('Cropped — choose what to do next.');
    } catch {
      setError("Could not crop this PDF. Make sure it's a valid, non-password-protected file.");
      setStatus('');
    }
    setBusy(false);
  }

  function downloadResult() {
    if (!resultBytes) return;
    downloadBlob(new Blob([resultBytes], { type: 'application/pdf' }), 'convertam-cropped.pdf');
  }

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setPageCount(null);
    setCrop({ top: 5, right: 5, bottom: 5, left: 5 });
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
            {file.name}{usingSessionDoc ? ' (from session)' : ''}{pageCount ? ` — crop will apply to all ${pageCount} page${pageCount > 1 ? 's' : ''}` : ''}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: '#F1F5F9', borderRadius: 12, marginBottom: 16 }}>
            {previewLoading && <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Loading preview…</p>}
            {!previewLoading && previewUrl && (
              <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Page 1 preview" style={{ display: 'block', maxWidth: '100%', maxHeight: 380, borderRadius: 4, boxShadow: '0 4px 16px rgba(15,23,42,0.18)' }} />
                <div
                  style={{
                    position: 'absolute',
                    top: `${crop.top}%`, right: `${crop.right}%`, bottom: `${crop.bottom}%`, left: `${crop.left}%`,
                    border: '2px solid #2563EB',
                    boxShadow: '0 0 0 9999px rgba(15,23,42,0.45)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            )}
            {!previewLoading && !previewUrl && <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Preview unavailable — cropping will still apply on download.</p>}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>Crop margin</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map((p) => {
                const active = crop.top === p.value && crop.right === p.value && crop.bottom === p.value && crop.left === p.value;
                return (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.value)}
                    style={{
                      padding: '8px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      border: active ? '1px solid #2563EB' : '1px solid #E2E8F0',
                      background: active ? '#EFF6FF' : 'white',
                      color: active ? '#2563EB' : '#475569',
                    }}
                  >
                    {p.label}{p.value > 0 ? ` (${p.value}%)` : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 16 }}>
            {[
              { key: 'top', label: 'Top' },
              { key: 'right', label: 'Right' },
              { key: 'bottom', label: 'Bottom' },
              { key: 'left', label: 'Left' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', marginBottom: 4 }}>{label} (%)</label>
                <input
                  type="number"
                  min="0"
                  max="45"
                  value={crop[key]}
                  onChange={(e) => setMargin(key, e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit' }}
                />
              </div>
            ))}
          </div>

          {invalid && <div className="status error" style={{ marginBottom: 12 }}>These margins would leave nothing on the page — reduce them.</div>}

          {!resultBytes ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleCrop}
                disabled={busy || invalid || noCrop}
                style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: busy || invalid || noCrop ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: busy || invalid || noCrop ? 'default' : 'pointer' }}
              >
                {busy ? 'Cropping…' : noCrop ? 'Set a margin above' : 'Crop PDF'}
              </button>
              <button onClick={reset} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                Start Over
              </button>
            </div>
          ) : (
            <ContinueWorkingPanel toolSlug="crop-pdf" documentName={file.name} onDownload={downloadResult} downloading={busy} />
          )}
        </div>
      )}

      {status && <div className="status success" style={{ marginTop: 12 }}>{status}</div>}
      {error && <div className="status error" style={{ marginTop: 12 }}>{error}</div>}
      <p className="privacy-note">Everything happens in your browser — your PDF is never uploaded to a server.</p>
    </div>
  );
}
