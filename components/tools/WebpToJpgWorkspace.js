'use client';

import { useState } from 'react';

const FORMATS = [
  { value: 'image/jpeg', label: 'JPG', ext: 'jpg' },
  { value: 'image/png', label: 'PNG', ext: 'png' },
];

function convertWebp(file, targetType, quality) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (targetType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF'; // JPG has no transparency — flatten onto white
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Conversion failed'))), targetType, quality);
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

export default function WebpToJpgWorkspace() {
  const [items, setItems] = useState([]);
  const [targetFormat, setTargetFormat] = useState('image/jpeg');
  const [busy, setBusy] = useState(false);

  function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setItems(files.map((file) => ({ file, name: file.name, previewUrl: null, status: 'pending', outBlob: null, error: null })));
  }

  async function handleConvertAll() {
    setBusy(true);
    const updated = [...items];
    for (let i = 0; i < updated.length; i++) {
      try {
        const blob = await convertWebp(updated[i].file, targetFormat, 0.92);
        updated[i] = { ...updated[i], outBlob: blob, previewUrl: URL.createObjectURL(blob), status: 'done', error: null };
      } catch {
        updated[i] = { ...updated[i], status: 'error', error: 'Could not convert — is this a valid WebP image?' };
      }
      setItems([...updated]);
    }
    setBusy(false);
  }

  const ext = FORMATS.find((f) => f.value === targetFormat)?.ext || 'jpg';

  function downloadOne(item) {
    const url = URL.createObjectURL(item.outBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = item.name.replace(/\.[^.]+$/, '') + `.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadAllZip() {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    items.forEach((item) => {
      if (item.outBlob) zip.file(item.name.replace(/\.[^.]+$/, '') + `.${ext}`, item.outBlob);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `converted-${ext}-images.zip`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const doneItems = items.filter((i) => i.status === 'done');
  const allSettled = items.length > 0 && items.every((i) => i.status === 'done' || i.status === 'error');

  return (
    <div className="panel">
      {items.length === 0 ? (
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload WebP images to convert</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Convert WebP images to JPG or PNG. Upload several at once.</p>
          <input type="file" accept=".webp,image/webp" multiple onChange={handleFiles} />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Convert to</label>
              <select value={targetFormat} onChange={(e) => setTargetFormat(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                {FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <button onClick={handleConvertAll} disabled={busy} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Converting…' : `Convert ${items.length} Image${items.length > 1 ? 's' : ''}`}
            </button>
            <button onClick={() => setItems([])} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Start Over</button>
          </div>

          {allSettled && doneItems.length > 1 && (
            <div style={{ marginBottom: 16 }}>
              <button onClick={downloadAllZip} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#059669', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>⬇ Download All (ZIP)</button>
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, border: '1px solid #E2E8F0', borderRadius: 10 }}>
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: 8, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }} aria-hidden="true">🖼️</div>
                )}
                <span style={{ flex: 1, fontSize: '0.85rem', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                {item.status === 'done' && (
                  <button onClick={() => downloadOne(item)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>⬇ Download</button>
                )}
                {item.status === 'error' && (
                  <span style={{ fontSize: '0.78rem', color: '#DC2626', fontWeight: 600 }}>{item.error}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <p className="privacy-note">Everything happens in your browser — your images are never uploaded to a server.</p>
    </div>
  );
}
