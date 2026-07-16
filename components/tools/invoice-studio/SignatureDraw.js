'use client';

import { useRef, useState } from 'react';

const CANVAS_W = 280;
const CANVAS_H = 100;

// Freehand signature capture on a transparent canvas — exported as a PNG
// data URL so it composites over the invoice like an uploaded signature
// image (same `signature.src` field, `mode: 'image'`).
export default function SignatureDraw({ onSave }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  function pos(e) {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (CANVAS_W / r.width), y: (e.clientY - r.top) * (CANVAS_H / r.height) };
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
  }

  function end() {
    drawingRef.current = false;
  }

  function clear() {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    setHasStrokes(false);
  }

  function save() {
    if (!hasStrokes) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  }

  const smallBtnGhost = { padding: '6px 14px', borderRadius: 7, border: '1px solid #E2E6ED', background: '#fff', color: '#334155', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
  const smallBtn = { ...smallBtnGhost, border: 'none', background: '#2563EB', color: '#fff', opacity: hasStrokes ? 1 : 0.5, cursor: hasStrokes ? 'pointer' : 'default' };

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        style={{ border: '1px solid #E2E6ED', borderRadius: 8, width: '100%', background: '#fff', cursor: 'crosshair', touchAction: 'none' }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={clear} style={smallBtnGhost}>Clear</button>
        <button type="button" onClick={save} disabled={!hasStrokes} style={smallBtn}>Save Signature</button>
      </div>
    </div>
  );
}
