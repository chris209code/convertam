'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const PREVIEW_MAX = 520; // px — max width/height for the crop/preview stage
const PROCESS_MAX = 1800; // px — cap processing resolution so large phone photos stay fast

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// Standard brightness/contrast formula (contrast in -100..100, brightness in -100..100)
function applyBrightnessContrast(data, brightness, contrast) {
  const c = contrast * 2.55; // scale to -255..255
  const factor = (259 * (c + 255)) / (255 * (259 - c));
  const b = brightness * 2.55;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = clamp(factor * (data[i] - 128) + 128 + b, 0, 255);
    data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128 + b, 0, 255);
    data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128 + b, 0, 255);
  }
}

function applyGrayscale(data) {
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = data[i + 1] = data[i + 2] = g;
  }
}

function applyThreshold(data, threshold) {
  for (let i = 0; i < data.length; i += 4) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const v = g >= threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
}

// Simple unsharp-mask style sharpen via 3x3 convolution, blended by `amount` (0-100)
function applySharpen(imageData, w, h, amount) {
  if (amount <= 0) return;
  const src = imageData.data;
  const copy = new Uint8ClampedArray(src);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const strength = amount / 100;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        let k = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * w + (x + kx)) * 4 + c;
            sum += copy[idx] * kernel[k];
            k++;
          }
        }
        const idx = (y * w + x) * 4 + c;
        src[idx] = clamp(copy[idx] * (1 - strength) + sum * strength, 0, 255);
      }
    }
  }
}

// Renders the full pipeline (crop -> rotate -> pixel adjustments) into targetCanvas
function renderPipeline(targetCanvas, img, cropRectPct, rotationDeg, mode, brightness, contrast, sharpen, threshold, maxDim) {
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const cropX = cropRectPct.x * iw, cropY = cropRectPct.y * ih;
  const cropW = cropRectPct.w * iw, cropH = cropRectPct.h * ih;

  // Draw cropped region to an intermediate canvas first
  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = Math.max(1, Math.round(cropW));
  cropCanvas.height = Math.max(1, Math.round(cropH));
  const cctx = cropCanvas.getContext('2d');
  cctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropCanvas.width, cropCanvas.height);

  // Rotate into a canvas sized to fit the rotated bounding box (no clipping)
  const rad = (rotationDeg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad)), cos = Math.abs(Math.cos(rad));
  const rotW = cropCanvas.width * cos + cropCanvas.height * sin;
  const rotH = cropCanvas.width * sin + cropCanvas.height * cos;

  // Scale down for processing/display if huge
  const scale = Math.min(1, maxDim / Math.max(rotW, rotH));
  targetCanvas.width = Math.round(rotW * scale);
  targetCanvas.height = Math.round(rotH * scale);
  const ctx = targetCanvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  ctx.save();
  ctx.translate(targetCanvas.width / 2, targetCanvas.height / 2);
  ctx.rotate(rad);
  ctx.scale(scale, scale);
  ctx.drawImage(cropCanvas, -cropCanvas.width / 2, -cropCanvas.height / 2);
  ctx.restore();

  // Pixel-level adjustments
  const imageData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  if (mode === 'grayscale') applyGrayscale(imageData.data);
  if (mode === 'bw') applyThreshold(imageData.data, threshold);
  if (mode !== 'bw') applyBrightnessContrast(imageData.data, brightness, contrast);
  if (sharpen > 0 && mode !== 'bw') applySharpen(imageData, targetCanvas.width, targetCanvas.height, sharpen);
  ctx.putImageData(imageData, 0, 0);
}

const defaultCrop = { x: 0, y: 0, w: 1, h: 1 };

