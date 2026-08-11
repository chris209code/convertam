'use client';

import { useState, useEffect } from 'react';
import JSZip from 'jszip';
import UploadBox from '@/components/UploadBox';
import {
  mergePdfs,
  splitPdf,
  rotatePdf,
  extractPages,
  imagesToPdf,
  getPdfPageCount,
} from '@/lib/pdf-tools';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

async function loadPdfjs() {
  let pdfjs = window.pdfjsLib;
  if (pdfjs) return pdfjs;
  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="pdf.min.js"]');
    if (existing) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
  pdfjs = window.pdfjsLib;
  if (pdfjs) {
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  return pdfjs;
}

// Which of this shared component's modes participate in the Document
// Session, and how. merge/rotate/extract are full round-trip (pull the
// session PDF, push their result back). split is pull-only — it fans one
// document into many, so there's no single result to feed back (terminal
// for v1, per the compatibility rules). image-to-pdf (now the merged
// pdf-to-jpg tool) isn't part of this milestone's tool list and is left
// untouched.
const SESSION_TOOL_SLUG = { merge: 'merge-pdf', split: 'split-pdf', rotate: 'rotate-pdf', extract: 'extract-pdf-pages' };
const PULL_MODES = new Set(['merge', 'split', 'rotate', 'extract']);
const PUSH_MODES = new Set(['merge', 'rotate', 'extract']);

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

function actionLabel(mode) {
  return (
    {
      merge: 'Merge PDFs',
      split: 'Split PDF',
      rotate: 'Rotate PDF',
      extract: 'Extract pages',
      'image-to-pdf': 'Convert to PDF',
    }[mode] || 'Convert'
  );
}

