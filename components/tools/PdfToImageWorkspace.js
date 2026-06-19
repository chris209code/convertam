'use client';

import { useState } from 'react';
import Script from 'next/script';
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

export default function PdfToImageWorkspace({ format }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [zipReady, setZipReady] = useState(false);

  function handleFiles(files) {
    setError('');
    setStatus('');
    setFile(files[0] || null);
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
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';

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

      <UploadBox accept="application/pdf" multiple={false} onFiles={handleFiles} />

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
