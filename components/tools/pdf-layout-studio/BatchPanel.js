'use client';

import { useState } from 'react';

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Applies the SAME `objects` layout already built on the main document to
// a batch of additional PDFs at once — the natural "stamp this branded
// template across a folder of documents" workflow for a layout tool.
// Delegates the actual per-file work to `onProcessFile` (supplied by
// PdfLayoutStudioWorkspace.js, which runs pdfExport.js's applyLayoutToPdf —
// the exact same export pipeline the single-document Apply Layout button
// uses), so there's exactly one implementation of "how a layout gets
// applied to a PDF," not a second copy that could quietly drift from it.
// Rule objects (Page Numbers/Letterhead/Watermark/Footer/QR Code) resolve their own
// target pages against each batch file's own page count, so "All pages"/
// "Odd pages"/etc. adapt correctly even when a batch file has a different
// page count than the main document; single-page objects (text/image/
// shape/stamp) apply to the same page INDEX in each batch file and are
// silently skipped on files too short to have that page — see
// pdfExport.js's per-object `pagesInfo[o.page]` guard.
export default function BatchPanel({ hasLayout, onProcessFile }) {
  const [queue, setQueue] = useState([]); // [{ file, status: 'pending'|'processing'|'done'|'error', bytes, error }]
  const [busy, setBusy] = useState(false);

  function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => f.type === 'application/pdf');
    if (!files.length) return;
    setQueue((q) => [...q, ...files.map((file) => ({ file, status: 'pending' }))]);
  }

  function removeAt(index) {
    setQueue((q) => q.filter((_, i) => i !== index));
  }

  async function processAll() {
    setBusy(true);
    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'done') continue;
      setQueue((q) => q.map((item, idx) => (idx === i ? { ...item, status: 'processing' } : item)));
      try {
        const { bytes } = await onProcessFile(queue[i].file);
        setQueue((q) => q.map((item, idx) => (idx === i ? { ...item, status: 'done', bytes } : item)));
      } catch (err) {
        console.error(err);
        setQueue((q) => q.map((item, idx) => (idx === i ? { ...item, status: 'error', error: 'Could not process this file.' } : item)));
      }
    }
    setBusy(false);
  }

  async function downloadAllAsZip() {
    const done = queue.filter((item) => item.status === 'done' && item.bytes);
    if (!done.length) return;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    done.forEach((item) => {
      zip.file(item.file.name.replace(/\.pdf$/i, '') + '-layout.pdf', item.bytes);
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    downloadBlob(blob, 'convertam-batch-layout.zip');
  }

  function downloadOne(item) {
    if (!item.bytes) return;
    downloadBlob(new Blob([item.bytes], { type: 'application/pdf' }), item.file.name.replace(/\.pdf$/i, '') + '-layout.pdf');
  }

  const doneCount = queue.filter((i) => i.status === 'done').length;
  const errorCount = queue.filter((i) => i.status === 'error').length;
  const remainingCount = queue.filter((i) => i.status !== 'done').length;

  return (
    <div style={{ marginTop: 16, border: '1px solid #E2E8F0', borderRadius: 12, padding: 14 }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Batch: apply this layout to more PDFs</p>
      <p style={{ fontSize: '0.74rem', color: '#64748B', margin: '0 0 10px' }}>
        Upload other PDFs to stamp with the exact same elements you just built — same letterhead, watermark, stamps, page numbers, and QR codes.
      </p>

      <label className="dropzone block cursor-pointer" style={{ padding: '14px', textAlign: 'center' }}>
        <input type="file" accept="application/pdf" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        <span style={{ fontSize: '0.78rem', color: '#334155' }}>Click to add PDFs, or drag them here</span>
      </label>
      {!hasLayout && (
        <p style={{ fontSize: '0.7rem', color: '#B45309', margin: '6px 0 0' }}>
          You can queue files now, but add at least one element above (letterhead, watermark, stamp, etc.) before processing — otherwise there&apos;s nothing to stamp them with.
        </p>
      )}

      {queue.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
          {queue.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white' }}>
              <span style={{ flex: 1, fontSize: '0.76rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.file.name}</span>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700,
                color: item.status === 'done' ? '#15803D' : item.status === 'error' ? '#B91C1C' : item.status === 'processing' ? '#2563EB' : '#94A3B8',
              }}>
                {{ pending: 'Pending', processing: 'Processing…', done: 'Done', error: 'Failed' }[item.status]}
              </span>
              {item.status === 'done' && (
                <button onClick={() => downloadOne(item)} style={{ background: 'none', border: 'none', color: '#2563EB', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit', padding: 0 }}>Download</button>
              )}
              {item.status !== 'processing' && (
                <button onClick={() => removeAt(i)} title="Remove" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {queue.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            onClick={processAll}
            disabled={busy || remainingCount === 0 || !hasLayout}
            title={!hasLayout ? 'Add at least one element to the layout above first' : undefined}
            style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: (remainingCount === 0 || !hasLayout) ? 'default' : 'pointer', fontFamily: 'inherit', opacity: busy || remainingCount === 0 || !hasLayout ? 0.7 : 1 }}
          >
            {busy ? 'Processing…' : `Process ${remainingCount} file${remainingCount !== 1 ? 's' : ''}`}
          </button>
          {doneCount > 0 && (
            <button onClick={downloadAllAsZip} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Download all as ZIP ({doneCount})
            </button>
          )}
        </div>
      )}
      {errorCount > 0 && <p style={{ fontSize: '0.7rem', color: '#B91C1C', marginTop: 6 }}>{errorCount} file{errorCount !== 1 ? 's' : ''} failed to process.</p>}
    </div>
  );
}
