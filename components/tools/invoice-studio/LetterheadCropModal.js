'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { validateImageFile, readFileAsDataURL, loadImage } from '@/lib/invoice-studio/fileUpload';

const FRAME_W = 480;

function computeBaseScale(imgW, imgH, rotation, targetW, targetH) {
  const rotated = rotation % 180 !== 0;
  const effW = rotated ? imgH : imgW;
  const effH = rotated ? imgW : imgH;
  return Math.max(targetW / effW, targetH / effH);
}

// Upload → pan/zoom/rotate against a fixed-aspect frame matching the target
// letterhead box → "Save Crop" rasterizes the same transform onto a canvas
// at the real target resolution, so what's previewed is what gets used.
export default function LetterheadCropModal({ targetW, targetH, initialSrc, onSave, onCancel }) {
  const frameH = Math.round((FRAME_W * targetH) / targetW);
  const frameScale = FRAME_W / targetW;

  const [img, setImg] = useState(null); // {el, w, h}
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const dragRef = useRef(null);

  const baseScale = useMemo(() => (img ? computeBaseScale(img.w, img.h, rotation, targetW, targetH) : 1), [img, rotation, targetW, targetH]);

  const loadFile = useCallback(async (file) => {
    const err = validateImageFile(file);
    if (err) { setError(err); return; }
    setError('');
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      const el = await loadImage(dataUrl);
      setImg({ el, w: el.naturalWidth, h: el.naturalHeight, dataUrl });
      setPan({ x: 0, y: 0 });
      setZoom(100);
      setRotation(0);
    } catch {
      setError('Could not load that image. Try a different file.');
    } finally {
      setBusy(false);
    }
  }, []);

  // Re-crop opens with the letterhead's already-saved image preloaded.
  useEffect(() => {
    if (!initialSrc) return;
    let cancelled = false;
    loadImage(initialSrc).then((el) => {
      if (!cancelled) setImg({ el, w: el.naturalWidth, h: el.naturalHeight, dataUrl: initialSrc });
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
    e.target.value = '';
  }

  function panStart(e) {
    if (!img) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pan.x, oy: pan.y };
    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      setPan({ x: d.ox + (ev.clientX - d.sx) / frameScale, y: d.oy + (ev.clientY - d.sy) / frameScale });
    };
    const up = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }

  function rotate90() {
    setRotation((r) => (r + 90) % 360);
    setPan({ x: 0, y: 0 });
  }

  function saveCrop() {
    if (!img) return;
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.save();
    ctx.translate(targetW / 2 + pan.x, targetH / 2 + pan.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom / 100, zoom / 100);
    const drawW = img.w * baseScale;
    const drawH = img.h * baseScale;
    ctx.drawImage(img.el, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();
    onSave(canvas.toDataURL('image/jpeg', 0.92));
  }

  const smallBtnGhost = { padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E6ED', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
  const smallBtn = { ...smallBtnGhost, border: 'none', background: '#2563EB', color: '#fff' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: FRAME_W + 64 }}>
        <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>Crop Letterhead</div>
        <div style={{ fontSize: 12, color: '#8891A0', marginBottom: 16 }}>Position the header band of your letterhead. Only this strip will be used.</div>

        {!img ? (
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              style={{ width: '100%', height: frameH, borderRadius: 8, border: '2px dashed #CBD5E1', background: '#F8FAFC', color: '#64748B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {busy ? 'Loading…' : 'Click to choose a letterhead image or scanned page'}
            </button>
          </div>
        ) : (
          <>
            <div
              onMouseDown={panStart}
              style={{ width: FRAME_W, height: frameH, overflow: 'hidden', borderRadius: 8, border: '1px solid #E2E6ED', position: 'relative', cursor: 'move', background: '#F3F5F8' }}
            >
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: `translate(-50%,-50%) translate(${pan.x * frameScale}px, ${pan.y * frameScale}px) rotate(${rotation}deg) scale(${zoom / 100})`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.dataUrl} alt="" draggable={false} style={{ width: img.w * baseScale * frameScale, height: img.h * baseScale * frameScale, display: 'block', userSelect: 'none' }} />
              </div>
              <div style={{ position: 'absolute', inset: 0, border: '2px dashed rgba(37,99,235,.6)', pointerEvents: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#8891A0', marginBottom: 4 }}>Zoom</div>
                <input type="range" min="50" max="250" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%' }} />
              </div>
              <button type="button" onClick={rotate90} style={{ ...smallBtnGhost, display: 'flex', alignItems: 'center', gap: 6 }}>
                <RotateCw size={14} /> Rotate 90°
              </button>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="button" onClick={() => fileInputRef.current?.click()} style={smallBtnGhost}>Choose Different Image</button>
              <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
            </div>
          </>
        )}

        {error && <div style={{ color: '#DC2626', fontSize: 12, marginTop: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onCancel} style={smallBtnGhost}>Cancel</button>
          <button type="button" onClick={saveCrop} disabled={!img} style={{ ...smallBtn, opacity: img ? 1 : 0.5, cursor: img ? 'pointer' : 'default' }}>Save Crop</button>
        </div>
      </div>
    </div>
  );
}
