'use client';

import { useState } from 'react';
import Script from 'next/script';
import UploadBox from '@/components/UploadBox';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import { canPullSessionDocument } from '@/lib/workspace/toolCompatibility';

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

// Formerly two separate routes (pdf-to-jpg, pdf-to-png) sharing this exact
// component with only a fixed output-format prop differing between them —
// a textbook "cookie-cutter" duplicate-page pattern. Consolidated onto the
// single pdf-to-jpg route with a real in-page format toggle instead; the
// old /pdf-to-png URL now 301-redirects here (see next.config.js).
const FORMATS = [
  { value: 'jpg', label: 'JPG', mime: 'image/jpeg' },
  { value: 'png', label: 'PNG', mime: 'image/png' },
];

export default function PdfToImageWorkspace({ format: initialFormat }) {
  const { session, startSession, getDocumentAsFile } = useDocumentSession();
  const [format, setFormat] = useState(initialFormat === 'png' ? 'png' : 'jpg');
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [zipReady, setZipReady] = useState(false);

  const toolSlug = 'pdf-to-jpg';
  const pullEnabled = canPullSessionDocument(toolSlug);

  function handleFiles(files, { fromSession = false } = {}) {
    setError('');
    setStatus('');
    const f = files[0] || null;
    setFile(f);
    if (pullEnabled && f && !fromSession) {
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        startSession(f, { toolSlug });
      }
    }
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    if (f) handleFiles([f], { fromSession: true });
  }

  async function handleConvert() {
    if (!file || !window.pdfjsLib || !window.JSZip) return;
    setBusy(true);
    setError('');
    setStatus('Reading pages…');
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const zip = new window.JSZip();
      const mime = FORMATS.find((f) => f.value === format).mime;

      for (let i = 1; i <= pdf.numPages; i++) {
        setStatus(`Rendering page ${i} of ${pdf.numPages}…`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.92));
        zip.file(`page-${i}.${format}`, blob);
      }

      if (pdf.numPages === 1) {
        const blob = await zip.file(`page-1.${format}`).async('blob');
        downloadBlob(blob, `convertam-page.${format}`);
      } else {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `convertam-pages-${format}.zip`);
      }
      setStatus('Done — check your downloads.');
    } catch (err) {
      console.error(err);
      setError('Could not read that PDF. It may be scanned as one giant image, corrupted, or password-protected.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => setPdfjsReady(true)}
      />
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
        onLoad={() => setZipReady(true)}
      />

      {pullEnabled && !file && session.status === 'active' && session.document && (
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

      <UploadBox accept="application/pdf" multiple={false} onFiles={handleFiles} compact={!!file} />

      {file && (
        <div className="file-list">
          <div className="file-row">
            <span className="badge">PDF</span>
            <span className="name">{file.name}</span>
            <button className="remove" onClick={() => setFile(null)} aria-label="Remove file">
              ×
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {FORMATS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFormat(f.value)}
            disabled={busy}
            style={{
              padding: '8px 16px', borderRadius: 8, cursor: busy ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit',
              border: format === f.value ? '2px solid #2563EB' : '1px solid #E2E8F0',
              background: format === f.value ? '#EFF6FF' : 'white',
              color: format === f.value ? '#2563EB' : '#475569',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="actions">
        <button
          className="btn btn-primary"
          disabled={!file || busy || !pdfjsReady || !zipReady}
          onClick={handleConvert}
        >
          {busy ? 'Working…' : `Convert to ${format.toUpperCase()}`}
        </button>
      </div>

      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">Processed entirely in your browser — nothing is uploaded.</p>
    </div>
  );
}
