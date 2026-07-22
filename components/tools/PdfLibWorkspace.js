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
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';
import WorkspaceStatusPanel from '@/components/workspace/WorkspaceStatusPanel';

// Which of this shared component's modes participate in the Document
// Session, and how. merge/rotate/extract are full round-trip (pull the
// session PDF, push their result back). split is pull-only — it fans one
// document into many, so there's no single result to feed back (terminal
// for v1, per the compatibility rules). image-to-pdf (jpg-to-pdf/png-to-pdf)
// isn't part of this milestone's tool list and is left untouched.
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
  const { session, startSession, updateDocument, getDocumentAsFile, restoreOriginal } = useDocumentSession();
  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [rotation, setRotation] = useState(90);
  const [range, setRange] = useState('');
  const [pageCount, setPageCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resultBytes, setResultBytes] = useState(null);
  const [usingSessionDoc, setUsingSessionDoc] = useState(false);

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

  async function handleRestoreOriginal() {
    const f = await restoreOriginal();
    if (f) await handleFiles([f], { fromSession: true });
  }

  function removeFile(i) {
    setFiles(files.filter((_, idx) => idx !== i));
    setResultBytes(null);
  }

  function clearAll() {
    setFiles([]);
    setStatus('');
    setError('');
    setPageCount(null);
    setRange('');
    setResultBytes(null);
    setUsingSessionDoc(false);
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
      {PULL_MODES.has(mode) && <WorkspaceStatusPanel onRestoreOriginal={handleRestoreOriginal} />}

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

      <UploadBox accept={accept} multiple={multiple} onFiles={handleFiles} />

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
        <div className="mt-4">
          <label className="text-sm font-medium block mb-2">Rotate by</label>
          <div className="flex gap-2">
            {[90, 180, 270].map((d) => (
              <button
                key={d}
                onClick={() => { setRotation(d); setResultBytes(null); }}
                className={`btn-ghost-sm ${rotation === d ? 'active-choice' : ''}`}
              >
                {d}°
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
          <button className="btn btn-primary" disabled={files.length === 0 || busy} onClick={handleRun}>
            {busy ? 'Working…' : actionLabel(mode)}
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
