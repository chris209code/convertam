'use client';

import { useState, useRef } from 'react';

export default function RemovePagesWorkspace() {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [thumbs, setThumbs] = useState([]);
  const [marked, setMarked] = useState(new Set());
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') return;
    setRendering(true);
    setMarked(new Set());
    setStatus('');
    const buffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buffer));
    await renderThumbs(buffer);
    setRendering(false);
  }

  async function renderThumbs(buffer) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 0.4 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      pages.push({ num: i, dataUrl: canvas.toDataURL() });
    }
    setThumbs(pages);
  }

  function togglePage(num) {
    setMarked(prev => {
      const next = new Set(prev);
      next.has(num) ? next.delete(num) : next.add(num);
      return next;
    });
  }

  async function removeAndDownload() {
    if (marked.size === 0) { setStatus('No pages selected.'); return; }
    if (marked.size === thumbs.length) { setStatus('You must keep at least one page.'); return; }
    setLoading(true);
    setStatus('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const indices = [...marked].map(n => n - 1).sort((a, b) => b - a);
      for (const idx of indices) pdfDoc.removePage(idx);
      const newBytes = await pdfDoc.save();
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'convertam-removed-pages.pdf';
      a.click();
      setStatus('✅ Done! Removed ' + marked.size + ' page(s).');
    } catch {
      setStatus('Something went wrong. Please try another PDF.');
    }
    setLoading(false);
  }

  function reset() {
    setPdfBytes(null); setThumbs([]); setMarked(new Set()); setStatus('');
  }

  if (!thumbs.length) {
    return (
      <div>
        <div
          onClick={() => fileRef.current.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
          className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer"
          style={{ borderColor: '#e2dcc9', background: '#fffefb' }}
        >
          <div className="text-4xl mb-3">📄</div>
          <p className="font-medium text-ink mb-1">Drop your PDF here</p>
          <p className="text-sm text-ink-soft">or click to browse</p>
          {rendering && <p className="text-sm text-stamp-blue mt-3">Rendering thumbnails…</p>}
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-soft mb-4">
        Click pages to mark for removal.
        {marked.size > 0 && <span className="ml-2 font-semibold" style={{ color: '#e53e3e' }}>{marked.size} page{marked.size > 1 ? 's' : ''} selected</span>}
      </p>
      <div className="flex flex-wrap gap-3 mb-6">
        {thumbs.map(({ num, dataUrl }) => {
          const isMarked = marked.has(num);
          return (
            <div key={num} onClick={() => togglePage(num)} className="cursor-pointer rounded-xl overflow-hidden select-none" style={{ width: 90, border: `2px solid ${isMarked ? '#e53e3e' : '#e2dcc9'}`, opacity: isMarked ? 0.6 : 1, position: 'relative' }}>
              {isMarked && <div style={{ position: 'absolute', top: 4, right: 4, background: '#e53e3e', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, zIndex: 1 }}>✕</div>}
              <img src={dataUrl} alt={`Page ${num}`} style={{ width: '100%', display: 'block' }} />
              <div className="text-center py-1" style={{ fontSize: 11, color: isMarked ? '#e53e3e' : '#888', fontWeight: isMarked ? 700 : 400 }}>Page {num}</div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <button onClick={removeAndDownload} disabled={loading || marked.size === 0} className="px-6 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#D95F2B' }}>
          {loading ? 'Processing…' : 'Remove & Download PDF'}
        </button>
        <button onClick={reset} className="px-5 py-3 rounded-xl font-semibold text-sm" style={{ background: '#f0f0ec', color: '#555', border: '1px solid #e2dcc9' }}>
          Start over
        </button>
      </div>
      {status && <p className={`mt-3 text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{status}</p>}
    </div>
  );
}