export default function PdfLibWorkspace({ mode, accept: acceptProp }) {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState(0);
  const [range, setRange] = useState('');
  const [pageCount, setPageCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resultBytes, setResultBytes] = useState(null);
  const [usingSessionDoc, setUsingSessionDoc] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const multiple = mode === 'merge' || mode === 'image-to-pdf';
  const accept = acceptProp || (mode === 'image-to-pdf' ? 'image/*' : 'application/pdf');
  const sessionToolSlug = SESSION_TOOL_SLUG[mode];

  async function handleFiles(newFiles, { fromSession = false } = {}) {
    setError('');
    setStatus('');
    setResultBytes(null);
    const list = multiple ? [...files, ...newFiles] : newFiles.slice(0, 1);
    setFiles(list);
    if (!multiple && list[0] && mode !== 'image-to-pdf') {
      try {
        setPageCount(await getPdfPageCount(list[0]));
      } catch {
        setPageCount(null);
      }
    }
    // Single-file modes (rotate/extract/split) start or continue a session
    // the same way every other pilot tool does. Merge is multi-input, so it
    // participates differently — see pullSessionAsFirstFile below.
    if (PULL_MODES.has(mode) && !multiple && list[0]) {
      if (fromSession) {
        setUsingSessionDoc(true);
      } else {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          startSession(list[0], { toolSlug: sessionToolSlug });
        }
      }
    }
    if (mode === 'rotate' && list[0]) {
      setPreviewUrl(null);
      setPreviewLoading(true);
      try {
        const pdfjs = await loadPdfjs();
        const buf = await list[0].arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.5 });
        const c = document.createElement('canvas');
        c.width = viewport.width;
        c.height = viewport.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport }).promise;
        setPreviewUrl(c.toDataURL());
      } catch (err) {
        console.error('Preview error:', err);
      } finally {
        setPreviewLoading(false);
      }
    }
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    await handleFiles([f], { fromSession: true });
  }

  // Merge is multi-input, so per the workspace's compatibility rule it uses
  // the active session document as the first file and only asks for the
  // rest manually — it doesn't itself start/replace the session (there's no
  // single "the document" until the merge actually runs).
  function pullSessionAsFirstFile() {
    const f = getDocumentAsFile();
    if (!f) return;
    setFiles((prev) => [f, ...prev]);
    setUsingSessionDoc(true);
    setResultBytes(null);
  }
  // merge is multi-input, so a handoff there prefills the base slot
  // (pullSessionAsFirstFile) rather than fully loading like the single-file
  // modes — same distinction the manual "Continue" button already makes.
  useAutoContinueSession(sessionToolSlug, mode === 'merge' ? pullSessionAsFirstFile : continueWithSessionDocument);

  function removeFile(i) {
    setFiles(files.filter((_, idx) => idx !== i));
    setResultBytes(null);
    if (i === 0) setPreviewUrl(null);
  }

  function clearAll() {
    setFiles([]);
    setStatus('');
    setError('');
    setPageCount(null);
    setRange('');
    setResultBytes(null);
    setUsingSessionDoc(false);
    setPreviewUrl(null);
  }

  async function handleRun() {
    if (files.length === 0) return;
    setBusy(true);
    setError('');
    setStatus('Working on it…');
    try {
      if (mode === 'merge') {
        const bytes = await mergePdfs(files);
        setResultBytes(bytes);
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (session.status === 'active') {
          await updateDocument(bytes, { toolSlug: 'merge-pdf', label: 'Merged' });
        } else if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          await startSession(new File([bytes], 'convertam-merged.pdf', { type: 'application/pdf' }), { toolSlug: 'merge-pdf' });
        }
        setStatus('Merged — choose what to do next.');
      } else if (mode === 'image-to-pdf') {
        const bytes = await imagesToPdf(files);
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'convertam-images.pdf');
        setStatus('Done — check your downloads.');
      } else if (mode === 'rotate') {
        const bytes = await rotatePdf(files[0], rotation);
        setResultBytes(bytes);
        await updateDocument(bytes, { toolSlug: 'rotate-pdf', label: `Rotated ${rotation}°` });
        setStatus('Rotated — choose what to do next.');
      } else if (mode === 'extract') {
        if (!range.trim()) {
          setError('Tell us which pages to extract, e.g. 1-3,5');
          setBusy(false);
          setStatus('');
          return;
        }
        const bytes = await extractPages(files[0], range, pageCount || 9999);
        setResultBytes(bytes);
        await updateDocument(bytes, { toolSlug: 'extract-pdf-pages', label: 'Pages extracted' });
        setStatus('Extracted — choose what to do next.');
      } else if (mode === 'split') {
        const parts = await splitPdf(files[0]);
        if (parts.length === 1) {
          downloadBlob(new Blob([parts[0].bytes], { type: 'application/pdf' }), parts[0].name);
        } else {
          const zip = new JSZip();
          parts.forEach((p) => zip.file(p.name, p.bytes));
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          downloadBlob(zipBlob, 'convertam-split-pages.zip');
        }
        // Split fans one document into many — terminal for v1, no session push.
        setStatus('Done — check your downloads.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not process that file. Make sure it's a valid, non-password-protected PDF.");
      setStatus('');
    } finally {
      setBusy(false);
    }
  }

  // Downloading exports the current document but does not end the
  // workspace — see WorkspaceSidebar for Close Workspace.
  function downloadResult() {
    if (!resultBytes) return;
    const name = mode === 'merge' ? 'convertam-merged.pdf' : mode === 'rotate' ? 'convertam-rotated.pdf' : 'convertam-extracted.pdf';
    downloadBlob(new Blob([resultBytes], { type: 'application/pdf' }), name);
  }

  return (
    <div className="panel">
      {PULL_MODES.has(mode) && mode !== 'merge' && files.length === 0 && session.status === 'active' && session.document && (
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

      {mode === 'merge' && files.length === 0 && session.status === 'active' && session.document && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.4rem' }} aria-hidden="true">📄</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Use {session.document.name} as the first file</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Already in this session — just add the file(s) to merge it with.</div>
          </div>
          <button onClick={pullSessionAsFirstFile} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            Use it
          </button>
        </div>
      )}

      <UploadBox accept={accept} multiple={multiple} onFiles={handleFiles} compact={!multiple && files.length > 0} />

      {files.length > 0 && (
        <div className="file-list">
          {files.map((f, i) => (
            <div key={`${f.name}-${i}`} className="file-row">
              <span className="badge">{(f.name.split('.').pop() || 'FILE').toUpperCase()}</span>
              <span className="name">{f.name}{i === 0 && usingSessionDoc ? ' (from session)' : ''}</span>
              <button className="remove" onClick={() => removeFile(i)} aria-label="Remove file">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {mode === 'rotate' && files.length > 0 && (
        <div
          style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: 300, padding: '28px 16px', marginTop: 14, borderRadius: 12,
            background: '#F1F5F9', overflow: 'visible',
          }}
        >
          {previewLoading && <p className="text-sm text-ink-soft">Loading preview…</p>}
          {!previewLoading && previewUrl && (
            <img
              src={previewUrl}
              alt="Document preview"
              style={{
                maxWidth: '85%', maxHeight: 260, width: 'auto', height: 'auto',
                borderRadius: 4, boxShadow: '0 4px 16px rgba(15,23,42,0.18)',
                transform: `rotate(${rotation}deg)`, transition: 'transform 0.25s ease',
              }}
            />
          )}
          {!previewLoading && !previewUrl && <p className="text-sm text-ink-soft">Preview unavailable — rotation will still apply on download.</p>}
        </div>
      )}

      {mode === 'rotate' && files.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium block mb-2">Rotate by</label>
          <div className="flex gap-2">
            {[0, 90, 180, 270].map((d) => (
              <button
                key={d}
                onClick={() => { setRotation(d); setResultBytes(null); }}
                className={`btn-ghost-sm ${rotation === d ? 'active-choice' : ''}`}
              >
                {d === 0 ? 'None' : `${d}°`}
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === 'extract' && files.length > 0 && (
        <div className="mt-4">
          <label className="text-sm font-medium block mb-2">
            Which pages?{pageCount ? ` (this file has ${pageCount} pages)` : ''}
          </label>
          <input
            type="text"
            value={range}
            onChange={(e) => { setRange(e.target.value); setResultBytes(null); }}
            placeholder="e.g. 1-3,5,8-9"
            className="range-input"
          />
        </div>
      )}

      {(!PUSH_MODES.has(mode) || !resultBytes) ? (
        <div className="actions">
          <button className="btn btn-primary" disabled={files.length === 0 || busy || (mode === 'rotate' && rotation === 0)} onClick={handleRun}>
            {busy ? 'Working…' : mode === 'rotate' && rotation === 0 ? 'Choose a rotation' : actionLabel(mode)}
          </button>
          {files.length > 0 && (
            <button className="btn btn-ghost" onClick={clearAll}>
              Clear
            </button>
          )}
        </div>
      ) : (
        <ContinueWorkingPanel toolSlug={sessionToolSlug} documentName={files[0]?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
      )}

      {status && <div className="status success">{status}</div>}
      {error && <div className="status error">{error}</div>}
      <p className="privacy-note">Processed entirely in your browser — your file is never uploaded anywhere.</p>
    </div>
  );
}
