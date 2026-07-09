'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function MemeGeneratorWorkspace() {
  const [img, setImg] = useState(null);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [fontSize, setFontSize] = useState(48);
  const canvasRef = useRef(null);

  function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new window.Image();
      image.onload = () => setImg(image);
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function drawCaption(ctx, text, x, y, maxWidth, size) {
    if (!text) return;
    ctx.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = size / 12;
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#FFFFFF';

    let s = size;
    while (ctx.measureText(text.toUpperCase()).width > maxWidth && s > 12) {
      s -= 1;
      ctx.font = `900 ${s}px Impact, "Arial Black", sans-serif`;
      ctx.lineWidth = s / 12;
    }
    ctx.strokeText(text.toUpperCase(), x, y);
    ctx.fillText(text.toUpperCase(), x, y);
  }

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const margin = canvas.width * 0.04;
    drawCaption(ctx, topText, canvas.width / 2, fontSize + margin, canvas.width - margin * 2, fontSize);
    drawCaption(ctx, bottomText, canvas.width / 2, canvas.height - margin, canvas.width - margin * 2, fontSize);
  }, [img, topText, bottomText, fontSize]);

  useEffect(() => { render(); }, [render]);

  function download() {
    const url = canvasRef.current.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = 'meme.png';
    link.click();
  }

  if (!img) {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload an image to caption</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Classic top/bottom meme text — bold white with a black outline.</p>
          <input type="file" accept="image/*" onChange={handleUpload} />
        </div>
        <p className="privacy-note">Everything happens in your browser — your image is never uploaded to a server.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) minmax(280px, 1.2fr)', gap: 24 }}>
        <div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Top text</label>
            <input value={topText} onChange={(e) => setTopText(e.target.value)} style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Bottom text</label>
            <input value={bottomText} onChange={(e) => setBottomText(e.target.value)} style={{ width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.88rem' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Text size — {fontSize}px</label>
            <input type="range" min="20" max="90" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <button onClick={download} style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>⬇ Download Meme</button>
          <button onClick={() => setImg(null)} style={{ width: '100%', marginTop: 8, padding: '9px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Upload a Different Image</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', background: '#F8FAFC', borderRadius: 16, padding: 16 }}>
          <canvas ref={canvasRef} style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }} />
        </div>
      </div>
      <p className="privacy-note">Everything happens in your browser — your image is never uploaded to a server.</p>
    </div>
  );
}
