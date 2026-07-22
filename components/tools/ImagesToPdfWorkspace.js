'use client';

import { useState, useEffect } from 'react';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

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

export default function ImagesToPdfWorkspace() {
  const { session, startSession } = useDocumentSession();
  const [items, setItems] = useState([]); // { file, name, img }
  const [busy, setBusy] = useState(false);
  const [pageSize, setPageSize] = useState('fit'); // fit = page matches image, a4 = standard A4
  const [resultBytes, setResultBytes] = useState(null);

  useEffect(() => { setResultBytes(null); }, [items, pageSize]);

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const loaded = await Promise.all(files.map(async (file) => {
      const dataUrl = await fileToDataUrl(file);
      const img = await loadImage(dataUrl);
      return { file, name: file.name, img, dataUrl };
    }));
    setItems((prev) => [...prev, ...loaded]);
  }

  function move(i, dir) {
    setItems((prev) => {
      const arr = [...prev];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return arr;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }
  function remove(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleApply() {
    if (!items.length) return;
    setBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();

      for (const item of items) {
        const isPng = item.file.type === 'image/png';
        const bytes = await item.file.arrayBuffer();
        const embedded = isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes).catch(async () => {
          // Non-JPEG/PNG (e.g. webp) — draw to canvas and re-encode as JPEG first
          const canvas = document.createElement('canvas');
          canvas.width = item.img.naturalWidth;
          canvas.height = item.img.naturalHeight;
          canvas.getContext('2d').drawImage(item.img, 0, 0);
          const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.92);
          const jpegBytes = await (await fetch(jpegDataUrl)).arrayBuffer();
          return pdfDoc.embedJpg(jpegBytes);
        });

        if (pageSize === 'a4') {
          const page = pdfDoc.addPage([595.28, 841.89]);
          const margin = 30;
          const maxW = 595.28 - margin * 2;
          const maxH = 841.89 - margin * 2;
          const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
          const w = embedded.width * scale, h = embedded.height * scale;
          page.drawImage(embedded, { x: (595.28 - w) / 2, y: (841.89 - h) / 2, width: w, height: h });
        } else {
          const page = pdfDoc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
        }
      }

      const bytes = await pdfDoc.save();
      setResultBytes(bytes);

      // Push-only: this tool takes images, not the session's PDF, as input —
      // there's nothing to pull. Its output can still become (or replace)
      // the session document, same as any other tool's terminal step.
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        await startSession(new File([bytes], 'images.pdf', { type: 'application/pdf' }), { toolSlug: 'images-to-pdf' });
      }
    } finally {
      setBusy(false);
    }
  }

  // Downloading exports the current document but does not end the
  // workspace — see WorkspaceSidebar for Close Workspace.
  function downloadResult() {
    if (!resultBytes) return;
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'images.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel">
      {items.length === 0 ? (
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload images to combine into one PDF</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>JPG, PNG, or WebP. Upload several at once — you can reorder them after.</p>
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginRight: 8 }}>Page size:</label>
              <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <option value="fit">Match each image</option>
                <option value="a4">Standard A4</option>
              </select>
            </div>
            <label style={{ fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '7px 14px', borderRadius: 8, cursor: 'pointer' }}>
              + Add More
              <input type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
            </label>
          </div>

          <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, border: '1px solid #E2E8F0', borderRadius: 10 }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', width: 20 }}>{i + 1}</span>
                <img src={item.dataUrl} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                <span style={{ flex: 1, fontSize: '0.85rem', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', color: i === 0 ? '#CBD5E1' : '#475569' }}>↑</button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem', color: i === items.length - 1 ? '#CBD5E1' : '#475569' }}>↓</button>
                <button onClick={() => remove(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '0.8rem' }}>Remove</button>
              </div>
            ))}
          </div>

          {!resultBytes ? (
            <button onClick={handleApply} disabled={busy} style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: busy ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: busy ? 'default' : 'pointer' }}>
              {busy ? 'Building PDF…' : `Build PDF (${items.length} page${items.length > 1 ? 's' : ''})`}
            </button>
          ) : (
            <ContinueWorkingPanel toolSlug="images-to-pdf" documentName="images.pdf" onDownload={downloadResult} downloading={busy} />
          )}
        </>
      )}
      <p className="privacy-note">Everything happens in your browser — your images are never uploaded to a server.</p>
    </div>
  );
}
