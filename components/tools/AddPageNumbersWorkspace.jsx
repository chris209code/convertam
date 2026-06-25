'use client';

import { useState, useRef } from 'react';

const POSITIONS = [
  { id: 'top-left', label: '↖ Top Left' },
  { id: 'top-center', label: '↑ Top Center' },
  { id: 'top-right', label: '↗ Top Right' },
  { id: 'bottom-left', label: '↙ Bottom Left' },
  { id: 'bottom-center', label: '↓ Bottom Center' },
  { id: 'bottom-right', label: '↘ Bottom Right' },
];

export default function AddPageNumbersWorkspace() {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [position, setPosition] = useState('bottom-center');
  const [startNum, setStartNum] = useState(1);
  const [fontSize, setFontSize] = useState(12);
  const [format, setFormat] = useState('plain');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file || file.type !== 'application/pdf') return;
    const buffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buffer));
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(buffer);
    setFileInfo({ name: file.name, pages: doc.getPageCount(), size: (file.size / 1024).toFixed(0) });
    setStatus('');
  }

  async function process() {
    setLoading(true); setStatus('');
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const total = pages.length;
      const margin = 28;
      pages.forEach((page, idx) => {
        const { width, height } = page.getSize();
        const num = startNum + idx;
        const text = format === 'plain' ? `${num}` : format === 'page-of' ? `Page ${num} of ${total + startNum - 1}` : `— ${num} —`;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const x = position.includes('left') ? margin : position.includes('right') ? width - textWidth - margin : (width - textWidth) / 2;
        const y = position.includes('top') ? height - margin - fontSize : margin;
        page.drawText(text, { x, y, size: fontSize, font, color: rgb(0.3, 0.3, 0.3) });
      });
      const newBytes = await pdfDoc.save();
      const blob = new Blob([newBytes], { type: 'application/pdf' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'convertam-numbered.pdf';
      a.click();
      setStatus('✅ Done! Your download should start.');
    } catch { setStatus('Something went wrong. Please try another PDF.'); }
    setLoading(false);
  }

  function reset() { setPdfBytes(null); setFileInfo(null); setStatus(''); }

  if (!pdfBytes) {
    return (
      <div>
        <div onClick={() => fileRef.current.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }} className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer" style={{ borderColor: '#e2dcc9', background: '#fffefb' }}>
          <div className="text-4xl mb-3">📄</div>
          <p className="font-medium text-ink mb-1">Drop your PDF here</p>
          <p className="text-sm text-ink-soft">or click to browse</p>
        </div>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5' }}>
        <span className="font-medium text-ink">📄 {fileInfo.name} · {fileInfo.pages} pages · {fileInfo.size} KB</span>
        <button onClick={reset} className="text-xs text-ink-soft underline ml-3">Change</button>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink mb-2">Position</p>
        <div className="grid grid-cols-3 gap-2">
          {POSITIONS.map(p => (
            <button key={p.id} onClick={() => setPosition(p.id)} className="py-2 px-3 rounded-xl text-xs font-medium" style={{ border: `1px solid ${position === p.id ? '#3a63b8' : '#e2dcc9'}`, background: position === p.id ? '#f0f5ff' : '#fffefb', color: position === p.id ? '#3a63b8' : '#555', fontWeight: position === p.id ? 700 : 500 }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Start from</label>
          <input type="number" min={1} max={9999} value={startNum} onChange={e => setStartNum(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid #e2dcc9', background: '#fffefb' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Font size (pt)</label>
          <input type="number" min={8} max={36} value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid #e2dcc9', background: '#fffefb' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Format</label>
          <select value={format} onChange={e => setFormat(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid #e2dcc9', background: '#fffefb' }}>
            <option value="plain">1, 2, 3 …</option>
            <option value="page-of">Page 1 of N …</option>
            <option value="dash">— 1 —, — 2 — …</option>
          </select>
        </div>
      </div>
      <button onClick={process} disabled={loading} className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#D95F2B' }}>
        {loading ? 'Adding numbers…' : 'Add Numbers & Download'}
      </button>
      {status && <p className={`text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{status}</p>}
    </div>
  );
}
