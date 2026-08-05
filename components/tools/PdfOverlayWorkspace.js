'use client';

import { useState } from 'react';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';

export default function PdfOverlayWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [baseFile, setBaseFile] = useState(null);
  const [overlayFile, setOverlayFile] = useState(null);
  const [opacity, setOpacity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultBytes, setResultBytes] = useState(null);
  const [usingSessionDoc, setUsingSessionDoc] = useState(false);

  // Per the workspace's compatibility rule for multi-input tools: the active
  // session document, if any, prefills the base slot automatically — only
  // the additional (overlay) document needs a manual upload.
  useAutoContinueSession('pdf-overlay', () => setBase(getDocumentAsFile(), true));

  function setBase(f, fromSession = false) {
    setBaseFile(f);
    setUsingSessionDoc(fromSession);
    setResultBytes(null);
    if (f && !fromSession) {
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        startSession(f, { toolSlug: 'pdf-overlay' });
      }
    }
  }
  async function handleApply() {
    if (!baseFile || !overlayFile) return;
    setBusy(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');

      const baseBytes = await baseFile.arrayBuffer();
      const overlayBytes = await overlayFile.arrayBuffer();

      const baseDoc = await PDFDocument.load(baseBytes);
      const overlaySourceDoc = await PDFDocument.load(overlayBytes);

      const [overlayPage] = await baseDoc.embedPdf(overlaySourceDoc, [0]);

      const pages = baseDoc.getPages();
      pages.forEach((page) => {
        const { width, height } = page.getSize();
        const scale = Math.min(width / overlayPage.width, height / overlayPage.height);
        page.drawPage(overlayPage, {
          x: (width - overlayPage.width * scale) / 2,
          y: (height - overlayPage.height * scale) / 2,
          xScale: scale,
          yScale: scale,
          opacity,
        });
      });

      const outBytes = await baseDoc.save();
      setResultBytes(outBytes);
      await updateDocument(outBytes, { toolSlug: 'pdf-overlay', label: 'Overlay applied' });
    } catch (err) {
      console.error(err);
      setError('Something went wrong combining these PDFs. Please check both files and try again.');
    } finally {
      setBusy(false);
    }
  }

  // Downloading exports the current document but does not end the
  // workspace — see WorkspaceSidebar for Close Workspace.
  function downloadResult() {
    if (!resultBytes || !baseFile) return;
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (baseFile.name || 'document').replace(/\.pdf$/i, '') + '-overlaid.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="panel">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Base document</p>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 10 }}>Every page gets the overlay stamped on it</p>
          {session.status === 'active' && session.document && !usingSessionDoc ? (
            <button
              onClick={() => setBase(getDocumentAsFile(), true)}
              style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Use {session.document.name}
            </button>
          ) : (
            <input type="file" accept="application/pdf" onChange={(e) => setBase(e.target.files?.[0] || null)} />
          )}
          {baseFile && (
            <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 8 }}>
              ✓ {baseFile.name}{usingSessionDoc ? ' (from session)' : ''}
              {' · '}
              <button onClick={() => setBase(null)} style={{ background: 'none', border: 'none', color: '#2563EB', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>change</button>
            </p>
          )}
        </div>
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Overlay (e.g. letterhead)</p>
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 10 }}>Only its first page is used</p>
          <input type="file" accept="application/pdf" onChange={(e) => { setOverlayFile(e.target.files?.[0] || null); setResultBytes(null); }} />
          {overlayFile && <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 8 }}>✓ {overlayFile.name}</p>}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Overlay opacity — {Math.round(opacity * 100)}%</label>
        <input type="range" min="0.1" max="1" step="0.05" value={opacity} onChange={(e) => { setOpacity(Number(e.target.value)); setResultBytes(null); }} style={{ width: '100%' }} />
      </div>

      {!resultBytes ? (
        <button onClick={handleApply} disabled={!baseFile || !overlayFile || busy} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: (!baseFile || !overlayFile || busy) ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: (!baseFile || !overlayFile) ? 'default' : 'pointer' }}>
          {busy ? 'Combining PDFs…' : 'Apply Overlay'}
        </button>
      ) : (
        <ContinueWorkingPanel toolSlug="pdf-overlay" documentName={baseFile?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
      )}
      {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
      <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 12 }}>Best for stamping a letterhead, background design, or template onto every page of a document that doesn't already have one.</p>

      <p className="privacy-note">Both documents are processed entirely in your browser — never uploaded to a server.</p>
    </div>
  );
}
