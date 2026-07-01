'use client';

import { useState, useRef, useEffect } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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

export default function OverlayTextWorkspace() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // array of { canvas, width, height }
  const [currentPage, setCurrentPage] = useState(0);
  const [textItems, setTextItems] = useState([]); // { page, x, y, text, fontSize, color }
  const [activeItem, setActiveItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [fontSize, setFontSize] = useState(12);
  const [fontColor, setFontColor] = useState('#000000');
  const containerRef = useRef();

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfjsReady(true);
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  async function handleFile(e) {
    const f = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!f) return;
    if (!pdfjsReady) { setError('Still loading, try again in a second.'); return; }
    setFile(f);
    setError('');
    setStatus('Loading PDF…');
    setBusy(true);
    try {
      const buf = await f.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const rendered = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        rendered.push({ canvas, width: viewport.width, height: viewport.height, scale: 1.5 });
      }
      setPages(rendered);
      setTextItems([]);
      setCurrentPage(0);
      setStep(2);
      setStatus('');
    } catch (err) {
      setError('Could not read this PDF. Make sure it is not password-protected.');
    } finally {
      setBusy(false);
    }
  }

  function handleCanvasClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();
    const newItem = { id, page: currentPage, x, y, text: '', fontSize, color: fontColor };
    setTextItems(prev => [...prev, newItem]);
    setActiveItem(id);
  }

  function updateText(id, text) {
    setTextItems(prev => prev.map(item => item.id === id ? { ...item, text } : item));
  }

  function updateItem(id, key, value) {
    setTextItems(prev => prev.map(item => item.id === id ? { ...item, [key]: value } : item));
  }

  function removeItem(id) {
    setTextItems(prev => prev.filter(item => item.id !== id));
    if (activeItem === id) setActiveItem(null);
  }

  async function handleDownload() {
    if (!file) return;
    setBusy(true);
    setStatus('Generating PDF…');
    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pdfPages = pdfDoc.getPages();

      for (const item of textItems) {
        if (!item.text.trim()) continue;
        const page = pdfPages[item.page];
        const { width, height } = page.getSize();
        const scale = pages[item.page].scale;
        const canvasH = pages[item.page].height;

        // Convert canvas coords to PDF coords
        const pdfX = (item.x / scale);
        const pdfY = height - (item.y / scale) - item.fontSize;

        // Parse color
        const hex = item.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        page.drawText(item.text, {
          x: pdfX,
          y: pdfY,
          size: item.fontSize,
          font,
          color: rgb(r, g, b),
        });
      }

      const bytes = await pdfDoc.save();
      const baseName = file.name.replace('.pdf', '');
      downloadBlob(new Blob([bytes], { type: 'application/pdf' }), `${baseName}-filled.pdf`);
      setStatus('Done — your PDF has downloaded.');
      setStep(3);
    } catch (err) {
      console.error(err);
      setError('Could not generate the PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPages([]);
    setTextItems([]);
    setActiveItem(null);
    setStep(1);
    setStatus('');
    setError('');
    setCurrentPage(0);
  }

  const currentPageItems = textItems.filter(item => item.page === currentPage);

  return (
    <div className="panel">

      {/* Step 1 — Upload */}
      {step === 1 && (
        <div>
          <p className="text-sm text-ink-soft mb-4">
            Upload any PDF — scanned forms, bank forms, government documents — and click anywhere to type text directly onto it.
          </p>
          <label
            className="dropzone block cursor-pointer"
            onDragOver={e => e.preventDefault()}
            onDrop={handleFile}
          >
            <input type="file" accept="application/pdf" onChange={handleFile} hidden />
            <div className="dz-icon">[ PDF ]</div>
            <div className="dz-main">Click to choose a PDF, or drag it here</div>
            <div className="dz-sub">Works on scanned PDFs, printed forms, bank forms — any PDF.</div>
          </label>
          {!pdfjsReady && <p className="text-xs text-ink-soft mt-2">Loading PDF viewer…</p>}
          {status && <div className="status">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      {/* Step 2 — Edit */}
      {step === 2 && pages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="font-semibold text-ink text-sm">{file?.name}</p>
              <p className="text-xs text-ink-soft">{pages.length} page{pages.length !== 1 ? 's' : ''} · Click anywhere on the page to add text</p>
            </div>
            <button className="btn-ghost-sm" onClick={reset}>Change file</button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 mb-3 flex-wrap p-3 rounded-xl" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-soft">Size:</label>
              <select
                value={fontSize}
                onChange={e => setFontSize(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1"
                style={{ borderColor: '#e2dcc9' }}
              >
                {[8, 10, 11, 12, 14, 16, 18, 20, 24].map(s => (
                  <option key={s} value={s}>{s}pt</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-ink-soft">Color:</label>
              <input
                type="color"
                value={fontColor}
                onChange={e => setFontColor(e.target.value)}
                className="w-8 h-7 rounded cursor-pointer border"
                style={{ borderColor: '#e2dcc9' }}
              />
            </div>
            <p className="text-xs text-ink-soft ml-auto">👆 Click on the PDF below to place text</p>
          </div>

          {/* Page navigation */}
          {pages.length > 1 && (
            <div className="flex items-center gap-2 mb-3">
              <button
                className="btn-ghost-sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => p - 1)}
              >← Prev</button>
              <span className="text-xs text-ink-soft">Page {currentPage + 1} of {pages.length}</span>
              <button
                className="btn-ghost-sm"
                disabled={currentPage === pages.length - 1}
                onClick={() => setCurrentPage(p => p + 1)}
              >Next →</button>
            </div>
          )}

          {/* PDF Canvas */}
          <div
            ref={containerRef}
            className="relative border rounded-xl overflow-auto mb-4 cursor-crosshair"
            style={{ borderColor: '#e2dcc9', maxHeight: '600px' }}
            onClick={handleCanvasClick}
          >
            <img
              src={pages[currentPage].canvas.toDataURL()}
              alt={`Page ${currentPage + 1}`}
              style={{ display: 'block', width: '100%', userSelect: 'none' }}
              draggable={false}
            />

            {/* Text overlays */}
            {currentPageItems.map(item => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: item.x,
                  top: item.y,
                  zIndex: 10,
                }}
                onClick={e => { e.stopPropagation(); setActiveItem(item.id); }}
              >
                <input
                  autoFocus={activeItem === item.id}
                  type="text"
                  value={item.text}
                  onChange={e => updateText(item.id, e.target.value)}
                  placeholder="Type here…"
                  style={{
                    fontSize: `${item.fontSize}px`,
                    color: item.color,
                    background: activeItem === item.id ? 'rgba(255,255,255,0.85)' : 'transparent',
                    border: activeItem === item.id ? '1px dashed #2563EB' : '1px dashed transparent',
                    outline: 'none',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    minWidth: '80px',
                    fontFamily: 'Helvetica, Arial, sans-serif',
                  }}
                />
                {activeItem === item.id && (
                  <button
                    onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                    style={{
                      position: 'absolute', top: -8, right: -8,
                      width: 16, height: 16, borderRadius: '50%',
                      background: '#ef4444', color: 'white',
                      border: 'none', cursor: 'pointer',
                      fontSize: '10px', lineHeight: '16px', textAlign: 'center',
                    }}
                  >×</button>
                )}
              </div>
            ))}
          </div>

          {textItems.length > 0 && (
            <p className="text-xs text-ink-soft mb-3">
              {textItems.length} text item{textItems.length !== 1 ? 's' : ''} added across {pages.length > 1 ? 'all pages' : 'this page'}.
            </p>
          )}

          {error && <div className="status error mb-3">{error}</div>}

          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={busy || textItems.filter(i => i.text.trim()).length === 0}
              onClick={handleDownload}
            >
              {busy ? 'Generating…' : 'Download Filled PDF'}
            </button>
            <button className="btn btn-ghost" onClick={reset}>Start over</button>
          </div>

          {status && <div className="status success">{status}</div>}
        </div>
      )}

      {/* Step 3 — Done */}
      {step === 3 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">✅</div>
          <h3 className="font-semibold text-ink text-lg mb-2">PDF filled successfully!</h3>
          <p className="text-sm text-ink-soft mb-6">Your filled PDF has downloaded to your device.</p>
          <div className="actions justify-center">
            <button className="btn btn-primary" onClick={reset}>Fill another PDF</button>
          </div>
        </div>
      )}

      <p className="privacy-note">Processed entirely in your browser — your documents never leave your device.</p>
    </div>
  );
}
