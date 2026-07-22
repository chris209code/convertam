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

// Estimates the smooth background illumination (the shadow/lighting
// gradient, not the sharp text or ink) by downscaling the current canvas to
// a tiny size — which blurs away fine detail — then scaling it back up to
// full size with smoothing. That's the "background"; dividing the real
// pixels by it flattens uneven lighting the same way flat-field
// correction does in document scanners.
//
// A naive average-downscale drags the estimate down wherever there's thin
// dark content (a signature stroke, a line of text) — dividing that content
// by its own artificially-low "background" pushes it toward white and can
// erase it entirely. A max-filter (dilation) pass on the tiny sample fixes
// this: a real lighting gradient is broad and survives a small-radius max
// filter almost unchanged, but a thin dark stroke smaller than the kernel
// gets replaced by a brighter neighboring sample, so the estimate reflects
// the paper, not the ink.
function estimateBackground(sourceCanvas, w, h) {
  const factor = Math.max(1, Math.floor(Math.min(w, h) / 24));
  const sw = Math.max(1, Math.round(w / factor));
  const sh = Math.max(1, Math.round(h / factor));

  const small = document.createElement('canvas');
  small.width = sw;
  small.height = sh;
  const sctx = small.getContext('2d');
  sctx.drawImage(sourceCanvas, 0, 0, sw, sh);

  const srcData = sctx.getImageData(0, 0, sw, sh).data;
  const dilated = new Uint8ClampedArray(srcData.length);
  const radius = 1;
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      for (let c = 0; c < 3; c++) {
        let maxV = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = clamp(x + dx, 0, sw - 1);
            const ny = clamp(y + dy, 0, sh - 1);
            const v = srcData[(ny * sw + nx) * 4 + c];
            if (v > maxV) maxV = v;
          }
        }
        dilated[(y * sw + x) * 4 + c] = maxV;
      }
      dilated[(y * sw + x) * 4 + 3] = 255;
    }
  }
  sctx.putImageData(new ImageData(dilated, sw, sh), 0, 0);

  const bg = document.createElement('canvas');
  bg.width = w;
  bg.height = h;
  const bctx = bg.getContext('2d');
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, w, h);
  const bgImageData = bctx.getImageData(0, 0, w, h);

  // Shadow-presence score: how much the (now ink-robust) background
  // luminance actually varies across the page. A clean, evenly-lit photo
  // has a small range here — paper is paper everywhere. A real shadow or
  // uneven lighting shows a wide range. Below LOW, treat it as no shadow
  // at all; above HIGH, treat it as a fully pronounced shadow.
  let minLum = 255, maxLum = 0;
  const bd = bgImageData.data;
  for (let i = 0; i < bd.length; i += 4) {
    const lum = (bd[i] + bd[i + 1] + bd[i + 2]) / 3;
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }
  const LOW = 12, HIGH = 60;
  const shadowPresence = clamp((maxLum - minLum - LOW) / (HIGH - LOW), 0, 1);

  return { data: bd, shadowPresence };
}

// Shadow/uneven-lighting reduction — blended by `strength` (0-100) so it
// can be dialed in rather than all-or-nothing. The effective strength is
// also scaled by how much real shadow was actually detected, so a clean,
// evenly-lit photo (a signature on plain paper, say) is left alone even if
// the slider is turned all the way up.
function applyShadowReduction(imageData, w, h, sourceCanvas, strength) {
  if (strength <= 0) return;
  const { data: bgData, shadowPresence } = estimateBackground(sourceCanvas, w, h);
  const effectiveStrength = strength * shadowPresence;
  if (effectiveStrength <= 0.5) return;
  const data = imageData.data;
  const s = effectiveStrength / 100;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const bg = Math.max(bgData[i + c], 30); // floor avoids blowing out already-dark regions
      const corrected = clamp((data[i + c] / bg) * 255, 0, 255);
      data[i + c] = data[i + c] * (1 - s) + corrected * s;
    }
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
function renderPipeline(targetCanvas, img, cropRectPct, rotationDeg, mode, brightness, contrast, sharpen, threshold, shadowReduction, maxDim) {
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

  // Pixel-level adjustments. Shadow reduction runs first, on the raw
  // cropped/rotated image, so it flattens lighting before grayscale/
  // threshold/brightness decisions are made from it — a B&W scan of an
  // unevenly-lit photo thresholds far more reliably this way.
  let imageData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  if (shadowReduction > 0) {
    applyShadowReduction(imageData, targetCanvas.width, targetCanvas.height, targetCanvas, shadowReduction);
    ctx.putImageData(imageData, 0, 0);
    imageData = ctx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  }
  if (mode === 'grayscale') applyGrayscale(imageData.data);
  if (mode === 'bw') applyThreshold(imageData.data, threshold);
  if (mode !== 'bw') applyBrightnessContrast(imageData.data, brightness, contrast);
  if (sharpen > 0 && mode !== 'bw') applySharpen(imageData, targetCanvas.width, targetCanvas.height, sharpen);
  ctx.putImageData(imageData, 0, 0);
}

