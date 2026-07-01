'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [pdfPages, setPdfPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [textItems, setTextItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [fontSize, setFontSize] = useState(12);
  const [fontColor, setFontColor] = useState('#000000');
  const [addMode, setAddMode] = useState(false);
  const canvasRef = useRef();

  useEffect(() => {
    if (window.pdfjsLib) { setPdfjsReady(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      setPdfjsReady(true);
    };
    document.body.appendChild(script);
  }, []);

  const redrawCanvas = useCallback(() => {
    if (!canvasRef.current || !pdfPages[currentPage]) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const pageData = pdfPages[currentPage];

    canvas.width = pageData.canvas.width;
    canvas.height = pageData.canvas.height;

    // Draw PDF page
    ctx.drawImage(pageData.canvas, 0, 0);

    // Draw all text items for this page
    const items = textItems.filter(i => i.page === currentPage);
    items.forEach(item => {
      // fontSize is in PDF points, scale up for canvas display
      const canvasFontSize = item.fontSize * pageData.scale;
      ctx.font = `${canvasFontSize}px Helvetica, Arial, sans-serif`;
      ctx.fillStyle = item.color;
      ctx.fillText(item.text || '', item.x, item.y);

      // Selection box
      if (item.id === activeItem) {
        const metrics = ctx.measureText(item.text || '|');
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(
          item.x - 2,
          item.y - canvasFontSize,
          Math.max(metrics.width + 10, 80),
          canvasFontSize + 6
        );
        ctx.setLineDash([]);
      }
    });
  }, [pdfPages, currentPage, textItems, activeItem]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  async function handleFile(f) {
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
        const scale = 2;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        rendered.push({ canvas, scale, pdfWidth: viewport.width / scale, pdfHeight: viewport.height / scale });
      }
      setPdfPages(rendered);
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
    if (!addMode) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const id = Date.now();
    setTextItems(prev => [...prev, {
      id,
      page: currentPage,
      x, y,
      text: '',
      fontSize, // store in PDF points
      color: fontColor,
    }]);
    setActiveItem(id);
    setAddMode(false);
    setTimeout(() => canvasRef.current?.focus(), 50);
  }

  function handleCanvasKeyDown(e) {
    // Prevent spacebar from scrolling the page
    if (e.key === ' ') e.preventDefault();
    if (!activeItem) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      setTextItems(prev => prev.map(i => i.id === activeItem ? { ...i, text: i.text.slice(0, -1) } : i));
    } else if (e.key === 'Escape') {
      setActiveItem(null);
    } else if (e.key === 'Delete') {
      setTextItems(prev => prev.filter(i => i.id !== activeItem));
      setActiveItem(null);
    } else if (e.key === 'Enter') {
      setActiveItem(null);
    } else if (e.key.length === 1) {
      setTextItems(prev => prev.map(i => i.id === activeItem ? { ...i, text: i.text + e.key } : i));
    }
  }

  async function handleDownload() {
    if (!file) return;
    setBusy(true);
    setStatus('Generating PDF…');
    try {
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      for (const item of textItems) {
        if (!item.text.trim()) continue;
        const page = pages[item.page];
        const { width: pdfW, height: pdfH } = page.getSize();
        const pageData = pdfPages[item.page];

        // item.x, item.y are in canvas pixels (at scale 2)
        // Convert to PDF points
        const pdfX = (item.x / pageData.canvas.width) * pdfW;
        // PDF Y=0 is bottom, canvas Y=0 is top
        // item.y is the baseline position in canvas pixels
        const pdfY = pdfH - (item.y / pageData.canvas.height) * pdfH;

        const hex = item.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        page.drawText(item.text, {
          x: Math.max(0, pdfX),
          y: Math.max(0, pdfY),
          size: item.fontSize, // already in PDF points
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
      setError('Could not generate PDF. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setFile(null);
    setPdfPages([]);
    setTextItems([]);
    setActiveItem(null);
    setStep(1);
    setStatus('');
    setError('');
    setCurrentPage(0);
    setAddMode(false);
  }

  const filledItems = textItems.filter(i => i.text.trim());

  return (
    <div className="panel">

      {step === 1 && (
        <div>
          <p className="text-sm text-ink-soft mb-4">
            Upload any PDF — scanned bank forms, government documents, printed forms — and type text directly onto it anywhere you want.
          </p>
          <label
            className="dropzone block cursor-pointer"
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          >
            <input type="file" accept="application/pdf" onChange={e => handleFile(e.target.files[0])} hidden />
            <div className="dz-icon">[ PDF ]</div>
            <div className="dz-main">Click to choose a PDF, or drag it here</div>
            <div className="dz-sub">Works on scanned PDFs, printed forms, bank forms — any PDF.</div>
          </label>
          {!pdfjsReady && <p className="text-xs text-ink-soft mt-2">Loading PDF viewer…</p>}
          {status && <div className="status">{status}</div>}
          {error && <div className="status error">{error}</div>}
        </div>
      )}

      {step === 2 && pdfPages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="font-semibold text-ink text-sm">{file?.name}</p>
              <p className="text-xs text-ink-soft">{pdfPages.length} page{pdfPages.length !== 1 ? 's' : ''}</p>
            </div>
            <button className="btn-ghost-sm" onClick={reset}>Change file</button>
          </div>

          {/* Instructions */}
          <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e' }}>
            <p className="font-semibold mb-1">📝 How to fill this form:</p>
            <ol className="list-decimal list-inside flex flex-col gap-0.5">
              <li>Set your font size and color</li>
              <li>Click <strong>"+ Add Text"</strong> then click where you want to type on the PDF</li>
              <li>Type your text — it appears directly on the PDF</li>
              <li>Press <strong>Enter</strong> or <strong>Escape</strong> when done with a field</li>
              <li>Click <strong>"+ Add Text"</strong> again for the next field</li>
              <li>Press <strong>Delete</strong> to remove selected text</li>
              <li>Click <strong>"Download Filled PDF"</strong> when done</li>
            </ol>
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
                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24].map(s => (
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
            <button
              onClick={() => { setAddMode(true); canvasRef.current?.focus(); }}
              className="btn btn-primary ml-auto"
              style={{ fontSize: '0.8rem', padding: '6px 16px' }}
            >
              + Add Text
            </button>
          </div>

          {addMode && (
            <div className="text-xs font-semibold text-center py-2 mb-2 rounded-lg" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
              ✅ Click anywhere on the PDF below to place your text
            </div>
          )}

          {activeItem && !addMode && (
            <div className="text-xs font-semibold text-center py-2 mb-2 rounded-lg" style={{ background: '#EFF6FF', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
              ⌨️ Type your text · Enter or Escape when done · Delete to remove
            </div>
          )}

          {/* Page navigation */}
          {pdfPages.length > 1 && (
            <div className="flex items-center gap-2 mb-3">
              <button className="btn-ghost-sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
              <span className="text-xs text-ink-soft">Page {currentPage + 1} of {pdfPages.length}</span>
              <button className="btn-ghost-sm" disabled={currentPage === pdfPages.length - 1} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
            </div>
          )}

          {/* Canvas */}
          <div className="mb-4 border rounded-xl overflow-hidden" style={{ borderColor: '#e2dcc9' }}>
            <canvas
              ref={canvasRef}
              tabIndex={0}
              onClick={handleCanvasClick}
              onKeyDown={handleCanvasKeyDown}
              style={{
                width: '100%',
                display: 'block',
                cursor: addMode ? 'crosshair' : activeItem ? 'text' : 'default',
                outline: 'none',
              }}
            />
          </div>

          {filledItems.length > 0 && (
            <p className="text-xs text-ink-soft mb-3">
              ✅ {filledItems.length} text item{filledItems.length !== 1 ? 's' : ''} added.
            </p>
          )}

          {error && <div className="status error mb-3">{error}</div>}

          <div className="actions">
            <button
              className="btn btn-primary"
              disabled={busy || filledItems.length === 0}
              onClick={handleDownload}
            >
              {busy ? 'Generating…' : 'Download Filled PDF'}
            </button>
            <button className="btn btn-ghost" onClick={reset}>Start over</button>
          </div>

          {status && <div className="status success">{status}</div>}
        </div>
      )}

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
