'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { PRESETS, getPreset, presetPixelSize } from '@/lib/passportPhoto/presets';
import { detectBackgroundMask, applyBackgroundColor, applyAdjustments, checkBackgroundMatch } from '@/lib/passportPhoto/imageProcessing';
import { computeSheetLayout, renderSheetCanvas, downloadCanvasAsImage, downloadCanvasAsPdf } from '@/lib/passportPhoto/exportSheet';

const PREVIEW_MAX = 300;
const BG_COLOR_CHOICES = [
  { label: 'White', hex: '#FFFFFF' },
  { label: 'Off-white', hex: '#F5F5F5' },
  { label: 'Light grey', hex: '#F1F0EC' },
];

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem' };
const sectionTitle = { fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#2563EB', margin: '0 0 10px' };

export default function PassportPhotoStudioWorkspace() {
  const [img, setImg] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [workingImg, setWorkingImg] = useState(null);

  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const preset = getPreset(presetId);
  const { width: targetW, height: targetH, dpi } = presetPixelSize(preset);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [faceDetectStatus, setFaceDetectStatus] = useState('idle'); // idle | unsupported | running | done | failed

  const midHeadPct = (preset.headHeightMinPct + preset.headHeightMaxPct) / 2;
  const [headGuide, setHeadGuide] = useState({ crownPct: 12, chinPct: 12 + midHeadPct });
  const dragGuideRef = useRef(null);

  const [bgRemoveEnabled, setBgRemoveEnabled] = useState(true);
  const [bgTolerance, setBgTolerance] = useState(38);
  const [bgColorHex, setBgColorHex] = useState(preset.background.hex);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [warmth, setWarmth] = useState(0);
  const [sharpen, setSharpen] = useState(20);

  const [layout, setLayout] = useState('single'); // single | sheet4 | sheet8
  const [fileFormat, setFileFormat] = useState('jpg'); // jpg | png | pdf
  const [busy, setBusy] = useState(false);

  const dragPanRef = useRef(null);
  const rawCanvasRef = useRef(null);
  const processedCanvasRef = useRef(null);
  const [backgroundCheck, setBackgroundCheck] = useState(null);

  useEffect(() => { setBgColorHex(preset.background.hex); setHeadGuide({ crownPct: 12, chinPct: 12 + midHeadPct }); }, [presetId]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => {
        setImg(image);
        setRotation(0);
        setFlipH(false);
        setZoom(1);
        attemptFaceDetect(image);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // Best-effort only: the browser-native Face Detector API is experimental
  // and only available in some Chromium builds. When present, it's used
  // purely to auto-center/zoom the crop — a real capability when it works,
  // silently skipped everywhere else in favor of the manual guide below,
  // which is what actually gets validated.
  async function attemptFaceDetect(image) {
    if (typeof window === 'undefined' || !('FaceDetector' in window)) {
      setFaceDetectStatus('unsupported');
      return;
    }
    setFaceDetectStatus('running');
    try {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(image);
      if (!faces.length) { setFaceDetectStatus('failed'); return; }
      const box = faces[0].boundingBox;
      const faceCx = box.x + box.width / 2;
      const faceCy = box.y + box.height / 2;
      const paddedH = box.height * 2.4;
      const scale = targetH / paddedH;
      setZoom(clamp(scale / (Math.max(targetW / image.width, targetH / image.height)), 0.5, 3));
      setTimeout(() => {
        setPan((prevPan) => {
          const coverScale = Math.max(targetW / image.width, targetH / image.height) * (zoom || 1);
          const drawnW = image.width * coverScale, drawnH = image.height * coverScale;
          return { x: clamp(targetW / 2 - faceCx * coverScale, targetW - drawnW, 0), y: clamp(targetH / 2 - faceCy * coverScale, targetH - drawnH, 0) };
        });
      }, 0);
      setFaceDetectStatus('done');
    } catch {
      setFaceDetectStatus('failed');
    }
  }

  // Bake rotation/flip into a working image so crop math only deals with pan+zoom.
  useEffect(() => {
    if (!img) { setWorkingImg(null); return; }
    const swapped = rotation === 90 || rotation === 270;
    const w = swapped ? img.naturalHeight : img.naturalWidth;
    const h = swapped ? img.naturalWidth : img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    const outImg = new window.Image();
    outImg.onload = () => setWorkingImg(outImg);
    outImg.src = canvas.toDataURL();
  }, [img, rotation, flipH]);

  const coverScale = workingImg ? Math.max(targetW / workingImg.width, targetH / workingImg.height) : 1;
  const drawnW = workingImg ? workingImg.width * coverScale * zoom : 0;
  const drawnH = workingImg ? workingImg.height * coverScale * zoom : 0;

  const clampPan = useCallback((p) => ({ x: clamp(p.x, targetW - drawnW, 0), y: clamp(p.y, targetH - drawnH, 0) }), [targetW, targetH, drawnW, drawnH]);

  useEffect(() => {
    if (!workingImg) return;
    setPan((p) => clampPan(p.x === 0 && p.y === 0 ? { x: (targetW - drawnW) / 2, y: (targetH - drawnH) / 2 } : p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingImg, targetW, targetH, presetId]);

  const previewScale = Math.min(1, PREVIEW_MAX / Math.max(targetW, targetH));

  // Fast raw crop preview (no bg-removal / adjustments) so dragging feels instant.
  const renderRaw = useCallback(() => {
    const canvas = rawCanvasRef.current;
    if (!canvas || !workingImg) return;
    canvas.width = targetW * previewScale;
    canvas.height = targetH * previewScale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(workingImg, pan.x * previewScale, pan.y * previewScale, drawnW * previewScale, drawnH * previewScale);
  }, [workingImg, targetW, targetH, previewScale, pan, drawnW, drawnH]);
  useEffect(() => { renderRaw(); }, [renderRaw]);

  function composeFullResCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = targetW; canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(workingImg, pan.x, pan.y, drawnW, drawnH);
    return canvas;
  }

  // Full-res processed pass (bg removal + adjustments) — output size for
  // these presets is modest (well under 1000px per side), so recomputing on
  // every settings change is fast enough to feel live once debounced.
  const processTimer = useRef(null);
  useEffect(() => {
    if (!workingImg) return;
    clearTimeout(processTimer.current);
    processTimer.current = setTimeout(() => {
      const source = composeFullResCanvas();
      const ctx = source.getContext('2d');
      let imageData = ctx.getImageData(0, 0, targetW, targetH);
      if (bgRemoveEnabled) {
        const mask = detectBackgroundMask(imageData, { tolerance: bgTolerance });
        imageData = applyBackgroundColor(imageData, mask, bgColorHex);
      }
      imageData = applyAdjustments(imageData, { brightness, contrast, warmth, sharpen });
      const out = processedCanvasRef.current;
      if (!out) return;
      out.width = targetW; out.height = targetH;
      out.getContext('2d').putImageData(imageData, 0, 0);
      setBackgroundCheck(checkBackgroundMatch(imageData, bgColorHex));
    }, 180);
    return () => clearTimeout(processTimer.current);
  }, [workingImg, pan, drawnW, drawnH, bgRemoveEnabled, bgTolerance, bgColorHex, brightness, contrast, warmth, sharpen, targetW, targetH]); // eslint-disable-line react-hooks/exhaustive-deps

  function onPointerDown(e) {
    dragPanRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }
  function onPointerMove(e) {
    if (!dragPanRef.current) return;
    const dx = (e.clientX - dragPanRef.current.startX) / previewScale;
    const dy = (e.clientY - dragPanRef.current.startY) / previewScale;
    setPan(clampPan({ x: dragPanRef.current.startPan.x + dx, y: dragPanRef.current.startPan.y + dy }));
  }
  function onPointerUp() {
    dragPanRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  function onGuideDown(which) {
    return (e) => {
      e.stopPropagation();
      dragGuideRef.current = { which };
      window.addEventListener('pointermove', onGuideMove);
      window.addEventListener('pointerup', onGuideUp);
    };
  }
  function onGuideMove(e) {
    if (!dragGuideRef.current) return;
    const wrapper = document.getElementById('ppx-preview-wrapper');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const pct = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
    setHeadGuide((g) => {
      if (dragGuideRef.current.which === 'crown') return { ...g, crownPct: Math.min(pct, g.chinPct - 3) };
      return { ...g, chinPct: Math.max(pct, g.crownPct + 3) };
    });
  }
  function onGuideUp() {
    dragGuideRef.current = null;
    window.removeEventListener('pointermove', onGuideMove);
    window.removeEventListener('pointerup', onGuideUp);
  }

  const headHeightPct = headGuide.chinPct - headGuide.crownPct;
  const headHeightOk = headHeightPct >= preset.headHeightMinPct && headHeightPct <= preset.headHeightMaxPct;

  async function handleExport() {
    if (!processedCanvasRef.current) return;
    setBusy(true);
    try {
      const photoCanvas = processedCanvasRef.current;
      const baseName = `${preset.country.toLowerCase().replace(/\s+/g, '-')}-${preset.documentLabel.toLowerCase().replace(/\s+/g, '-')}`;
      if (layout === 'single') {
        if (fileFormat === 'pdf') await downloadCanvasAsPdf(photoCanvas, preset.widthMm, preset.heightMm, `${baseName}.pdf`);
        else downloadCanvasAsImage(photoCanvas, fileFormat, `${baseName}.${fileFormat}`);
      } else {
        const count = layout === 'sheet4' ? 4 : 8;
        const sheetLayout = computeSheetLayout(preset.widthMm, preset.heightMm, count);
        const sheetCanvas = renderSheetCanvas(photoCanvas, sheetLayout, dpi);
        if (fileFormat === 'pdf') await downloadCanvasAsPdf(sheetCanvas, sheetLayout.sheetWmm, sheetLayout.sheetHmm, `${baseName}-${count}up.pdf`);
        else downloadCanvasAsImage(sheetCanvas, fileFormat === 'png' ? 'png' : 'jpg', `${baseName}-${count}up.${fileFormat === 'png' ? 'png' : 'jpg'}`);
      }
    } finally {
      setBusy(false);
    }
  }

  const previewW = targetW * previewScale, previewH = targetH * previewScale;

  if (!img) {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a photo to create a passport, visa, or ID photo</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
            Choose a country and document preset next — Nigeria, UK, US, Canada, Australia, Schengen, India, South Africa, and more.
          </p>
          <input type="file" accept="image/*" onChange={handleUpload} />
        </div>
        <p className="privacy-note">Everything happens in your browser — your photo is never uploaded to a server, and no account is required.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(300px, 1fr)', gap: 28 }}>
        <div>
          <p style={sectionTitle}>1. Document Preset</p>
          <select style={{ ...inputStyle, marginBottom: 6 }} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.country} — {p.documentLabel} ({p.widthMm}×{p.heightMm}mm)</option>)}
          </select>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 18, lineHeight: 1.5 }}>{preset.notes} This reflects commonly published guidance and may change — always confirm the current official requirement before submitting.</p>

          <p style={sectionTitle}>2. Crop &amp; Position</p>
          <div style={{ marginBottom: 8, fontSize: '0.75rem', color: faceDetectStatus === 'done' ? '#059669' : '#94A3B8' }}>
            {faceDetectStatus === 'running' && 'Detecting face…'}
            {faceDetectStatus === 'done' && '✓ Face detected — crop auto-centered. Fine-tune below.'}
            {(faceDetectStatus === 'unsupported' || faceDetectStatus === 'failed') && 'Automatic face detection isn\'t available — position and the head-height guide below are manual.'}
          </div>
          <label style={labelStyle}>Zoom</label>
          <input type="range" min="0.5" max="3" step="0.02" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%', marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <button onClick={() => setRotation((r) => (r + 90) % 360)} style={ghostBtn}>↻ Rotate</button>
            <button onClick={() => setFlipH((f) => !f)} style={{ ...ghostBtn, background: flipH ? '#EFF6FF' : 'white' }}>⇋ Flip</button>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#64748B', marginBottom: 4 }}>Drag the photo to reposition. Drag the two guide lines to mark the crown (top of head) and chin.</p>
          <div style={{ padding: '8px 12px', borderRadius: 8, background: headHeightOk ? '#F0FDF4' : '#FFFBEB', border: `1px solid ${headHeightOk ? '#BBF7D0' : '#FDE68A'}`, marginBottom: 18 }}>
            <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: headHeightOk ? '#166534' : '#92400E' }}>
              {headHeightOk ? '✓' : '⚠'} Head height {headHeightPct.toFixed(0)}% of frame — target {preset.headHeightMinPct}–{preset.headHeightMaxPct}%
            </p>
            {!headHeightOk && <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#92400E' }}>{headHeightPct < preset.headHeightMinPct ? 'Too small — zoom in or drag the guide lines further apart.' : 'Too large — zoom out or drag the guide lines closer together.'}</p>}
          </div>

          <p style={sectionTitle}>3. Background &amp; Adjustments</p>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#334155', marginBottom: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={bgRemoveEnabled} onChange={(e) => setBgRemoveEnabled(e.target.checked)} /> Remove &amp; replace background
          </label>
          {bgRemoveEnabled && (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {BG_COLOR_CHOICES.map((c) => (
                  <button key={c.hex} onClick={() => setBgColorHex(c.hex)} title={c.label} style={{ width: 32, height: 32, borderRadius: 8, background: c.hex, border: bgColorHex === c.hex ? '3px solid #2563EB' : '1px solid #E2E8F0', cursor: 'pointer' }} />
                ))}
              </div>
              <label style={labelStyle}>Removal sensitivity</label>
              <input type="range" min="15" max="70" value={bgTolerance} onChange={(e) => setBgTolerance(Number(e.target.value))} style={{ width: '100%', marginBottom: 10 }} />
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: 10 }}>Works best against a plain, evenly lit background. Busy or textured backgrounds may not remove cleanly.</p>
              {backgroundCheck && (
                <p style={{ fontSize: '0.72rem', color: backgroundCheck.matches ? '#059669' : '#B45309', marginBottom: 14 }}>
                  {backgroundCheck.matches ? '✓ Background verified as matching' : '⚠ Background doesn\'t fully match yet'} — sampled edge color {backgroundCheck.avgHex}.
                </p>
              )}
            </>
          )}
          <label style={labelStyle}>Brightness</label>
          <input type="range" min="-50" max="50" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))} style={{ width: '100%', marginBottom: 10 }} />
          <label style={labelStyle}>Contrast</label>
          <input type="range" min="-50" max="50" value={contrast} onChange={(e) => setContrast(Number(e.target.value))} style={{ width: '100%', marginBottom: 10 }} />
          <label style={labelStyle}>White balance (cool ↔ warm)</label>
          <input type="range" min="-50" max="50" value={warmth} onChange={(e) => setWarmth(Number(e.target.value))} style={{ width: '100%', marginBottom: 10 }} />
          <label style={labelStyle}>Sharpness</label>
          <input type="range" min="0" max="100" value={sharpen} onChange={(e) => setSharpen(Number(e.target.value))} style={{ width: '100%', marginBottom: 18 }} />

          <p style={sectionTitle}>4. Export</p>
          <label style={labelStyle}>Layout</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {[{ id: 'single', label: 'Single photo' }, { id: 'sheet4', label: '4-photo sheet' }, { id: 'sheet8', label: '8-photo sheet' }].map((o) => (
              <button key={o.id} onClick={() => setLayout(o.id)} style={{ flex: 1, padding: '8px 6px', borderRadius: 8, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, border: layout === o.id ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: layout === o.id ? '#EFF6FF' : 'white' }}>{o.label}</button>
            ))}
          </div>
          <label style={labelStyle}>File format</label>
          <select style={{ ...inputStyle, marginBottom: 14 }} value={fileFormat} onChange={(e) => setFileFormat(e.target.value)}>
            <option value="jpg">JPG</option>
            <option value="png">PNG</option>
            <option value="pdf">PDF</option>
          </select>

          <button onClick={handleExport} disabled={busy} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: busy ? 'default' : 'pointer' }}>
            {busy ? 'Preparing…' : `⬇ Download ${layout === 'single' ? 'Photo' : layout === 'sheet4' ? '4-Photo Sheet' : '8-Photo Sheet'}`}
          </button>
          <button onClick={() => setImg(null)} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
            Upload a different photo
          </button>
        </div>

        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textAlign: 'center', margin: '0 0 8px' }}>Crop &amp; position</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div id="ppx-preview-wrapper" style={{ position: 'relative', width: previewW, height: previewH, touchAction: 'none' }}>
              <canvas ref={rawCanvasRef} onPointerDown={onPointerDown} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', cursor: 'grab' }} />
              <div onPointerDown={onGuideDown('crown')} style={{ position: 'absolute', left: 0, right: 0, top: `${headGuide.crownPct}%`, height: 0, borderTop: '2px dashed #F59E0B', cursor: 'ns-resize' }}>
                <span style={{ position: 'absolute', left: 2, top: -16, fontSize: '0.6rem', background: '#F59E0B', color: 'white', padding: '1px 5px', borderRadius: 4 }}>Crown</span>
              </div>
              <div onPointerDown={onGuideDown('chin')} style={{ position: 'absolute', left: 0, right: 0, top: `${headGuide.chinPct}%`, height: 0, borderTop: '2px dashed #F59E0B', cursor: 'ns-resize' }}>
                <span style={{ position: 'absolute', left: 2, top: 4, fontSize: '0.6rem', background: '#F59E0B', color: 'white', padding: '1px 5px', borderRadius: 4 }}>Chin</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textAlign: 'center', margin: '0 0 8px' }}>Final result (with background &amp; adjustments)</p>
          <div style={{ display: 'flex', justifyContent: 'center', background: '#F8FAFC', borderRadius: 16, padding: 16 }}>
            <canvas ref={processedCanvasRef} style={{ width: previewW, height: previewH, borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
          </div>
        </div>
      </div>

      <p className="privacy-note">Everything happens in your browser — your photo is never uploaded to a server, and no account is required.</p>
    </div>
  );
}

const ghostBtn = { flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };
