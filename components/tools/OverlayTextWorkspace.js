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
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [textItems, setTextItems] = useState([]);
  const [activeItem, setActiveItem] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const [fontSize, setFontSize] = useState(11);
  const [fontColor, setFontColor] = useState('#000000');
  const [addMode, setAddMode] = useState(false);
  const imgRef = useRef();

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
          canvasWidth: viewport.width,
          canvasHeight: viewport.height,
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
    if (!addMode) return;

    const img = imgRef.current;
    if (!img) return;

    const rect = img.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const id = Date.now();
    setTextItems(prev => [...prev, {
      id,
      page: currentPage,
      x, y,
      displayWidth: rect.width,
      displayHeight: rect.height,
      text: '',
      fontSize,
      color: fontColor,
    }]);
    setActiveItem(id);
    setAddMode(false);
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

      for (const item of textItems) {
        if (!item.text.trim()) continue;
        const pdfPage = pdfPages[item.page];
        const { width: pdfW, height: pdfH } = pdfPage.getSize();

        const pdfX = (item.x / item.displayWidth) * pdfW;
        // Add item.fontSize to push text UP to match where user clicked on screen
        const pdfY = pdfH - (item.y / item.displayHeight) * pdfH + item.fontSize;

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

      {step === 2 && pages.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <p className="font-semibold text-ink text-sm">{file?.name}</p>
              <p className="text-xs text-ink-soft">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
            </div>
            <button className="btn-ghost-sm" onClick={reset}>Change file</button>
          </div>

          {/* Instructions */}
          <div className="mb-3 p-3 rounded-xl text-xs" style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e' }}>
            <p className="font-semibold mb-1">📝 How to fill this form:</p>
            <ol className="list-decimal list-inside flex flex-col gap-0.5">
              <li>Set your font size and color below</li>
              <li>Click <strong>"+ Add Text"</strong> button</li>
              <li>Click exactly where you want to type on the PDF</li>
              <li>Type your text in the box that appears</li>
              <li>Repeat steps 2–4 for each field you want to fill</li>
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
              onClick={() => setAddMode(true)}
              className="btn btn-primary ml-auto"
              style={{ fontSize: '0.8rem', padding: '6px 16px' }}
            >
              + Add Text
            </button>
          </div>

          {addMode && (
            <div className="text-xs font-semibold text-center py-2 mb-2 rounded-lg" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac' }}>
              ✅ Add mode ON — click anywhere on the PDF below to place your text
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
            className="relative border rounded-xl mb-4 overflow-hidden"
            style={{ borderColor: '#e2dcc9', cursor: addMode ? 'crosshair' : 'default' }}
          >
            <img
              ref={imgRef}
              src={pages[currentPage].dataUrl}
              alt={`Page ${currentPage + 1}`}
              style={{ display: 'block', width: '100%', userSelect: 'none' }}
              draggable={false}
              onClick={handleCanvasClick}
            />

            {currentPageItems.map(item => (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  left: `${(item.x / item.displayWidth) * 100}%`,
                  top: `${(item.y / item.displayHeight) * 100}%`,
                  zIndex: 10,
                  transform: 'translateY(-50%)',
                }}
                onClick={e => { e.stopPropagation(); setActiveItem(item.id); }}
              >
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <input
                    autoFocus={activeItem === item.id}
                    type="text"
                    value={item.text}
                    onChange={e => updateText(item.id, e.target.value)}
                    style={{
                      fontSize: `${item.fontSize}px`,
                      color: item.color,
                      background: 'rgba(255,255,255,0.92)',
                      border: `1.5px ${activeItem === item.id ? 'solid #2563EB' : 'dashed #94a3b8'}`,
                      outline: 'none',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      width: `${Math.max(100, (item.text.length + 4) * (item.fontSize * 0.62))}px`,
                      fontFamily: 'Helvetica, Arial, sans-serif',
                      minWidth: '100px',
                      maxWidth: '300px',
                    }}
                  />
                  <button
                    onClick={e => { e.stopPropagation(); removeItem(item.id); }}
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#ef4444', color: 'white',
                      border: 'none', cursor: 'pointer',
                      fontSize: '11px', lineHeight: '18px', textAlign: 'center',
                      flexShrink: 0,
                    }}
                  >×</button>
                </div>
              </div>
            ))}
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
