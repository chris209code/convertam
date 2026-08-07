'use client';

import { useEffect, useRef, useState } from 'react';
import { isolateSignature } from '@/lib/signatureIsolation';

const DRAW_W = 320;
const DRAW_H = 110;
const INITIALS_DRAW_W = 160;
const INITIALS_DRAW_H = 90;

function tabBtn(active) {
  return {
    padding: '5px 12px', borderRadius: 6, border: '1px solid', borderColor: active ? '#2563EB' : '#E2E8F0',
    background: active ? '#EFF6FF' : 'white', color: active ? '#1D4ED8' : '#64748B', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.76rem', fontWeight: 600,
  };
}
function ghostBtn() {
  return { padding: '6px 12px', borderRadius: 7, border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' };
}
function primaryBtn(disabled) {
  return { padding: '6px 14px', borderRadius: 7, border: 'none', background: disabled ? '#94A3B8' : '#2563EB', color: 'white', fontSize: '0.76rem', fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit' };
}

function renderTypedDataUrl(text, w, h) {
  const canvas = document.createElement('canvas');
  const scale = 3;
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0F172A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let size = h * 0.5 * scale;
  ctx.font = `${size}px 'Brush Script MT', 'Segoe Script', 'Bradley Hand', cursive`;
  while (ctx.measureText(text).width > canvas.width * 0.92 && size > 10) {
    size -= 2;
    ctx.font = `${size}px 'Brush Script MT', 'Segoe Script', 'Bradley Hand', cursive`;
  }
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  return canvas.toDataURL('image/png');
}

function DrawCanvas({ width, height, onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  function pos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (width / r.width), y: (e.clientY - r.top) * (height / r.height) };
  }
  function start(e) {
    drawingRef.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }
  function move(e) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasStrokes(true);
    onChange(canvasRef.current.toDataURL('image/png'), true);
  }
  function end() { drawingRef.current = false; }
  function clear() {
    canvasRef.current.getContext('2d').clearRect(0, 0, width, height);
    setHasStrokes(false);
    onChange(null, false);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        style={{ border: '1px solid #E2E8F0', borderRadius: 8, background: 'white', cursor: 'crosshair', touchAction: 'none', display: 'block' }}
      />
      <button type="button" onClick={clear} disabled={!hasStrokes} style={{ ...ghostBtn(), marginTop: 6, opacity: hasStrokes ? 1 : 0.5 }}>Clear</button>
    </div>
  );
}

// Signature/initials capture — typed (cursive font render), drawn
// (freehand canvas, same technique as invoice-studio/SignatureDraw.js), or
// uploaded (photo of a real signature, auto-isolated via
// lib/signatureIsolation.js). Calls onCapture(dataUrl, kind) once when the
// user confirms — placement/resizing on the page happens the same way as
// any other raster annotation from there.
//
// Originally built for Annotate PDF, then reused by Write on PDF, then
// moved here (matching the precedent set by useObjectHistory.js/
// useKeyboardShortcuts.js/coordinateTransform.js/ThumbnailRail.js/
// fontResolver.js) once PDF Layout Studio needed the identical pad.
export default function SignaturePad({ onCapture }) {
  const [kind, setKind] = useState('signature'); // 'signature' | 'initials'
  const [method, setMethod] = useState('type'); // 'type' | 'draw' | 'upload'
  const [typedText, setTypedText] = useState('');
  const [drawnDataUrl, setDrawnDataUrl] = useState(null);
  const [uploadedDataUrl, setUploadedDataUrl] = useState(null);
  const [uploadNotice, setUploadNotice] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setTypedText('');
    setDrawnDataUrl(null);
    setUploadedDataUrl(null);
    setUploadNotice('');
  }, [kind, method]);

  const drawW = kind === 'initials' ? INITIALS_DRAW_W : DRAW_W;
  const drawH = kind === 'initials' ? INITIALS_DRAW_H : DRAW_H;

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const img = new Image();
    img.onload = () => {
      const { dataUrl: isolated, reliable } = isolateSignature(img);
      setUploadedDataUrl(isolated);
      setUploadNotice(reliable ? '' : "Couldn't automatically isolate the ink — using the photo as uploaded. Crop it after placing if needed.");
    };
    img.src = dataUrl;
  }

  function confirm() {
    if (method === 'type') {
      if (!typedText.trim()) return;
      onCapture(renderTypedDataUrl(typedText.trim(), drawW, drawH), kind);
    } else if (method === 'draw') {
      if (!drawnDataUrl) return;
      onCapture(drawnDataUrl, kind);
    } else if (method === 'upload') {
      if (!uploadedDataUrl) return;
      onCapture(uploadedDataUrl, kind);
    }
  }

  const canConfirm = (method === 'type' && typedText.trim()) || (method === 'draw' && drawnDataUrl) || (method === 'upload' && uploadedDataUrl);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12, padding: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setKind('signature')} style={tabBtn(kind === 'signature')}>✍️ Signature</button>
        <button onClick={() => setKind('initials')} style={tabBtn(kind === 'initials')}>🔤 Initials</button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => setMethod('type')} style={tabBtn(method === 'type')}>Type</button>
        <button onClick={() => setMethod('draw')} style={tabBtn(method === 'draw')}>Draw</button>
        <button onClick={() => setMethod('upload')} style={tabBtn(method === 'upload')}>Upload</button>
      </div>

      {method === 'type' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            type="text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            placeholder={kind === 'initials' ? 'Your initials' : 'Your full name'}
            style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '0.85rem', maxWidth: 260 }}
          />
          {typedText.trim() && (
            <div style={{ width: drawW, height: drawH, border: '1px dashed #CBD5E1', borderRadius: 8, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Brush Script MT', 'Segoe Script', 'Bradley Hand', cursive", fontSize: kind === 'initials' ? '1.8rem' : '2.2rem', color: '#0F172A' }}>{typedText}</span>
            </div>
          )}
        </div>
      )}

      {method === 'draw' && (
        <DrawCanvas width={drawW} height={drawH} onChange={(dataUrl) => setDrawnDataUrl(dataUrl)} />
      )}

      {method === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ ...ghostBtn(), display: 'inline-flex', alignItems: 'center', width: 'fit-content' }}>
            📤 Choose photo…
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} />
          </label>
          {uploadedDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={uploadedDataUrl} alt="Uploaded signature preview" style={{ maxWidth: drawW, maxHeight: drawH, border: '1px dashed #CBD5E1', borderRadius: 8, background: 'white' }} />
          )}
          {uploadNotice && <p style={{ fontSize: '0.72rem', color: '#B45309', margin: 0 }}>{uploadNotice}</p>}
        </div>
      )}

      <div>
        <button onClick={confirm} disabled={!canConfirm} style={primaryBtn(!canConfirm)}>
          Place {kind === 'initials' ? 'Initials' : 'Signature'} on Page
        </button>
      </div>
    </div>
  );
}
