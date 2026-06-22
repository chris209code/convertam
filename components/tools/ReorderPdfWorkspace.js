'use client';

import { useState, useRef } from 'react';
import Script from 'next/script';
import { PDFDocument } from 'pdf-lib';

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

export default function ReorderPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // { index: original index, dataUrl }
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  async function handleFile(e) {
    const f = e.target.files[0];
    if (!f || !window.pdfjsLib) return;
    setFile(f);
    setError('');
    setStatus('Loading pages…');
    setBusy(true);

    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await f.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const rendered = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        setStatus(`Loading page ${i} of ${pdf.numPages}…`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        rendered.push({ index: i - 1, dataUrl: canvas.toDataURL('image/jpeg', 0.7) });
      }

      setPages(rendered);
      setStatus('');
    } catch (err) {
      setError('Could not read that PDF. Make sure it is not password-protected.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  // Drag and drop reordering
  function onDragStart(i) {
    dragItem.current = i;
  }

  function onDragEnter(i) {
    dragOver.current = i;
  }

  function onDragEnd() {
    if (dragItem.current === null || dragOver.current === null) return;
    if (dragItem.current === dragOver.current) return;

    const reordered = [...pages];
    const dragged = reordered.splice(dragItem.current, 1)[0];
    reordered.splice(dragOver.current, 0, dragged);
    setPages(reordered);
    dragItem.current = null;
    dragOver.current = null;
  }

  // Touch drag support for mobile
  const touchStartY = useRef(0);
  const touchDragItem = useRef(null);

  function onTouchStart(e, i) {
    touchDragItem.current = i;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e, i) {
    if (touchDragItem.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const diff = endY - touchStartY.current;
    const cardHeight = 140; // approx thumbnail height
    const steps = Math.round(diff / cardHeight);
    if (steps === 0) { touchDragItem.current = null; return; }

    const from = touchDragItem.current;
    const to = Math.max(0, Math.min(pages.length - 1, from + steps));
    const reordered = [...pages];
    const dragged = reordered.splice(from, 1)[0];
    reordered.splice(to, 0, dragged);
    setPages(reordered);
    touchDragItem.current = null;
  }

  async function handleDownload() {
    if (!file || pages.length === 0) return;
    setBusy(true);
    setStatus('Building your reordered PDF…');
    try {
      const pdfBytes = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(pdfBytes);
      const newDoc = await PDFDocument.create();

      const newOrder = pages.map((p) => p.index);
      const copied = await newDoc.copyPages(srcDoc, newOrder);
      copied.forEach((page) => newDoc.addPage(page));

      const bytes = await newDoc.save();
      const baseName = file.name.replace('.pdf', '');
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}-reordered.pdf`);
      setStatus('Done — your reordered PDF has downloaded.');
    } catch (err) {
      console.error(err);
      setError('Could not build the PDF. Please try again.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPages([]);
    setStatus('');
    setError('');
  }

  return (
    <div className="panel">
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
        onLoad={() => setPdfjsReady(true)}
      />

      {!file && (
        <div>
          <p className="text-sm text-ink-soft mb-4">
            Upload a PDF — we'll show you all the pages as thumbnails. Drag them into any order, then download.
          </p>
          <label className="dropzone block cursor-pointer">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFile}
              disabled={!pdfjsReady}
              hidden
            />
            <div className="dz-icon">[ PDF ]</div>
            <div className="dz-main">Click to choose a PDF, or drag it here</div>
            <div className="dz-sub">Processed entirely in your browser.</div>
          </label>
          {status && <div className="status">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      {pages.length > 0 && (
        <div>
          <p className="text-sm text-ink-soft mb-4">
            Drag the pages into the order you want, then click Download.
          </p>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}
          >
            {pages.map((page, i) => (
              <div
                key={`${page.index}-${i}`}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragEnter={() => onDragEnter(i)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                onTouchStart={(e) => onTouchStart(e, i)}
                onTouchEnd={(e) => onTouchEnd(e, i)}
                className="rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-105"
                style={{ borderColor: '#e2dcc9', background: '#fff' }}
              >
                <img
                  src={page.dataUrl}
                  alt={`Page ${page.index + 1}`}
                  className="w-full"
                  draggable={false}
                />
                <div
                  className="text-center py-1 font-mono text-xs"
                  style={{ color: '#9a9490', background: '#f7f4ec' }}
                >
                  p.{i + 1}
                  {page.index !== i && (
                    <span style={{ color: '#e2962c' }}> ←{page.index + 1}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="actions mt-5">
            <button className="btn btn-primary" disabled={busy} onClick={handleDownload}>
              {busy ? 'Building…' : 'Download reordered PDF'}
            </button>
            <button className="btn btn-ghost" onClick={reset}>
              Start over
            </button>
          </div>

          {status && <div className="status success">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      <p className="privacy-note">Processed entirely in your browser — your file is never uploaded anywhere.</p>
    </div>
  );
}
