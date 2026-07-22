'use client';

import { useState, useRef } from 'react';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

export default function RemovePagesWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState('document.pdf');
  const [thumbs, setThumbs] = useState([]);
  const [marked, setMarked] = useState(new Set());
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [resultBytes, setResultBytes] = useState(null);
  const fileRef = useRef();

  async function handleFile(file, { fromSession = false } = {}) {
    if (!file || file.type !== 'application/pdf') return;
    setRendering(true);
    setMarked(new Set());
    setStatus('');
    setResultBytes(null);
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buffer));
    await renderThumbs(buffer);
    setRendering(false);
    if (!fromSession) {
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        startSession(file, { toolSlug: 'remove-pdf-pages' });
      }
    }
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    await handleFile(f, { fromSession: true });
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
    setResultBytes(null);
  }

  async function applyRemoval() {
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
      setResultBytes(newBytes);
      await updateDocument(newBytes, { toolSlug: 'remove-pdf-pages', label: 'Pages removed' });
      setStatus('✅ Removed ' + marked.size + ' page(s) — choose what to do next.');
    } catch {
      setStatus('Something went wrong. Please try another PDF.');
    }
    setLoading(false);
  }

  // Downloading exports the current document but does not end the
  // workspace — see WorkspaceSidebar for Close Workspace.
  function downloadResult() {
    if (!resultBytes) return;
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'convertam-removed-pages.pdf';
    a.click();
  }

  function reset() {
    setPdfBytes(null); setThumbs([]); setMarked(new Set()); setStatus(''); setResultBytes(null);
  }

  if (!thumbs.length) {
    return (
      <div>
        {session.status === 'active' && session.document && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Continue with {session.document.name}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {session.document.pageCount ? `${session.document.pageCount} pages · ` : ''}already in this session — no need to re-upload.
              </div>
            </div>
            <button onClick={continueWithSessionDocument} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
              Continue
            </button>
          </div>
        )}
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
      {!resultBytes ? (
        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={applyRemoval} disabled={loading || marked.size === 0} className="px-6 py-3 rounded-xl font-semibold text-white text-sm disabled:opacity-50" style={{ background: '#D95F2B' }}>
            {loading ? 'Processing…' : 'Remove Pages'}
          </button>
          <button onClick={reset} className="px-5 py-3 rounded-xl font-semibold text-sm" style={{ background: '#f0f0ec', color: '#555', border: '1px solid #e2dcc9' }}>
            Start over
          </button>
        </div>
      ) : (
        <ContinueWorkingPanel toolSlug="remove-pdf-pages" documentName={fileName} onDownload={downloadResult} downloading={loading} />
      )}
      {status && <p className={`mt-3 text-sm font-medium ${status.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>{status}</p>}
    </div>
  );
}
