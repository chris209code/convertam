'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PRESETS, getPreset, presetPixelSize, BACKGROUND_OPTIONS, defaultBackgroundOption } from '@/lib/passportPhoto/presets';
import { compositeWithBackground, applyAdjustments, checkBackgroundMatch } from '@/lib/passportPhoto/imageProcessing';
import { segmentPerson, ambiguousRatio, LOW_CONFIDENCE_THRESHOLD } from '@/lib/passportPhoto/segmentation';
import { paintBrush, cloneMask, createMaskHistory, pushMaskHistory, undoMaskHistory, redoMaskHistory } from '@/lib/passportPhoto/maskEditor';
import { computeSheetLayout, renderSheetCanvas, downloadCanvasAsImage, downloadCanvasAsPdf } from '@/lib/passportPhoto/exportSheet';

const PREVIEW_MAX = 300;

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem' };
const sectionTitle = { fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#2563EB', margin: '0 0 10px' };
const ghostBtn = { flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };
const CHECKERBOARD_BG = { backgroundImage: 'repeating-conic-gradient(#E2E8F0 0% 25%, #F8FAFC 0% 50%)', backgroundSize: '16px 16px' };

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
  const [bgOption, setBgOption] = useState(defaultBackgroundOption(preset));
  const [bgCustomColor, setBgCustomColor] = useState('#FFFFFF');
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [warmth, setWarmth] = useState(0);
  const [sharpen, setSharpen] = useState(20);

  // The working mask is a mutable ref (not React state) so brush strokes
  // can mutate it in place at pointer-move frequency without a re-render
  // per pixel-paint call — `maskVersion` is bumped only at meaningful
  // checkpoints (segmentation finished, stroke ended, undo/redo/reset) to
  // trigger recomposition and update button-enabled state.
  const personMaskRef = useRef(null);
  const autoMaskRef = useRef(null);
  const maskHistoryRef = useRef(null);
  const segmentationGenRef = useRef(0);
  const lastSegmentedSignatureRef = useRef('');
  const [maskVersion, setMaskVersion] = useState(0);
  const [maskStatus, setMaskStatus] = useState('idle'); // idle | running | done | low-confidence | unavailable
  const [showMaskEditor, setShowMaskEditor] = useState(false);
  const [brushMode, setBrushMode] = useState('remove'); // remove | restore
  const [brushSizePct, setBrushSizePct] = useState(40);

  const [layout, setLayout] = useState('single');
  const [fileFormat, setFileFormat] = useState('jpg');
  const [busy, setBusy] = useState(false);

  const dragPanRef = useRef(null);
  const paintingRef = useRef(false);
  const rawCanvasRef = useRef(null);
  const processedCanvasRef = useRef(null);
  const [backgroundCheck, setBackgroundCheck] = useState(null);

  useEffect(() => {
    setBgOption(defaultBackgroundOption(preset));
    setHeadGuide({ crownPct: 12, chinPct: 12 + midHeadPct });
  }, [presetId]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // purely to auto-center/zoom the crop — background removal below is
  // handled entirely separately by full-person segmentation, not this.
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

  function resolveBgSpec() {
    if (bgOption === 'transparent') return { type: 'transparent' };
    const opt = BACKGROUND_OPTIONS.find((o) => o.id === bgOption);
    return { type: 'color', hex: bgOption === 'custom' ? bgCustomColor : opt.hex };
  }

  // Fast path: adjustments + compositing against whatever mask is
  // currently held (auto-detected or hand-edited) — cheap enough to call
  // directly on every brush-paint frame, not just via the debounced effect.
  const recomposite = useCallback(() => {
    if (!workingImg) return;
    const source = composeFullResCanvas();
    const ctx = source.getContext('2d');
    let imageData = ctx.getImageData(0, 0, targetW, targetH);
    imageData = applyAdjustments(imageData, { brightness, contrast, warmth, sharpen });
    let bgSpec = null;
    if (bgRemoveEnabled && personMaskRef.current) {
      bgSpec = resolveBgSpec();
      imageData = compositeWithBackground(imageData, personMaskRef.current, bgSpec);
    }
    const out = processedCanvasRef.current;
    if (!out) return;
    out.width = targetW; out.height = targetH;
    out.getContext('2d').putImageData(imageData, 0, 0);
    setBackgroundCheck(bgSpec && bgSpec.type === 'color' ? checkBackgroundMatch(imageData, bgSpec.hex) : null);
  }, [workingImg, targetW, targetH, pan, drawnW, drawnH, brightness, contrast, warmth, sharpen, bgRemoveEnabled, bgOption, bgCustomColor]); // eslint-disable-line react-hooks/exhaustive-deps

  const recomposeTimer = useRef(null);
  useEffect(() => {
    clearTimeout(recomposeTimer.current);
    recomposeTimer.current = setTimeout(recomposite, 80);
    return () => clearTimeout(recomposeTimer.current);
  }, [recomposite, maskVersion]);

  // Slow path: full-person segmentation, only re-run when the crop actually
  // changes (or the toggle is switched on for the first time) — never on
  // every adjustment/background-color change, which recomposite() alone
  // already handles cheaply against the existing mask.
  useEffect(() => {
    if (!workingImg || !bgRemoveEnabled) return;
    const signature = `${targetW}x${targetH}|${pan.x.toFixed(1)},${pan.y.toFixed(1)}|${drawnW.toFixed(1)}x${drawnH.toFixed(1)}`;
    if (signature === lastSegmentedSignatureRef.current && personMaskRef.current) return;

    const timer = setTimeout(async () => {
      const myGen = ++segmentationGenRef.current;
      setMaskStatus('running');
      const source = composeFullResCanvas();
      try {
        const rawMask = await segmentPerson(source, targetW, targetH);
        if (myGen !== segmentationGenRef.current) return; // a newer crop superseded this result
        const ratio = ambiguousRatio(rawMask);
        personMaskRef.current = rawMask;
        autoMaskRef.current = cloneMask(rawMask);
        maskHistoryRef.current = createMaskHistory(rawMask);
        lastSegmentedSignatureRef.current = signature;
        const lowConfidence = ratio > LOW_CONFIDENCE_THRESHOLD;
        setMaskStatus(lowConfidence ? 'low-confidence' : 'done');
        if (lowConfidence) setShowMaskEditor(true);
        setMaskVersion((v) => v + 1);
      } catch {
        if (myGen !== segmentationGenRef.current) return;
        const fallback = new Uint8ClampedArray(targetW * targetH).fill(255); // keep everything — never silently remove
        personMaskRef.current = fallback;
        autoMaskRef.current = cloneMask(fallback);
        maskHistoryRef.current = createMaskHistory(fallback);
        lastSegmentedSignatureRef.current = signature;
        setMaskStatus('unavailable');
        setShowMaskEditor(true);
        setMaskVersion((v) => v + 1);
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingImg, bgRemoveEnabled, targetW, targetH, pan, drawnW, drawnH]);

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

  // Manual mask brush — active only while the refinement toolbar is open.
  function maskPointFromEvent(e) {
    const canvas = processedCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / previewScale, y: (e.clientY - rect.top) / previewScale };
  }
  function paintAt(e) {
    if (!personMaskRef.current) return;
    const { x, y } = maskPointFromEvent(e);
    const radius = (brushSizePct / 100) * targetW * 0.25;
    paintBrush(personMaskRef.current, targetW, targetH, x, y, radius, brushMode === 'restore' ? 255 : 0);
    recomposite();
  }
  function onMaskPointerDown(e) {
    if (!showMaskEditor || !bgRemoveEnabled) return;
    e.stopPropagation();
    paintingRef.current = true;
    paintAt(e);
    window.addEventListener('pointermove', onMaskPointerMove);
    window.addEventListener('pointerup', onMaskPointerUp);
  }
  function onMaskPointerMove(e) { if (paintingRef.current) paintAt(e); }
  function onMaskPointerUp() {
    paintingRef.current = false;
    window.removeEventListener('pointermove', onMaskPointerMove);
    window.removeEventListener('pointerup', onMaskPointerUp);
    if (personMaskRef.current && maskHistoryRef.current) {
      maskHistoryRef.current = pushMaskHistory(maskHistoryRef.current, personMaskRef.current);
      setMaskVersion((v) => v + 1);
    }
  }

  function handleUndo() {
    const result = maskHistoryRef.current && undoMaskHistory(maskHistoryRef.current);
    if (!result) return;
    maskHistoryRef.current = result.history;
    personMaskRef.current = result.mask;
    setMaskVersion((v) => v + 1);
  }
  function handleRedo() {
    const result = maskHistoryRef.current && redoMaskHistory(maskHistoryRef.current);
    if (!result) return;
    maskHistoryRef.current = result.history;
    personMaskRef.current = result.mask;
    setMaskVersion((v) => v + 1);
  }
  function handleResetMask() {
    if (!autoMaskRef.current) return;
    personMaskRef.current = cloneMask(autoMaskRef.current);
    maskHistoryRef.current = pushMaskHistory(maskHistoryRef.current, personMaskRef.current);
    setMaskVersion((v) => v + 1);
  }
  const canUndo = !!maskHistoryRef.current && maskHistoryRef.current.index > 0;
  const canRedo = !!maskHistoryRef.current && maskHistoryRef.current.index < maskHistoryRef.current.stack.length - 1;

  const headHeightPct = headGuide.chinPct - headGuide.crownPct;
  const headHeightOk = headHeightPct >= preset.headHeightMinPct && headHeightPct <= preset.headHeightMaxPct;

  function flattenIfNeeded(canvas) {
    if (!(bgRemoveEnabled && bgOption === 'transparent' && fileFormat !== 'png')) return canvas;
    const flat = document.createElement('canvas');
    flat.width = canvas.width; flat.height = canvas.height;
    const ctx = flat.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(canvas, 0, 0);
    return flat;
  }

  async function handleExport() {
    if (!processedCanvasRef.current) return;
    setBusy(true);
    try {
      const photoCanvas = flattenIfNeeded(processedCanvasRef.current);
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
            <input type="checkbox" checked={bgRemoveEnabled} onChange={(e) => setBgRemoveEnabled(e.target.checked)} /> Remove background (detects the full person — hair, clothing and all)
          </label>
          {bgRemoveEnabled && (
            <>
              <label style={labelStyle}>Replace background with</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {BACKGROUND_OPTIONS.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => setBgOption(o.id)}
                    title={o.label}
                    style={{
                      padding: o.id === 'custom' ? '6px 10px' : 0,
                      width: o.id === 'custom' ? 'auto' : 32, height: 32, borderRadius: 8,
                      background: o.id === 'transparent' ? 'repeating-conic-gradient(#CBD5E1 0% 25%, #F8FAFC 0% 50%)' : (o.id === 'custom' ? 'white' : o.hex),
                      backgroundSize: o.id === 'transparent' ? '8px 8px' : undefined,
                      border: bgOption === o.id ? '3px solid #2563EB' : '1px solid #E2E8F0',
                      cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, color: '#475569',
                    }}
                  >{o.id === 'custom' ? 'Custom' : ''}</button>
                ))}
                {bgOption === 'custom' && (
                  <input type="color" value={bgCustomColor} onChange={(e) => setBgCustomColor(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: '1px solid #E2E8F0', borderRadius: 8 }} />
                )}
              </div>
              {bgOption === 'transparent' && fileFormat !== 'png' && (
                <p style={{ fontSize: '0.7rem', color: '#B45309', marginBottom: 8 }}>Transparent backgrounds are only preserved in PNG exports — JPG and PDF will use white instead.</p>
              )}

              {maskStatus === 'running' && <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 10 }}>Detecting the full person…</p>}
              {maskStatus === 'low-confidence' && (
                <p style={{ fontSize: '0.75rem', color: '#B45309', marginBottom: 10 }}>⚠ We could not cleanly separate the subject from the background. Refine the mask manually.</p>
              )}
              {maskStatus === 'unavailable' && (
                <p style={{ fontSize: '0.75rem', color: '#B45309', marginBottom: 10 }}>⚠ Automatic detection isn't available right now — nothing has been removed. Use the manual tools below if you'd like to remove the background yourself.</p>
              )}
              {maskStatus === 'done' && backgroundCheck && (
                <p style={{ fontSize: '0.72rem', color: backgroundCheck.matches ? '#059669' : '#B45309', marginBottom: 10 }}>
                  {backgroundCheck.matches ? '✓ Background verified as matching' : '⚠ Background doesn\'t fully match yet'} — sampled edge color {backgroundCheck.avgHex}.
                </p>
              )}

              <button onClick={() => setShowMaskEditor((v) => !v)} style={{ fontSize: '0.76rem', color: '#2563EB', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginBottom: 10 }}>
                {showMaskEditor ? 'Hide' : 'Fine-tune'} mask manually
              </button>

              {showMaskEditor && (
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button onClick={() => setBrushMode('restore')} style={{ ...ghostBtn, background: brushMode === 'restore' ? '#EFF6FF' : 'white', borderColor: brushMode === 'restore' ? '#2563EB' : '#E2E8F0' }}>+ Restore subject</button>
                    <button onClick={() => setBrushMode('remove')} style={{ ...ghostBtn, background: brushMode === 'remove' ? '#EFF6FF' : 'white', borderColor: brushMode === 'remove' ? '#2563EB' : '#E2E8F0' }}>− Remove background</button>
                  </div>
                  <label style={labelStyle}>Brush size</label>
                  <input type="range" min="8" max="100" value={brushSizePct} onChange={(e) => setBrushSizePct(Number(e.target.value))} style={{ width: '100%', marginBottom: 10 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleUndo} disabled={!canUndo} style={{ ...ghostBtn, opacity: canUndo ? 1 : 0.5 }}>↶ Undo</button>
                    <button onClick={handleRedo} disabled={!canRedo} style={{ ...ghostBtn, opacity: canRedo ? 1 : 0.5 }}>↷ Redo</button>
                    <button onClick={handleResetMask} style={ghostBtn}>Reset mask</button>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: '10px 0 0' }}>Paint directly on the "Final result" preview to the right — restore hides a spot that got removed by mistake, remove takes away background the detector missed.</p>
                </div>
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
            <div style={{ width: previewW, height: previewH, borderRadius: 4, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', ...(bgRemoveEnabled && bgOption === 'transparent' ? CHECKERBOARD_BG : {}) }}>
              <canvas
                ref={processedCanvasRef}
                onPointerDown={onMaskPointerDown}
                style={{ width: previewW, height: previewH, borderRadius: 4, display: 'block', cursor: showMaskEditor && bgRemoveEnabled ? 'crosshair' : 'default', touchAction: 'none' }}
              />
            </div>
          </div>
        </div>
      </div>

      <p className="privacy-note">Everything happens in your browser — your photo is never uploaded to a server, and no account is required.</p>
    </div>
  );
}