export default function DocumentEnhancerWorkspace() {
  const [img, setImg] = useState(null);
  const [step, setStep] = useState('upload'); // upload -> crop -> enhance
  const [cropRect, setCropRect] = useState(defaultCrop); // percentages 0-1 of natural image
  const [rotation, setRotation] = useState(0);
  const [mode, setMode] = useState('color');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [sharpen, setSharpen] = useState(0);
  const [threshold, setThreshold] = useState(128);

  const previewCanvasRef = useRef(null);
  const cropContainerRef = useRef(null);
  const dragRef = useRef(null); // { corner: 'tl'|'tr'|'bl'|'br'|'move', startRect, startX, startY }

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        setImg(image);
        setCropRect(defaultCrop);
        setRotation(0);
        setMode('color');
        setBrightness(0);
        setContrast(0);
        setSharpen(0);
        setStep('crop');
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- Crop handle dragging (pointer events cover mouse + touch) ----
  function onHandlePointerDown(corner, e) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { corner, startRect: { ...cropRect } };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }
  function onPointerMove(e) {
    if (!dragRef.current || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    const { corner, startRect } = dragRef.current;
    setCropRect((prev) => {
      let { x, y, w, h } = startRect;
      const x2 = x + w, y2 = y + h;
      if (corner === 'tl') { x = Math.min(px, x2 - 0.05); y = Math.min(py, y2 - 0.05); w = x2 - x; h = y2 - y; }
      if (corner === 'tr') { const nx2 = Math.max(px, x + 0.05); y = Math.min(py, y2 - 0.05); w = nx2 - x; h = y2 - y; }
      if (corner === 'bl') { x = Math.min(px, x2 - 0.05); const ny2 = Math.max(py, y + 0.05); w = x2 - x; h = ny2 - y; }
      if (corner === 'br') { const nx2 = Math.max(px, x + 0.05); const ny2 = Math.max(py, y + 0.05); w = nx2 - x; h = ny2 - y; }
      return { x: clamp(x, 0, 1), y: clamp(y, 0, 1), w: clamp(w, 0.05, 1), h: clamp(h, 0.05, 1) };
    });
  }
  function onPointerUp() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  const render = useCallback((maxDim) => {
    if (!img || !previewCanvasRef.current) return;
    renderPipeline(previewCanvasRef.current, img, cropRect, rotation, mode, brightness, contrast, sharpen, threshold, maxDim);
  }, [img, cropRect, rotation, mode, brightness, contrast, sharpen, threshold]);

  useEffect(() => {
    if (step === 'enhance') render(PROCESS_MAX);
  }, [step, render]);

  function applyAutoEnhance() {
    setMode('grayscale');
    setBrightness(12);
    setContrast(28);
    setSharpen(35);
  }

  function download() {
    if (!previewCanvasRef.current) return;
    // Re-render at full processing resolution to ensure the download isn't capped by preview sizing
    renderPipeline(previewCanvasRef.current, img, cropRect, rotation, mode, brightness, contrast, sharpen, threshold, PROCESS_MAX);
    const link = document.createElement('a');
    link.download = 'enhanced-document.png';
    link.href = previewCanvasRef.current.toDataURL('image/png');
    link.click();
  }

  const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
  const sliderRow = { marginBottom: 14 };

  if (step === 'upload') {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            Upload a photo of your document
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
            A receipt, form, ID, or book page — we'll clean it up to look like a proper scan.
          </p>
          <input type="file" accept="image/*" onChange={handleUpload} />
        </div>
      </div>
    );
  }

  if (step === 'crop') {
    return (
      <div className="panel">
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Crop to just the document</p>
        <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 16 }}>Drag the corner handles, or skip if the photo's already tight.</p>

        <div
          ref={cropContainerRef}
          style={{
            position: 'relative', width: '100%', maxWidth: PREVIEW_MAX, margin: '0 auto',
            aspectRatio: `${img.naturalWidth} / ${img.naturalHeight}`, background: '#0F172A10', borderRadius: 8, overflow: 'hidden',
            touchAction: 'none',
          }}
        >
          <img src={img.src} alt="" style={{ width: '100%', height: '100%', display: 'block', userSelect: 'none', pointerEvents: 'none' }} />
          {/* dim overlay outside crop rect */}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.45)', clipPath: `polygon(0 0, 0 100%, ${cropRect.x * 100}% 100%, ${cropRect.x * 100}% ${cropRect.y * 100}%, ${(cropRect.x + cropRect.w) * 100}% ${cropRect.y * 100}%, ${(cropRect.x + cropRect.w) * 100}% ${(cropRect.y + cropRect.h) * 100}%, ${cropRect.x * 100}% ${(cropRect.y + cropRect.h) * 100}%, ${cropRect.x * 100}% 100%, 100% 100%, 100% 0)` }} />
          <div style={{
            position: 'absolute', left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`,
            width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%`, border: '2px solid #FBBF24', boxSizing: 'border-box',
          }}>
            {['tl', 'tr', 'bl', 'br'].map((corner) => (
              <div
                key={corner}
                onPointerDown={(e) => onHandlePointerDown(corner, e)}
                style={{
                  position: 'absolute', width: 18, height: 18, background: '#FBBF24', border: '2px solid white', borderRadius: '50%',
                  cursor: corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize',
                  top: corner.includes('t') ? -9 : undefined, bottom: corner.includes('b') ? -9 : undefined,
                  left: corner.includes('l') ? -9 : undefined, right: corner.includes('r') ? -9 : undefined,
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
          <button onClick={() => { setCropRect(defaultCrop); }} style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
            Reset crop
          </button>
          <button onClick={() => setStep('enhance')} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#1E3A8A', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}>
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(280px, 1.2fr)', gap: 32 }}>
        <div>
          <button onClick={() => setStep('crop')} style={{ background: 'none', border: 'none', color: '#3A63B8', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', marginBottom: 16, padding: 0 }}>
            ← Back to crop
          </button>

          <button onClick={applyAutoEnhance} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: '#059669', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer', marginBottom: 20 }}>
            ✨ Auto-Enhance
          </button>

          <div style={sliderRow}>
            <label style={labelStyle}>Straighten (°)</label>
            <input type="range" min="-15" max="15" step="0.5" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} style={{ width: '100%' }} />
          </div>

          <div style={sliderRow}>
            <label style={labelStyle}>Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ id: 'color', label: 'Color' }, { id: 'grayscale', label: 'Grayscale' }, { id: 'bw', label: 'Black & White' }].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  style={{
                    flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                    border: mode === m.id ? '2px solid #1E3A8A' : '1px solid #E2E8F0',
                    background: mode === m.id ? '#EFF6FF' : 'white', color: '#1E293B',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'bw' ? (
            <div style={sliderRow}>
              <label style={labelStyle}>Threshold</label>
              <input type="range" min="0" max="255" step="1" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          ) : (
            <>
              <div style={sliderRow}>
                <label style={labelStyle}>Brightness</label>
                <input type="range" min="-100" max="100" step="1" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div style={sliderRow}>
                <label style={labelStyle}>Contrast</label>
                <input type="range" min="-100" max="100" step="1" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <div style={sliderRow}>
                <label style={labelStyle}>Sharpen</label>
                <input type="range" min="0" max="100" step="1" value={sharpen} onChange={(e) => setSharpen(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
            </>
          )}

          <button onClick={download} style={{ width: '100%', marginTop: 8, padding: '12px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>
            ⬇ Download Enhanced Image
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', background: '#F8FAFC', borderRadius: 16, padding: 20 }}>
          <canvas ref={previewCanvasRef} style={{ maxWidth: '100%', maxHeight: 560, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
        </div>
      </div>
      <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 16 }}>
        Large photos are processed at up to {PROCESS_MAX}px on the longest side to keep things fast — plenty of resolution for reading and printing.
      </p>
    </div>
  );
}
