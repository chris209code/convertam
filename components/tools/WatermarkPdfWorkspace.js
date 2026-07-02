'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PDFDocument, rgb, degrees } from 'pdf-lib';
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

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

const PRESETS = ['CONFIDENTIAL', 'DRAFT', 'COPY', 'APPROVED', 'REJECTED', 'DO NOT DISTRIBUTE'];
const OPACITIES = [
  { id: 0.15, label: 'Light' },
  { id: 0.35, label: 'Medium' },
  { id: 0.6, label: 'Strong' },
];
const COLORS = [
  { id: '#888888', label: 'Grey' },
  { id: '#cc0000', label: 'Red' },
  { id: '#0044cc', label: 'Blue' },
  { id: '#e2962c', label: 'Amber' },
  { id: '#1a7a3a', label: 'Green' },
];

export default function WatermarkPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.35);
  const [color, setColor] = useState('#888888');
  const [customColor, setCustomColor] = useState('#888888');
  const [useCustomColor, setUseCustomColor] = useState(false);
  const [angle, setAngle] = useState(45);
  const [pages, setPages] = useState('all');
  const [pageRange, setPageRange] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [pageCanvas, setPageCanvas] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [posX, setPosX] = useState(0.5);
  const [posY, setPosY] = useState(0.5);
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef();
  const dragStart = useRef(null);

  const draw = useCallback(() => {
    if (!pageCanvas || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = pageCanvas.width;
    const h = pageCanvas.height;
    canvas.width = w;
    canvas.height = h;
    ctx.drawImage(pageCanvas, 0, 0);

    const displayFontSize = fontSize * 2;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = useCustomColor ? customColor : color;
    ctx.font = `bold ${displayFontSize}px Helvetica, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = posX * w;
    const cy = posY * h;
    ctx.translate(cx, cy);
    ctx.rotate((-angle * Math.PI) / 180);
    ctx.fillText(text || 'WATERMARK', 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.arc(posX * w, posY * h, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(37,99,235,0.6)';
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [pageCanvas, text, fontSize, opacity, color, customColor, useCustomColor, angle, posX, posY]);

  useEffect(() => { draw(); }, [draw]);

  async function handleFiles(files) {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setError(''); setStatus(''); setPageCanvas(null);
    setPosX(0.5); setPosY(0.5);
    setPreviewing(true);

    try {
      let pdfjs = window.pdfjsLib;
      if (!pdfjs) {
        await new Promise((resolve, reject) => {
          const existing = document.querySelector('script[src*="pdf.min.js"]');
          if (existing) { resolve(); return; }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
        pdfjs = window.pdfjsLib;
        if (!pdfjs) return;
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }

      const buf = await f.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas');
      c.width = viewport.width;
      c.height = viewport.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport }).promise;
      setPageCanvas(c);
    } catch (err) {
      console.error('Preview error:', err);
      setError('Could not render preview. Watermark will still apply on download.');
    } finally {
      setPreviewing(false);
    }
  }

  function getCanvasPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height,
    };
  }

  function onMouseDown(e) {
    e.preventDefault();
    const pos = getCanvasPos(e);
    const dist = Math.sqrt(Math.pow(pos.x - posX, 2) + Math.pow(pos.y - posY, 2));
    if (dist < 0.08) {
      setDragging(true);
      dragStart.current = { dx: pos.x - posX, dy: pos.y - posY };
    } else {
      setPosX(Math.max(0, Math.min(1, pos.x)));
      setPosY(Math.max(0, Math.min(1, pos.y)));
    }
  }

  function onMouseMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const pos = getCanvasPos(e);
    setPosX(Math.max(0, Math.min(1, pos.x - dragStart.current.dx)));
    setPosY(Math.max(0, Math.min(1, pos.y - dragStart.current.dy)));
  }

  function onMouseUp() { setDragging(false); }

  async function handleApply() {
    if (!file || !text.trim()) {
      setError('Please upload a PDF and enter watermark text.');
      return;
    }
    setBusy(true); setError(''); setStatus('Applying watermark…');
    try {
      const pdfBytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(pdfBytes);
      const allPages = doc.getPages();
      const totalPages = allPages.length;

      let targetIndices = [];
      if (pages === 'all') {
        targetIndices = allPages.map((_, i) => i);
      } else if (pages === 'first') {
        targetIndices = [0];
      } else if (pages === 'range' && pageRange.trim()) {
        pageRange.split(',').forEach((part) => {
          part = part.trim();
          if (part.includes('-')) {
            const [a, b] = part.split('-').map((n) => parseInt(n) - 1);
            for (let i = a; i <= b; i++) {
              if (i >= 0 && i < totalPages) targetIndices.push(i);
            }
          } else {
            const n = parseInt(part) - 1;
            if (n >= 0 && n < totalPages) targetIndices.push(n);
          }
        });
      }

      const finalColor = hexToRgb(useCustomColor ? customColor : color);

      for (const idx of targetIndices) {
        const page = allPages[idx];
        const { width, height } = page.getSize();

        // Center text around the blue dot position
        const approxTextWidth = text.length * fontSize * 0.5;
        const angleRad = (angle * Math.PI) / 180;

        const pdfX = (posX * width) - (approxTextWidth / 2) * Math.cos(angleRad) + (fontSize / 2) * Math.sin(angleRad);
        const pdfY = (1 - posY) * height - (approxTextWidth / 2) * Math.sin(angleRad) - (fontSize / 2) * Math.cos(angleRad);

        page.drawText(text.trim(), {
          x: Math.max(0, pdfX),
          y: Math.max(0, pdfY),
          size: fontSize,
          color: finalColor,
          opacity,
          rotate: degrees(angle),
        });
      }

      const signed = await doc.save();
      const baseName = file.name.replace('.pdf', '');
      downloadBlob(new Blob([signed], { type: 'application/pdf' }), `${baseName}-watermarked.pdf`);
      setStatus(`Done — watermark applied to ${targetIndices.length} page${targetIndices.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      console.error(err);
      setError('Could not apply watermark. Make sure the PDF is not password-protected.');
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">

      {!file && (
        <UploadBox accept="application/pdf" multiple={false} onFiles={handleFiles}
          label="Click to choose a PDF, or drag it here" />
      )}

      {file && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm mb-5"
          style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
          <span className="font-medium text-ink">📄 {file.name}</span>
          <button onClick={() => { setFile(null); setPageCanvas(null); setStatus(''); setError(''); }}
            className="text-xs text-ink-soft underline ml-3">Change</button>
        </div>
      )}

      <div className="mb-4">
        <label className="text-sm font-medium block mb-2">Watermark text</label>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Type your watermark text" className="range-input" maxLength={60} />
        <div className="flex gap-2 flex-wrap mt-2">
          {PRESETS.map((p) => (
            <button key={p} onClick={() => setText(p)}
              className={`btn-ghost-sm ${text === p ? 'active-choice' : ''}`}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium block mb-2">Size — {fontSize}pt</label>
          <div className="flex gap-2 flex-wrap">
            {[24, 36, 48, 64, 80].map((s) => (
              <button key={s} onClick={() => setFontSize(s)}
                className={`btn-ghost-sm ${fontSize === s ? 'active-choice' : ''}`}>
                {s === 24 ? 'XS' : s === 36 ? 'S' : s === 48 ? 'M' : s === 64 ? 'L' : 'XL'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium block mb-2">Opacity</label>
          <div className="flex gap-2">
            {OPACITIES.map((o) => (
              <button key={o.id} onClick={() => setOpacity(o.id)}
                className={`btn-ghost-sm ${opacity === o.id ? 'active-choice' : ''}`}>{o.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="text-sm font-medium block mb-2">Color</label>
        <div className="flex gap-2 flex-wrap items-center">
          {COLORS.map((c) => (
            <button key={c.id} onClick={() => { setColor(c.id); setUseCustomColor(false); }}
              className={`btn-ghost-sm flex items-center gap-1.5 ${!useCustomColor && color === c.id ? 'active-choice' : ''}`}>
              <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ background: c.id }} />
              {c.label}
            </button>
          ))}
          <label className={`btn-ghost-sm flex items-center gap-1.5 cursor-pointer ${useCustomColor ? 'active-choice' : ''}`}>
            <input type="color" value={customColor}
              onChange={(e) => { setCustomColor(e.target.value); setUseCustomColor(true); }}
              className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent" />
            Custom
          </label>
        </div>
      </div>

      <div className="mb-5">
        <label className="text-sm font-medium block mb-2">Rotation — {angle}°</label>
        <input type="range" min={0} max={360} value={angle}
          onChange={(e) => setAngle(Number(e.target.value))}
          className="w-full" style={{ accentColor: '#2563EB' }} />
        <div className="flex justify-between text-xs text-ink-soft mt-1">
          <span>0° horizontal</span>
          <span>45° diagonal</span>
          <span>90° vertical</span>
        </div>
      </div>

      {previewing && (
        <div className="text-center py-8 rounded-xl mb-4 text-sm font-medium"
          style={{ background: '#f0f5ff', border: '1px solid #d0dcf5', color: '#3a63b8' }}>
          ⏳ Loading preview…
        </div>
      )}

      {pageCanvas && !previewing && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-widest mb-2">
            👁 Live Preview — click anywhere to move watermark
          </p>
          <div className="border rounded-xl overflow-hidden"
            style={{ borderColor: '#2563EB', cursor: dragging ? 'grabbing' : 'crosshair' }}>
            <canvas
              ref={canvasRef}
              style={{ width: '100%', display: 'block', touchAction: 'none' }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onMouseDown}
              onTouchMove={onMouseMove}
              onTouchEnd={onMouseUp}
            />
          </div>
          <p className="text-xs text-ink-soft mt-1">Click anywhere on the preview to move the watermark. Use the rotation slider to rotate it.</p>
        </div>
      )}

      <div className="mb-5">
        <label className="text-sm font-medium block mb-2">Apply to</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: 'all', label: 'All pages' },
            { id: 'first', label: 'First page only' },
            { id: 'range', label: 'Specific pages' },
          ].map((p) => (
            <button key={p.id} onClick={() => setPages(p.id)}
              className={`btn-ghost-sm ${pages === p.id ? 'active-choice' : ''}`}>{p.label}</button>
          ))}
        </div>
        {pages === 'range' && (
          <input type="text" value={pageRange} onChange={(e) => setPageRange(e.target.value)}
            placeholder="e.g. 1,3,5-8" className="range-input mt-2" />
        )}
      </div>

      <div className="actions">
        <button className="btn btn-primary" disabled={!file || !text.trim() || busy} onClick={handleApply}>
          {busy ? 'Applying…' : 'Apply Watermark & Download'}
        </button>
        {file && (
          <button className="btn btn-ghost" onClick={() => { setFile(null); setStatus(''); setError(''); setPageCanvas(null); }}>
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
