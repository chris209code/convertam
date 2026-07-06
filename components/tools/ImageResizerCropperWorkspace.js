'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// PRESET CONFIG — the only place platform dimensions live. Social platforms
// change their recommended sizes over time; update this object when they do,
// nothing else in the tool needs to change.
// ---------------------------------------------------------------------------
const PRESET_GROUPS = {
  Custom: [{ id: 'custom', label: 'Custom size' }],
  Instagram: [
    { id: 'ig-profile', label: 'Profile Picture', w: 320, h: 320 },
    { id: 'ig-post', label: 'Post (Square)', w: 1080, h: 1080 },
    { id: 'ig-story', label: 'Story / Reel', w: 1080, h: 1920 },
  ],
  Facebook: [
    { id: 'fb-profile', label: 'Profile Picture', w: 170, h: 170 },
    { id: 'fb-cover', label: 'Cover Photo', w: 820, h: 312 },
    { id: 'fb-post', label: 'Post', w: 1200, h: 630 },
  ],
  LinkedIn: [
    { id: 'li-profile', label: 'Profile Picture', w: 400, h: 400 },
    { id: 'li-banner', label: 'Banner', w: 1584, h: 396 },
    { id: 'li-post', label: 'Post', w: 1200, h: 627 },
  ],
  YouTube: [
    { id: 'yt-thumbnail', label: 'Thumbnail', w: 1280, h: 720 },
    { id: 'yt-banner', label: 'Channel Banner', w: 2560, h: 1440 },
    { id: 'yt-profile', label: 'Profile Picture', w: 800, h: 800 },
  ],
  'X (Twitter)': [
    { id: 'x-profile', label: 'Profile Picture', w: 400, h: 400 },
    { id: 'x-header', label: 'Header', w: 1500, h: 500 },
  ],
  WhatsApp: [
    { id: 'wa-profile', label: 'Profile Picture', w: 500, h: 500 },
  ],
  Passport: [
    { id: 'passport-ng', label: 'Nigerian Passport Photo', w: 413, h: 531 },
    { id: 'passport-us', label: 'US Passport Photo (2×2in @300dpi)', w: 600, h: 600 },
  ],
};
// ---------------------------------------------------------------------------

const PREVIEW_MAX = 380;

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

