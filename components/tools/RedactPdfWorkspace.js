'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Script from 'next/script';

export default function RedactPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // { canvas, width, height, rects: [{x,y,w,h}] }
  const [activePage, setActivePage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [drawing, setDrawing] = useState(null); // { startX, startY }

  const canvasRef = useRef(null);

  async function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!window.pdfjsLib) {
      setError('Still loading — please wait a moment and try again.');
      return;
    }
    setFile(f);
    setLoading(true);
    setError('');
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await f.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const loadedPages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        loadedPages.push({ canvas, width: viewport.width, height: viewport.height, rects: [] });
      }
      setPages(loadedPages);
    } catch (err) {
      console.error(err);
      setError('Could not read this PDF. Please try another file.');
    } finally {
      setLoading(false);
    }
  }

  const drawDisplay = useCallback(() => {
    const displayCanvas = canvasRef.current;
    const page = pages[activePage];
    if (!displayCanvas || !page) return;
    displayCanvas.width = page.width;
    displayCanvas.height = page.height;
    const ctx = displayCanvas.getContext('2d');
    ctx.drawImage(page.canvas, 0, 0);
    ctx.fillStyle = '#000000';
    page.rects.forEach((r) => ctx.fillRect(r.x, r.y, r.w, r.h));
  }, [pages, activePage]);

  useEffect(() => { drawDisplay(); }, [drawDisplay]);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function onPointerDown(e) {
    setDrawing(getPos(e));
  }
  function onPointerMove(e) {
    if (!drawing) return;
    const pos = getPos(e);
    drawDisplay();
    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(Math.min(drawing.x, pos.x), Math.min(drawing.y, pos.y), Math.abs(pos.x - drawing.x), Math.abs(pos.y - drawing.y));
  }
  function onPointerUp(e) {
    if (!drawing) return;
    const pos = getPos(e);
    const rect = { x: Math.min(drawing.x, pos.x), y: Math.min(drawing.y, pos.y), w: Math.abs(pos.x - drawing.x), h: Math.abs(pos.y - drawing.y) };
    setDrawing(null);
    if (rect.w > 4 && rect.h > 4) {
      setPages((prev) => prev.map((p, i) => i === activePage ? { ...p, rects: [...p.rects, rect] } : p));
    }
  }

  function undoLast() {
    setPages((prev) => prev.map((p, i) => i === activePage ? { ...p, rects: p.rects.slice(0, -1) } : p));
  }
  function clearPage() {
    setPages((prev) => prev.map((p, i) => i === activePage ? { ...p, rects: [] } : p));
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();

      for (const p of pages) {
        // Bake the black boxes into the actual pixels, then rebuild the page
        // as a flattened image — this is what makes the redaction real:
        // there's no text layer left underneath to select or copy.
        const flat = document.createElement('canvas');
        flat.width = p.width;
        flat.height = p.height;
        const ctx = flat.getContext('2d');
        ctx.drawImage(p.canvas, 0, 0);
        ctx.fillStyle = '#000000';
        p.rects.forEach((r) => ctx.fillRect(r.x, r.y, r.w, r.h));

        const dataUrl = flat.toDataURL('image/png');
        const bytes = await (await fetch(dataUrl)).arrayBuffer();
        const embedded = await pdfDoc.embedPng(bytes);
        const page = pdfDoc.addPage([p.width, p.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: p.width, height: p.height });
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (file?.name || 'document').replace(/\.pdf$/i, '') + '-redacted.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  const totalRects = pages.reduce((sum, p) => sum + p.rects.length, 0);

  if (!file || pages.length === 0) {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a PDF to redact</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Draw black boxes over anything sensitive — names, account numbers, signatures. It's genuinely removed, not just covered up.</p>
          <input type="file" accept="application/pdf" onChange={handleFile} />
          {loading && <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 12 }}>Loading pages…</p>}
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setActivePage((p) => Math.max(0, p - 1))} disabled={activePage === 0} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Page {activePage + 1} of {pages.length}</span>
          <button onClick={() => setActivePage((p) => Math.min(pages.length - 1, p + 1))} disabled={activePage === pages.length - 1} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>→</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={undoLast} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Undo Last</button>
          <button onClick={clearPage} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Clear Page</button>
        </div>
      </div>

      <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>Click and drag on the page below to draw a redaction box.</p>

      <div style={{ display: 'flex', justifyContent: 'center', background: '#F1F5F9', borderRadius: 12, padding: 16, marginBottom: 20, overflow: 'auto' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ maxWidth: '100%', cursor: 'crosshair', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', touchAction: 'none' }}
        />
      </div>

      <button onClick={handleDownload} disabled={busy || totalRects === 0} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: (busy || totalRects === 0) ? '#94A3B8' : '#DC2626', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: (busy || totalRects === 0) ? 'default' : 'pointer' }}>
        {busy ? 'Applying redactions…' : `⬇ Download Redacted PDF (${totalRects} redaction${totalRects === 1 ? '' : 's'} across all pages)`}
      </button>

      <p className="privacy-note">Your document is processed entirely in your browser — never uploaded to a server.</p>
    </div>
  );
}
