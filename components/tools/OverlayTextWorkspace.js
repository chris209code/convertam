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
  const [pages, setPages] = useState([]);
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
  const [addMode, setAddMode] = useState(false); // only add text when in add mode
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
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        rendered.push({
          dataUrl: canvas.toDataURL(),
          width: viewport.width,
          height: viewport.height,
          scale: 1.5,
        });
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
    if (!addMode) return; // only add text in add mode

    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();

    // Get the actual rendered size vs natural size ratio
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    // Position relative to the image element
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const id = Date.now();
    setTextItems(prev => [...prev, {
      id,
      page: currentPage,
      x, y, // in display pixels
      scaleX, scaleY, // ratio for PDF conversion
      text: '',
      fontSize,
      color: fontColor,
    }]);
    setActiveItem(id);
    setAddMode(false); // turn off add mode after placing one box
  }

  function updateText(id, text) {
    setTextItems(prev => prev.map(item => item.id === id ? { ...item, text } : item));
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

      // Get the display image element to calculate correct coordinates
      const imgEl = document.querySelector('.pdf-display-img');
      const displayWidth = imgEl ? imgEl.getBoundingClientRect().width : pages[currentPage]?.width;
      const displayHeight = imgEl ? imgEl.getBoundingClientRect().height : pages[currentPage]?.height;

      for (const item of textItems) {
        if (!item.text.trim()) continue;
        const pdfPage = pdfPages[item.page];
        const { width: pdfW, height: pdfH } = pdfPage.getSize();
        const pageData = pages[item.page];

        // Convert display coords to PDF coords
        const ratioX = pdfW / (pageData.width / pageData.scale * pageData.scale);
        const ratioY = pdfH / (pageData.height / pageData.scale * pageData.scale);

        // item.x and item.y are in display pixels
        // We need to find out how big the image is displayed
        const imgDisplayWidth = pageData.width; // canvas width at scale 1.5
        const imgDisplayHeight = pageData.height;

        // The img element stretches to fill container width
        // We need the actual rendered size
        const imgW = imgEl ? imgEl.offsetWidth : imgDisplayWidth;
        const imgH = imgEl ? imgEl.offsetHeight : imgDisplayHeight;

        const pdfX = (item.x / imgW) * pdfW;
        const pdfY = pdfH - (item.y / imgH) * pdfH - item.fontSize;

        const hex = item.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) / 255;
        const g = parseInt(hex.substring(2, 4), 16) / 255;
        const b = parseInt(hex.substring(4, 6), 16) / 255;

        pdfPage.drawText(item.text, {
          x: Math.max(0, pdfX),
          y: Math.max(0, pdfY),
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
      setError('Could not generate PDF. Please try again.');
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
    setAddMode(false);
  }

  const currentPageItems = textItems.filter(item => item.page === currentPage);
  const filledItems = textItems.filter(i => i.text.trim());

  return (
    <div className="panel">

      {/* Step 1 — Upload */}
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

      {/* Step 2 — Edit */}
      {step === 2 && pages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="font-semibold text-ink text-sm">{file?.name}</p>
              <p className="text-xs text-ink-soft">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
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
              onClick={() => setAddMode(true)}
              className="btn btn-primary text-xs px-4 py-2 ml-auto"
              style={{ fontSize: '0.8rem', padding: '6px 14px' }}
            >
              {addMode ? '👆 Now click where you want to type…' : '+ Add Text'}
            </button>
          </div>

          {addMode && (
            <div className="text-xs font-semibold text-center py-2 mb-2 rounded-lg" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
              👆 Click anywhere on the PDF below to place a text box
            </div>
          )}

          {/* Page navigation */}
          {pages.length > 1 && (
            <div className="flex items-center gap-2 mb-3">
              <button className="btn-ghost-sm" disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)}>← Prev</button>
              <span className="text-xs text-ink-soft">Page {currentPage + 1} of {pages.length}</span>
              <button className="btn-ghost-sm" disabled={currentPage === pages.length - 1} onClick={() => setCurrentPage(p => p + 1)}>Next →</button>
            </div>
          )}

          {/* PDF display */}
          <div
            className="relative border rounded-xl overflow-auto mb-4"
            style={{ borderColor: '#e2dcc9', cursor: addMode ? 'crosshair' : 'default' }}
          >
            <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
              <img
                className="pdf-display-img"
                src={pages[currentPage].dataUrl}
                alt={`Page ${currentPage + 1}`}
                style={{ display: 'block', width: '100%', userSelect: 'none' }}
                draggable={false}
                onClick={handleCanvasClick}
              />

              {/* Text overlays */}
              {currentPageItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: `${(item.x / pages[currentPage].width) * 100}%`,
                    top: `${(item.y / pages[currentPage].height) * 100}%`,
                    zIndex: 10,
                    transform: 'translate(0, -50%)',
                  }}
                  onClick={e => { e.stopPropagation(); setActiveItem(item.id); }}
                >
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                    <input
                      autoFocus={activeItem === item.id}
                      type="text"
                      value={item.text}
                      onChange={e => updateText(item.id, e.target.value)}
                      style={{
                        fontSize: `${item.fontSize}px`,
                        color: item.color,
                        background: 'rgba(255,255,255,0.9)',
                        border: `1px ${activeItem === item.id ? 'solid #2563EB' : 'dashed #94a3b8'}`,
                        outline: 'none',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        width: `${Math.max(120, (item.text.length + 2) * (item.fontSize * 0.6))}px`,
                        fontFamily: 'Helvetica, Arial, sans-serif',
                        minWidth: '120px',
                      }}
                    />
                    <button
                      onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                      style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#ef4444', color: 'white',
                        border: 'none', cursor: 'pointer',
                        fontSize: '11px', lineHeight: '18px', textAlign: 'center',
                        marginLeft: 4, flexShrink: 0,
                      }}
                    >×</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {filledItems.length > 0 && (
            <p className="text-xs text-ink-soft mb-3">
              {filledItems.length} text item{filledItems.length !== 1 ? 's' : ''} added.
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
