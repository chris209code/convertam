'use client';

import { useState, useRef } from 'react';

const SAMPLE = `# Project Notes

A short **Markdown to PDF** example.

## Highlights
- Headings, lists, and *emphasis*
- \`inline code\` and fenced code blocks
- [Links](https://convertam.app) and tables

> A blockquote looks like this.

\`\`\`js
function hello() {
  console.log('Hello, world!');
}
\`\`\`

| Feature | Supported |
| --- | --- |
| Tables | Yes |
| Code blocks | Yes |
`;

const MD_STYLES = `
  .md-content { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; line-height: 1.65; font-size: 15px; }
  .md-content h1 { font-size: 2em; font-weight: 800; margin: 0 0 16px; color: #0F172A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; }
  .md-content h2 { font-size: 1.5em; font-weight: 700; margin: 28px 0 12px; color: #0F172A; }
  .md-content h3 { font-size: 1.2em; font-weight: 700; margin: 22px 0 10px; color: #0F172A; }
  .md-content h4, .md-content h5, .md-content h6 { font-weight: 700; margin: 18px 0 8px; color: #1E293B; }
  .md-content p { margin: 0 0 14px; }
  .md-content ul, .md-content ol { margin: 0 0 14px; padding-left: 28px; }
  .md-content li { margin-bottom: 6px; }
  .md-content a { color: #2563EB; text-decoration: underline; }
  .md-content strong { font-weight: 700; }
  .md-content em { font-style: italic; }
  .md-content code { background: #F1F5F9; color: #DC2626; padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', Consolas, monospace; font-size: 0.88em; }
  .md-content pre { background: #0F172A; color: #E2E8F0; padding: 16px 18px; border-radius: 10px; overflow-x: auto; margin: 0 0 16px; }
  .md-content pre code { background: none; color: inherit; padding: 0; font-size: 0.85em; line-height: 1.6; }
  .md-content blockquote { border-left: 4px solid #CBD5E1; margin: 0 0 16px; padding: 4px 16px; color: #475569; background: #F8FAFC; border-radius: 0 8px 8px 0; }
  .md-content hr { border: none; border-top: 1px solid #E2E8F0; margin: 24px 0; }
  .md-content table { border-collapse: collapse; width: 100%; margin: 0 0 16px; }
  .md-content th, .md-content td { border: 1px solid #E2E8F0; padding: 8px 12px; text-align: left; }
  .md-content th { background: #F8FAFC; font-weight: 700; }
  .md-content img { max-width: 100%; }
`;

export default function MarkdownToPdfWorkspace() {
  const [markdown, setMarkdown] = useState('');
  const [pageSize, setPageSize] = useState('a4');
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const renderRef = useRef();
  const fileRef = useRef();

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setMarkdown(text);
    setShowPreview(false);
    setStatus('');
  }

  async function togglePreview() {
    if (!showPreview) {
      const { marked } = await import('marked');
      setPreviewHtml(marked.parse(markdown || SAMPLE));
    }
    setShowPreview((v) => !v);
  }

  async function convert() {
    const source = markdown.trim() || SAMPLE;
    setLoading(true);
    setStatus('Rendering PDF…');
    try {
      const { marked } = await import('marked');
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const html = marked.parse(source);
      const w = pageSize === 'a4' ? 794 : 816;
      const el = renderRef.current;
      el.style.width = w + 'px';
      el.innerHTML = `<div class="md-content">${html}</div>`;
      await new Promise((r) => setTimeout(r, 400));

      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', width: w });
      el.innerHTML = '';
      el.style.width = '';

      const pdfW = pageSize === 'a4' ? 210 : 215.9;
      const pdfH = pageSize === 'a4' ? 297 : 279.4;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: pageSize });
      const imgW = pdfW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let yOffset = 0;
      let remaining = imgH;
      while (remaining > 0) {
        if (yOffset > 0) pdf.addPage();
        const srcY = (yOffset / imgH) * canvas.height;
        const sliceH = Math.min(pdfH, remaining);
        const slicePx = (sliceH / imgH) * canvas.height;
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.ceil(slicePx);
        sliceCanvas.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);
        pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, imgW, sliceH);
        remaining -= sliceH;
        yOffset += sliceH;
      }
      pdf.save('convertam-markdown.pdf');
      setStatus('✅ Done! Your PDF download should start.');
    } catch (e) {
      console.error(e);
      setStatus('Conversion failed. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="panel">
      <style dangerouslySetInnerHTML={{ __html: MD_STYLES }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Markdown</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => fileRef.current.click()} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            Upload .md file
          </button>
          <input ref={fileRef} type="file" accept=".md,.markdown,text/markdown,text/plain" hidden onChange={handleFile} />
          <button onClick={togglePreview} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: showPreview ? '#EFF6FF' : 'white', color: showPreview ? '#1D4ED8' : '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      <textarea
        value={markdown}
        onChange={(e) => { setMarkdown(e.target.value); setStatus(''); }}
        placeholder={SAMPLE}
        rows={14}
        style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid #E2E8F0', fontFamily: 'SF Mono, Consolas, monospace', fontSize: '0.85rem', lineHeight: 1.6, resize: 'vertical' }}
      />

      {showPreview && (
        <div style={{ marginTop: 14, padding: 20, border: '1px solid #E2E8F0', borderRadius: 10, background: '#FAFAFA', maxHeight: 420, overflowY: 'auto' }}>
          <div className="md-content" dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginTop: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Page size</label>
          <select value={pageSize} onChange={(e) => setPageSize(e.target.value)} style={{ padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
          </select>
        </div>
        <button onClick={convert} disabled={loading} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: loading ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: loading ? 'default' : 'pointer' }}>
          {loading ? (status || 'Converting…') : 'Convert to PDF & Download'}
        </button>
      </div>

      {!loading && status && (
        <p style={{ fontSize: '0.85rem', fontWeight: 600, color: status.startsWith('✅') ? '#15803D' : '#DC2626', marginBottom: 12 }}>{status}</p>
      )}

      <p className="privacy-note">Everything happens in your browser — your Markdown is never uploaded to a server.</p>
      <div ref={renderRef} style={{ position: 'fixed', left: '-9999px', top: 0, background: 'white', padding: 40 }} />
    </div>
  );
}
