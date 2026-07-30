'use client';

import { useState } from 'react';

async function extractText(file, onProgress) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');
    pageTexts.push(text);
    onProgress?.(i, pdf.numPages);
  }
  return pageTexts;
}

export default function PdfToTextWorkspace() {
  const [fileName, setFileName] = useState('');
  const [pageTexts, setPageTexts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;
    setFileName(file.name);
    setPageTexts(null);
    setError('');
    setBusy(true);
    setProgress(null);
    try {
      const texts = await extractText(file, (i, total) => setProgress({ i, total }));
      setPageTexts(texts);
    } catch {
      setError('Could not read this PDF — it may be corrupted, password-protected, or scanned images with no extractable text (try OCR PDF instead).');
    }
    setBusy(false);
  }

  const fullText = pageTexts ? pageTexts.join('\n\n').trim() : '';
  const isEmpty = pageTexts && fullText.length === 0;

  function downloadTxt() {
    const blob = new Blob([fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.replace(/\.pdf$/i, '') + '.txt';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function copyText() {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="panel">
      {!pageTexts && !busy && (
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a PDF to extract its text</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Pulls all readable text out of a PDF, page by page.</p>
          <input type="file" accept="application/pdf" onChange={handleFile} />
        </div>
      )}

      {busy && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B', fontSize: '0.9rem' }}>
          {progress ? `Reading page ${progress.i} of ${progress.total}…` : 'Reading PDF…'}
        </div>
      )}

      {error && (
        <div style={{ padding: 16, borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.85rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {pageTexts && !busy && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ flex: 1, fontSize: '0.85rem', color: '#1E293B', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName} — {pageTexts.length} page{pageTexts.length > 1 ? 's' : ''}</span>
            <button onClick={copyText} disabled={isEmpty} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: isEmpty ? 'default' : 'pointer', opacity: isEmpty ? 0.5 : 1 }}>
              {copied ? '✓ Copied' : '📋 Copy Text'}
            </button>
            <button onClick={downloadTxt} disabled={isEmpty} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: isEmpty ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: isEmpty ? 'default' : 'pointer' }}>
              ⬇ Download .txt
            </button>
            <button onClick={() => { setPageTexts(null); setFileName(''); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>Start Over</button>
          </div>

          {isEmpty ? (
            <div style={{ padding: 16, borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: '0.85rem' }}>
              No extractable text was found in this PDF — it's likely a scanned document made of images. Try OCR PDF instead, which can read text from scanned pages.
            </div>
          ) : (
            <textarea
              readOnly
              value={fullText}
              style={{ width: '100%', minHeight: 380, padding: 14, borderRadius: 10, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '0.85rem', color: '#1E293B', lineHeight: 1.6, resize: 'vertical' }}
            />
          )}
        </>
      )}

      <p className="privacy-note">Everything happens in your browser — your PDF is never uploaded to a server.</p>
    </div>
  );
}
