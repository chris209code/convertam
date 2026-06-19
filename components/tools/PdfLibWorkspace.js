'use client';

import { useState } from 'react';
import JSZip from 'jszip';
import UploadBox from '@/components/UploadBox';
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  extractPages,
  imagesToPdf,
  getPdfPageCount,
} from '@/lib/pdf-tools';

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

function actionLabel(mode) {
  return (
    {
      merge: 'Merge PDFs',
      split: 'Split PDF',
      rotate: 'Rotate PDF',
      extract: 'Extract pages',
      'image-to-pdf': 'Convert to PDF',
    }[mode] || 'Convert'
  );
}

export default function PdfLibWorkspace({ mode, accept: acceptProp }) {
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState(90);
  const [range, setRange] = useState('');
  const [pageCount, setPageCount] = useState(null);
  const [busy, setBusy] = useState(false);

  const multiple = mode === 'merge' || mode === 'image-to-pdf';
  const accept = acceptProp || (mode === 'image-to-pdf' ? 'image/*' : 'application/pdf');

  async function handleFiles(newFiles) {
    setError('');
    setStatus('');
    const list = multiple ? [...files, ...newFiles] : newFiles.slice(0, 1);
    setFiles(list);
    if (!multiple && list[0] && mode !== 'image-to-pdf') {
      try {
        setPageCount(await getPdfPageCount(list[0]));
      } catch {
        setPageCount(null);
      }
    }
  }

  function removeFile(i) {
    setFiles(files.filter((_, idx) => idx !== i));
  }

  function clearAll() {
    setFiles([]);
    setStatus('');
    setError('');
    setPageCount(null);
    setRange('');
  }

  async function handleRun() {
    if (files.length === 0) return;
    setBusy(true);
    setError('');
    setStatus('Working on it…');
    try {
      if (mode === 'merge') {
        const bytes = await mergePdfs(files);
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'convertam-merged.pdf');
      } else if (mode === 'image-to-pdf') {
        const bytes = await imagesToPdf(files);
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'convertam-images.pdf');
      } else if (mode === 'rotate') {
        const bytes = await rotatePdf(files[0], rotation);
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'convertam-rotated.pdf');
      } else if (mode === 'extract') {
        if (!range.trim()) {
          setError('Tell us which pages to extract, e.g. 1-3,5');
          setBusy(false);
          setStatus('');
          return;
        }
        const bytes = await extractPages(files[0], range, pageCount || 9999);
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'convertam-extracted.pdf');
      } else if (mode === 'split') {
        const parts = await splitPdf(files[0]);
        if (parts.length === 1) {
          downloadBlob(new Blob([parts[0].bytes], { type: 'application/pdf' }), parts[0].name);
        } else {
          const zip = new JSZip();
          parts.forEach((p) => zip.file(p.name, p.bytes));
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          downloadBlob(zipBlob, 'convertam-split-pages.zip');
        }
      }
      setStatus('Done — check your downloads.');
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not process that file. Make sure it's a valid, non-password-protected PDF.");
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <UploadBox accept={accept} multiple={multiple} onFiles={handleFiles} />

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="file-row">
              <span className="badge">{(f.name.split('.').pop() || 'FILE').toUpperCase()}</span>
              <span className="name">{f.name}</span>
              <button className="remove" onClick={() => removeFile(i)} aria-label="Remove file">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === 'rotate' && files.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium block mb-2">Rotate by</label>
          <div className="flex gap-2">
            {[90, 180, 270].map((d) => (
              <button
                key={d}
                onClick={() => setRotation(d)}
                className={`btn-ghost-sm ${rotation === d ? 'active-choice' : ''}`}
              >
                {d}°
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'extract' && files.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium block mb-2">
            Which pages?{pageCount ? ` (this file has ${pageCount} pages)` : ''}
          </label>
          <input
            type="text"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="e.g. 1-3,5,8-9"
            className="range-input"
          />
        </div>
      )}

      <div className="actions">
        <button className="btn btn-primary" disabled={files.length === 0 || busy} onClick={handleRun}>
          {busy ? 'Working…' : actionLabel(mode)}
        </button>
        {files.length > 0 && (
          <button className="btn btn-ghost" onClick={clearAll}>
            Clear
          </button>
        )}
      </div>

      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">Processed entirely in your browser — your file is never uploaded anywhere.</p>
    </div>
  );
}