const defaultCrop = { x: 0, y: 0, w: 1, h: 1 };

// Handoff keys shared with SignDocumentsWorkspace.js — must match exactly on
// both sides. A one-time localStorage pass-off (same pattern as the CV
// Improver <-> Resume Builder handoff) lets Sign Documents send an
// in-progress signature photo here for cleanup, and lets this tool send the
// enhanced result back to Sign Documents to retry automatic extraction,
// without the two tools importing from each other.
const SIGN_TO_ENHANCER_KEY = 'convertam_sign_to_enhancer';
const ENHANCER_TO_SIGN_KEY = 'convertam_enhancer_to_sign';

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
  const [shadowReduction, setShadowReduction] = useState(0);
  const [cameFromSignDocuments, setCameFromSignDocuments] = useState(false);

  const previewCanvasRef = useRef(null);
  const cropContainerRef = useRef(null);
  const dragRef = useRef(null); // { corner: 'tl'|'tr'|'bl'|'br'|'move', startRect, startX, startY }

  function loadImageIntoEditor(dataUrl) {
    const image = new window.Image();
    image.onload = () => {
      setImg(image);
      setCropRect(defaultCrop);
      setRotation(0);
      setMode('color');
      setBrightness(0);
      setContrast(0);
      setSharpen(0);
      setShadowReduction(0);
      setStep('crop');
    };
    image.src = dataUrl;
  }

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => loadImageIntoEditor(reader.result);
    reader.readAsDataURL(file);
  }

  // One-time pre-fill from Sign Documents' "try Document Enhancer" handoff.
  useEffect(() => {
    let raw;
    try { raw = localStorage.getItem(SIGN_TO_ENHANCER_KEY); } catch { return; }
    if (!raw) return;
    try { localStorage.removeItem(SIGN_TO_ENHANCER_KEY); } catch { /* ignore */ }
    setCameFromSignDocuments(true);
    loadImageIntoEditor(raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sends the current enhanced result back to Sign Documents, which retries
  // automatic signature extraction on it.
  function continueToSignDocuments() {
    if (!previewCanvasRef.current || !img) return;
    renderPipeline(previewCanvasRef.current, img, cropRect, rotation, mode, brightness, contrast, sharpen, threshold, shadowReduction, PROCESS_MAX);
    const dataUrl = previewCanvasRef.current.toDataURL('image/png');
    try { localStorage.setItem(ENHANCER_TO_SIGN_KEY, dataUrl); } catch { /* ignore */ }
    window.location.href = '/sign-documents';
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
    renderPipeline(previewCanvasRef.current, img, cropRect, rotation, mode, brightness, contrast, sharpen, threshold, shadowReduction, maxDim);
  }, [img, cropRect, rotation, mode, brightness, contrast, sharpen, threshold, shadowReduction]);

  useEffect(() => {
    if (step === 'enhance') render(PROCESS_MAX);
  }, [step, render]);

  function applyAutoEnhance() {
    setMode('grayscale');
    setBrightness(12);
    setContrast(28);
    setSharpen(35);
    setShadowReduction(55);
  }

  function download() {
    if (!previewCanvasRef.current) return;
    // Re-render at full processing resolution to ensure the download isn't capped by preview sizing
    renderPipeline(previewCanvasRef.current, img, cropRect, rotation, mode, brightness, contrast, sharpen, threshold, shadowReduction, PROCESS_MAX);
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
        {cameFromSignDocuments && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: '0.8rem', color: '#1E3A8A' }}>
            📥 Imported from Sign Documents — crop tightly around just the signature, enhance it, then continue back.
          </div>
        )}
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
            <label style={labelStyle}>Reduce Shadows</label>
            <input type="range" min="0" max="100" step="1" value={shadowReduction} onChange={(e) => setShadowReduction(Number(e.target.value))} style={{ width: '100%' }} />
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

          {cameFromSignDocuments && (
            <button onClick={continueToSignDocuments} style={{ width: '100%', marginTop: 10, padding: '12px 16px', borderRadius: 10, border: '1.5px solid #1E3A8A', cursor: 'pointer', background: 'white', color: '#1E3A8A', fontWeight: 700, fontSize: '0.9rem' }}>
              ✍️ Continue to Sign Documents
            </button>
          )}
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
