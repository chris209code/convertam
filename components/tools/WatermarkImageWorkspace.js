'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

const POSITIONS = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.src = src;
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function drawWatermark(ctx, canvasW, canvasH, opts) {
  const { type, text, textColor, fontSize, logoImg, opacity, rotation, scale, position, tiled } = opts;
  ctx.save();
  ctx.globalAlpha = opacity;

  const drawOne = (cx, cy) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    if (type === 'text') {
      ctx.font = `700 ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 0, 0);
    } else if (logoImg) {
      const w = logoImg.width * scale, h = logoImg.height * scale;
      ctx.drawImage(logoImg, -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  };

  if (tiled) {
    const stepX = Math.max(canvasW / 4, 120);
    const stepY = Math.max(canvasH / 4, 120);
    for (let y = stepY / 2; y < canvasH + stepY; y += stepY) {
      for (let x = stepX / 2; x < canvasW + stepX; x += stepX) {
        drawOne(x, y);
      }
    }
  } else {
    const margin = 30;
    const posMap = {
      'top-left': [margin, margin],
      'top-center': [canvasW / 2, margin],
      'top-right': [canvasW - margin, margin],
      'middle-left': [margin, canvasH / 2],
      center: [canvasW / 2, canvasH / 2],
      'middle-right': [canvasW - margin, canvasH / 2],
      'bottom-left': [margin, canvasH - margin],
      'bottom-center': [canvasW / 2, canvasH - margin],
      'bottom-right': [canvasW - margin, canvasH - margin],
    };
    const [x, y] = posMap[position] || posMap.center;
    if (type === 'text') {
      ctx.save();
      ctx.font = `700 ${fontSize}px Arial, sans-serif`;
      ctx.fillStyle = textColor;
      ctx.globalAlpha = opacity;
      ctx.textBaseline = 'middle';
      ctx.textAlign = position.includes('left') ? 'left' : position.includes('right') ? 'right' : 'center';
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    } else {
      drawOne(x, y);
    }
  }
  ctx.restore();
}

export default function WatermarkImageWorkspace() {
  const [items, setItems] = useState([]);
  const [activeIdx, setActiveIdx] = useState(0);

  const [type, setType] = useState('text');
  const [text, setText] = useState('© Your Brand');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [fontSize, setFontSize] = useState(36);
  const [logoImg, setLogoImg] = useState(null);
  const [opacity, setOpacity] = useState(0.5);
  const [rotation, setRotation] = useState(-30);
  const [scale, setScale] = useState(0.3);
  const [position, setPosition] = useState('bottom-right');
  const [tiled, setTiled] = useState(false);

  const previewCanvasRef = useRef(null);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const loaded = await Promise.all(files.map(async (file) => {
      const dataUrl = await fileToDataUrl(file);
      const img = await loadImage(dataUrl);
      return { file, img, name: file.name };
    }));
    setItems(loaded);
    setActiveIdx(0);
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const img = await loadImage(dataUrl);
    setLogoImg(img);
  }

  const opts = { type, text, textColor, fontSize, logoImg, opacity, rotation, scale, position, tiled };

  const renderPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    const active = items[activeIdx];
    if (!canvas || !active) return;
    const maxDim = 460;
    const displayScale = Math.min(1, maxDim / Math.max(active.img.width, active.img.height));
    canvas.width = active.img.width * displayScale;
    canvas.height = active.img.height * displayScale;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(active.img, 0, 0, canvas.width, canvas.height);
    drawWatermark(ctx, canvas.width, canvas.height, {
      ...opts,
      fontSize: fontSize * displayScale,
    });
  }, [items, activeIdx, opts, fontSize]);

  useEffect(() => { renderPreview(); }, [renderPreview]);

  function renderFull(item) {
    const canvas = document.createElement('canvas');
    canvas.width = item.img.width;
    canvas.height = item.img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(item.img, 0, 0);
    drawWatermark(ctx, canvas.width, canvas.height, opts);
    return canvas;
  }

  function downloadOne(item) {
    const canvas = renderFull(item);
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = item.name.replace(/\.[^.]+$/, '') + '-watermarked.png';
    link.click();
  }

  async function downloadAllZip() {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    for (const item of items) {
      const canvas = renderFull(item);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      zip.file(item.name.replace(/\.[^.]+$/, '') + '-watermarked.png', blob);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'watermarked-images.zip';
    link.click();
    URL.revokeObjectURL(url);
  }

  const labelStyle = { fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };
  const inputStyle = { width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem' };

  if (items.length === 0) {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload images to watermark</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Upload several at once to watermark them all the same way.</p>
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(280px, 1fr)', gap: 28 }}>
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Watermark type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setType('text')} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, border: type === 'text' ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: type === 'text' ? '#EFF6FF' : 'white' }}>Text</button>
              <button onClick={() => setType('logo')} style={{ flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, border: type === 'logo' ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: type === 'logo' ? '#EFF6FF' : 'white' }}>Logo</button>
            </div>
          </div>

          {type === 'text' ? (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Watermark text</label>
                <input style={inputStyle} value={text} onChange={(e) => setText(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={labelStyle}>Color</label>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid #E2E8F0', cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={labelStyle}>Font size — {fontSize}px</label>
                  <input type="range" min="12" max="120" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Logo image</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload} />
              {!logoImg && <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 4 }}>Upload a logo (PNG with transparency works best).</p>}
              {logoImg && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>Size — {Math.round(scale * 100)}%</label>
                  <input type="range" min="0.05" max="1" step="0.02" value={scale} onChange={(e) => setScale(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Opacity — {Math.round(opacity * 100)}%</label>
              <input type="range" min="0.05" max="1" step="0.02" value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={labelStyle}>Rotation — {rotation}°</label>
              <input type="range" min="-90" max="90" value={rotation} onChange={(e) => setRotation(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={tiled} onChange={(e) => setTiled(e.target.checked)} /> Repeat watermark across the whole image (tiled)
            </label>
          </div>

          {!tiled && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Position</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 150 }}>
                {POSITIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPosition(p)}
                    style={{ aspectRatio: 1, borderRadius: 6, cursor: 'pointer', border: position === p ? '2px solid #1E3A8A' : '1px solid #E2E8F0', background: position === p ? '#1E3A8A' : 'white' }}
                  />
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => downloadOne(items[activeIdx])} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              ⬇ Download This One
            </button>
            {items.length > 1 && (
              <button onClick={downloadAllZip} style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: '#059669', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                ⬇ Download All ({items.length})
              </button>
            )}
          </div>
          <button onClick={() => setItems([])} style={{ width: '100%', marginTop: 8, padding: '9px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
            Start Over
          </button>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'center', background: '#F8FAFC', borderRadius: 16, padding: 20, marginBottom: 12 }}>
            <canvas ref={previewCanvasRef} style={{ borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxWidth: '100%' }} />
          </div>
          {items.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
              {items.map((item, i) => (
                <img
                  key={i}
                  src={item.img.src}
                  alt=""
                  onClick={() => setActiveIdx(i)}
                  style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: i === activeIdx ? '2px solid #1E3A8A' : '2px solid transparent', flexShrink: 0 }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="privacy-note">Everything happens in your browser — your images are never uploaded to a server.</p>
    </div>
  );
}
