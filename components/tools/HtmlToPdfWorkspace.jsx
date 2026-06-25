'use client';

import { useState, useRef } from 'react';

export default function HtmlToPdfWorkspace() {
  const [html, setHtml] = useState('');
  const [pageSize, setPageSize] = useState('a4');
  const [orientation, setOrientation] = useState('portrait');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const renderRef = useRef();

  async function convert() {
    if (!html.trim()) { setStatus('Please paste some HTML first.'); return; }
    setLoading(true); setStatus('Rendering HTML…');
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const w = pageSize === 'a4' ? 794 : 816;
      const el = renderRef.current;
      el.style.width = w + 'px';
      el.innerHTML = html;
      await new Promise(r => setTimeout(r, 700));
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: w });
      el.innerHTML = ''; el.style.width = '';
      const pdfW = pageSize === 'a4' ? (orientation === 'portrait' ? 210 : 297) : (orientation === 'portrait' ? 215.9 : 279.4);
      const pdfH = pageSize === 'a4' ? (orientation === 'portrait' ? 297 : 210) : (orientation === 'portrait' ? 279.4 : 215.9);
      const pdf = new jsPDF({ orientation, unit: 'mm', format: pageSize });
      const imgW = pdfW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let yOffset = 0, remaining = imgH;
      while (remaining > 0) {
        if (yOffset > 0) pdf.addPage();
        const srcY = (yOffset / imgH) * canvas.height;
        const sliceH = Math.min(pdfH, remaining);
        const slicePx = (sliceH / imgH) * canvas.height;
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width; sliceCanvas.height = Math.ceil(slicePx);
        sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, sliceH);
        remaining -= sliceH; yOffset += sliceH;
      }
      pdf.save('convertam-html.pdf');
      setStatus('✅ Done! Your PDF download should start.');
    } catch (e) { console.error(e); setStatus('Conversion failed. Try simplifying the HTML.'); }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="px-4 py-3 rounded-xl text-sm" style={{ background: '#f0f5ff', border: '1px solid #d0dcf5', color: '#3a63b8' }}>
        💡 Paste any HTML below. External images may not load — embed them as base64 for best results.
      </div>
      <div>
        <label className="block text-sm font-semibold text-ink mb-2">HTML code</label>
        <textarea value={html} onChange={e => setHtml(e.target.value)} placeholder={'<!DOCTYPE html>\n<html>\n<body>\n  <h1>Hello!</h1>\n</body>\n</html>'} rows={12} className="w-full px-4 py-3 rounded-xl text-sm font-mono resize-y" style={{ border: '1px solid #e2dcc9', background: '#fffefb', lineHeight: 1.6 }} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Page size</label>
          <select value={pageSize} onChange={e => setPageSize(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid #e2dcc9', background: '#fffefb' }}>
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-soft mb-1">Orientation</label>
          <select value={orientation} onChange={e => setOrientation(e.target.value)} className="w-full px-3 py-2 rounded-xl text-sm" style={{ border: '1px solid #e2dcc9', background: '#fffefb' }}>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </div>
      </div>
      <button onClick={convert} disabled={loading || !html.trim()} className="w-full py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#D95F2B' }}>
        {loading ? (status || 'Converting…') : 'Convert to PDF & Download'}
      </button>
      {!loading && status && <p className={`text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{status}</p>}
      <div ref={renderRef} style={{ position: 'fixed', left: '-9999px', top: 0, background: 'white', padding: 40 }} />
    </div>
  );
}