export default function ImageResizerCropperWorkspace() {
  const [img, setImg] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [workingImg, setWorkingImg] = useState(null); // img after rotate/flip baked in

  const [group, setGroup] = useState('Instagram');
  const [presetId, setPresetId] = useState('ig-post');
  const [customW, setCustomW] = useState(1080);
  const [customH, setCustomH] = useState(1080);
  const [lockAspect, setLockAspect] = useState(true);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 }); // target-space px
  const [mode, setMode] = useState('fill'); // fill (crop to cover) | fit (contain, letterbox)
  const [exportFormat, setExportFormat] = useState('image/jpeg');

  const dragRef = useRef(null);
  const previewCanvasRef = useRef(null);

  const preset = PRESET_GROUPS[group]?.find((p) => p.id === presetId);
  const targetW = preset?.w || customW;
  const targetH = preset?.h || customH;

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
        setFlipV(false);
        setZoom(1);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  // Bake rotation/flip into a working image so crop math only ever deals with pan+zoom
  useEffect(() => {
    if (!img) { setWorkingImg(null); return; }
    const swapped = rotation === 90 || rotation === 270;
    const w = swapped ? img.naturalHeight : img.naturalWidth;
    const h = swapped ? img.naturalWidth : img.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
    const outImg = new window.Image();
    outImg.onload = () => setWorkingImg(outImg);
    outImg.src = canvas.toDataURL();
  }, [img, rotation, flipH, flipV]);

  const coverScale = workingImg ? Math.max(targetW / workingImg.width, targetH / workingImg.height) : 1;
  const drawnW = workingImg ? workingImg.width * coverScale * zoom : 0;
  const drawnH = workingImg ? workingImg.height * coverScale * zoom : 0;

  const clampPan = useCallback((p) => ({
    x: clamp(p.x, targetW - drawnW, 0),
    y: clamp(p.y, targetH - drawnH, 0),
  }), [targetW, targetH, drawnW, drawnH]);

  // Re-center whenever the target size, zoom, or working image changes
  useEffect(() => {
    if (!workingImg) return;
    setPan({ x: (targetW - drawnW) / 2, y: (targetH - drawnH) / 2 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workingImg, targetW, targetH, zoom]);

  const previewScale = Math.min(1, PREVIEW_MAX / Math.max(targetW, targetH));

  const render = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !workingImg) return;
    canvas.width = targetW * previewScale;
    canvas.height = targetH * previewScale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = mode === 'fit' ? '#F1F5F9' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (mode === 'fill') {
      ctx.drawImage(workingImg, pan.x * previewScale, pan.y * previewScale, drawnW * previewScale, drawnH * previewScale);
    } else {
      const containScale = Math.min(targetW / workingImg.width, targetH / workingImg.height) * zoom;
      const cw = workingImg.width * containScale, ch = workingImg.height * containScale;
      const cx = (targetW - cw) / 2, cy = (targetH - ch) / 2;
      ctx.drawImage(workingImg, cx * previewScale, cy * previewScale, cw * previewScale, ch * previewScale);
    }
  }, [workingImg, targetW, targetH, previewScale, pan, drawnW, drawnH, mode, zoom]);

  useEffect(() => { render(); }, [render]);

  function onPointerDown(e) {
    if (mode !== 'fill') return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }
  function onPointerMove(e) {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startX) / previewScale;
    const dy = (e.clientY - dragRef.current.startY) / previewScale;
    setPan(clampPan({ x: dragRef.current.startPan.x + dx, y: dragRef.current.startPan.y + dy }));
  }
  function onPointerUp() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  }

  function download() {
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = mode === 'fit' ? '#FFFFFF' : '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
    if (mode === 'fill') {
      ctx.drawImage(workingImg, pan.x, pan.y, drawnW, drawnH);
    } else {
      const containScale = Math.min(targetW / workingImg.width, targetH / workingImg.height) * zoom;
      const cw = workingImg.width * containScale, ch = workingImg.height * containScale;
      ctx.drawImage(workingImg, (targetW - cw) / 2, (targetH - ch) / 2, cw, ch);
    }
    const ext = exportFormat === 'image/png' ? 'png' : 'jpg';
    const url = canvas.toDataURL(exportFormat, 0.92);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resized-${targetW}x${targetH}.${ext}`;
    link.click();
  }

  const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
  const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem' };

  if (!img) {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a photo to resize or crop</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
            Pick a platform preset — Instagram, LinkedIn, YouTube, and more — or set your own custom size.
          </p>
          <input type="file" accept="image/*" onChange={handleUpload} />
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(280px, 1fr)', gap: 28 }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
            <div>
              <label style={labelStyle}>Platform</label>
              <select style={inputStyle} value={group} onChange={(e) => { setGroup(e.target.value); setPresetId(PRESET_GROUPS[e.target.value][0].id); }}>
                {Object.keys(PRESET_GROUPS).map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Size</label>
              <select style={inputStyle} value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                {PRESET_GROUPS[group].map((p) => (
                  <option key={p.id} value={p.id}>{p.label}{p.w ? ` — ${p.w}×${p.h}` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {presetId === 'custom' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end', marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Width (px)</label>
                <input type="number" style={inputStyle} value={customW} onChange={(e) => {
                  const w = Number(e.target.value);
                  setCustomW(w);
                  if (lockAspect) setCustomH(Math.round(w * (customH / customW || 1)));
                }} />
              </div>
              <div>
                <label style={labelStyle}>Height (px)</label>
                <input type="number" style={inputStyle} value={customH} onChange={(e) => setCustomH(Number(e.target.value))} />
              </div>
              <label style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                <input type="checkbox" checked={lockAspect} onChange={(e) => setLockAspect(e.target.checked)} /> Lock ratio
              </label>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Fit mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setMode('fill')} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, border: mode === 'fill' ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: mode === 'fill' ? '#EFF6FF' : 'white' }}>Fill (crop to fit)</button>
              <button onClick={() => setMode('fit')} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, border: mode === 'fit' ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: mode === 'fit' ? '#EFF6FF' : 'white' }}>Fit (no crop)</button>
            </div>
          </div>

          {mode === 'fill' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Zoom</label>
              <input type="range" min="1" max="3" step="0.02" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%' }} />
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', margin: '4px 0 0' }}>Drag the preview to reposition.</p>
            </div>
          )}
          {mode === 'fit' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Scale</label>
              <input type="range" min="0.3" max="1" step="0.02" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setRotation((r) => (r + 90) % 360)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>↻ Rotate</button>
            <button onClick={() => setFlipH((f) => !f)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E2E8F0', background: flipH ? '#EFF6FF' : 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>⇋ Flip H</button>
            <button onClick={() => setFlipV((f) => !f)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid #E2E8F0', background: flipV ? '#EFF6FF' : 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>⇵ Flip V</button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Export format</label>
            <select style={inputStyle} value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
              <option value="image/jpeg">JPEG</option>
              <option value="image/png">PNG</option>
            </select>
          </div>

          <button onClick={download} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            ⬇ Download ({targetW}×{targetH})
          </button>
          <button onClick={() => setImg(null)} style={{ width: '100%', marginTop: 8, padding: '10px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#475569' }}>
            Upload a different photo
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F8FAFC', borderRadius: 16, padding: 20 }}>
          <canvas
            ref={previewCanvasRef}
            onPointerDown={onPointerDown}
            style={{ borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', cursor: mode === 'fill' ? 'grab' : 'default', touchAction: 'none' }}
          />
        </div>
      </div>

      <p className="privacy-note">Everything happens in your browser — your photo is never uploaded to a server.</p>
    </div>
  );
}
