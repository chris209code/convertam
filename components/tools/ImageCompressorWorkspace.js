'use client';

import { useState } from 'react';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function compressImage(file, quality, format) {
  return new Promise((resolve) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => resolve(blob), format, quality);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

const emptyItem = (file) => ({
  file,
  name: file.name,
  originalSize: file.size,
  compressedBlob: null,
  compressedSize: null,
  previewUrl: URL.createObjectURL(file),
  status: 'pending', // pending | done
});

export default function ImageCompressorWorkspace() {
  const [items, setItems] = useState([]);
  const [quality, setQuality] = useState(0.75);
  const [format, setFormat] = useState('auto');
  const [busy, setBusy] = useState(false);

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setItems(files.map(emptyItem));
  }

  function targetFormat(originalType) {
    if (format === 'auto') return originalType === 'image/png' ? 'image/png' : 'image/jpeg';
    return format;
  }

  async function handleCompressAll() {
    setBusy(true);
    const updated = [...items];
    for (let i = 0; i < updated.length; i++) {
      const item = updated[i];
      const fmt = targetFormat(item.file.type);
      const blob = await compressImage(item.file, quality, fmt);
      updated[i] = { ...item, compressedBlob: blob, compressedSize: blob.size, status: 'done' };
      setItems([...updated]);
    }
    setBusy(false);
  }

  function downloadOne(item) {
    if (!item.compressedBlob) return;
    const url = URL.createObjectURL(item.compressedBlob);
    const link = document.createElement('a');
    link.href = url;
    const ext = item.compressedBlob.type === 'image/png' ? 'png' : 'jpg';
    link.download = item.name.replace(/\.[^.]+$/, '') + `-compressed.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAllZip() {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    items.forEach((item) => {
      if (!item.compressedBlob) return;
      const ext = item.compressedBlob.type === 'image/png' ? 'png' : 'jpg';
      zip.file(item.name.replace(/\.[^.]+$/, '') + `-compressed.${ext}`, item.compressedBlob);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'compressed-images.zip';
    link.click();
    URL.revokeObjectURL(url);
  }

  const allDone = items.length > 0 && items.every((i) => i.status === 'done');
  const totalOriginal = items.reduce((sum, i) => sum + i.originalSize, 0);
  const totalCompressed = items.reduce((sum, i) => sum + (i.compressedSize || 0), 0);
  const totalSavedPct = totalOriginal && totalCompressed ? Math.round((1 - totalCompressed / totalOriginal) * 100) : 0;

  return (
    <div className="panel">
      {items.length === 0 && (
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>
            Upload images to compress
          </p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>
            JPG, PNG, or WebP. Upload several at once to compress them all together.
          </p>
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
        </div>
      )}

      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                Quality — {Math.round(quality * 100)}%
              </label>
              <input type="range" min="0.1" max="1" step="0.05" value={quality} onChange={(e) => setQuality(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Output format</label>
              <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <option value="auto">Keep original type</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/webp">WebP</option>
                <option value="image/png">PNG</option>
              </select>
            </div>
            <button
              onClick={handleCompressAll}
              disabled={busy}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#1E3A8A', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: busy ? 'default' : 'pointer' }}
            >
              {busy ? 'Compressing…' : `Compress ${items.length} Image${items.length > 1 ? 's' : ''}`}
            </button>
            <button
              onClick={() => setItems([])}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Start Over
            </button>
          </div>

          {allDone && totalOriginal > 0 && (
            <div style={{ padding: 14, background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <span style={{ fontSize: '0.88rem', color: '#065F46', fontWeight: 600 }}>
                {formatBytes(totalOriginal)} → {formatBytes(totalCompressed)} · saved {totalSavedPct}%
              </span>
              {items.length > 1 && (
                <button onClick={downloadAllZip} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                  ⬇ Download All (ZIP)
                </button>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item, i) => {
              const pct = item.compressedSize ? Math.round((1 - item.compressedSize / item.originalSize) * 100) : null;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, border: '1px solid #E2E8F0', borderRadius: 10 }}>
                  <img src={item.previewUrl} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                      {formatBytes(item.originalSize)}
                      {item.compressedSize != null && ` → ${formatBytes(item.compressedSize)} (${pct}% smaller)`}
                    </p>
                  </div>
                  {item.status === 'done' && (
                    <button onClick={() => downloadOne(item)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                      ⬇ Download
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="privacy-note">Everything happens in your browser — your images are never uploaded to a server.</p>
    </div>
  );
}
