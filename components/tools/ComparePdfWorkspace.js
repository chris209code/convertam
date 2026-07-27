'use client';

import { useState, useMemo } from 'react';
import Script from 'next/script';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import { extractPageLines, buildDiff, changeEntries, MAX_COMPARE_PAGES } from '@/lib/pdfCompare/textDiff';
import { renderPageImages, pageVisualDiff } from '@/lib/pdfCompare/renderPages';
import { generateFinancialReportPdf } from '@/components/tools/financial-shared/FinancialReport';
import { DiffSummaryView, SideBySideView, OverlayView, PageByPageView } from '@/components/tools/compare-pdf/CompareViews';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const TABS = [
  { id: 'summary', label: 'Difference Summary' },
  { id: 'side-by-side', label: 'Side by Side' },
  { id: 'page-by-page', label: 'Page by Page' },
  { id: 'overlay', label: 'Overlay' },
];

function truncate(s) { return s.length > 300 ? s.slice(0, 297) + '…' : s; }
function safeName(n) { return (n || 'file').replace(/\.pdf$/i, '').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40); }

export default function ComparePdfWorkspace() {
  const { session, startSession, getDocumentAsFile } = useDocumentSession();
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [usingSessionDoc, setUsingSessionDoc] = useState(false);

  const [ignoreWhitespace, setIgnoreWhitespace] = useState(true);
  const [ignorePageNumbers, setIgnorePageNumbers] = useState(true);
  const [compareVisualLayout, setCompareVisualLayout] = useState(false);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const [activeView, setActiveView] = useState('summary');
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [blend, setBlend] = useState(50);
  const [showHeat, setShowHeat] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);

  function setOriginal(f, fromSession = false) {
    setFileA(f);
    setUsingSessionDoc(fromSession);
    setResult(null);
    setError('');
    if (f && !fromSession) {
      const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
      if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
        startSession(f, { toolSlug: 'compare-pdf' });
      }
    }
  }

  function setRevised(f) {
    setFileB(f);
    setResult(null);
    setError('');
  }

  async function runCompare() {
    if (!fileA || !fileB) return;
    if (!window.pdfjsLib) { setError('Still loading — please wait a moment and try again.'); return; }
    if (fileA.size > MAX_FILE_SIZE || fileB.size > MAX_FILE_SIZE) { setError('Each file must be under 50MB.'); return; }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const [bufA, bufB] = await Promise.all([fileA.arrayBuffer(), fileB.arrayBuffer()]);
      const [pdfA, pdfB] = await Promise.all([
        window.pdfjsLib.getDocument({ data: bufA }).promise,
        window.pdfjsLib.getDocument({ data: bufB }).promise,
      ]);

      setProgress('Extracting text…');
      const [extractedA, extractedB] = await Promise.all([extractPageLines(pdfA), extractPageLines(pdfB)]);

      if (extractedA.pages.every((p) => p.length === 0) && extractedB.pages.every((p) => p.length === 0)) {
        setError('Neither PDF has extractable text — they may be scanned images. Try OCR PDF first, then compare the results.');
        setBusy(false);
        setProgress('');
        return;
      }

      setProgress('Rendering pages…');
      const [imagesA, imagesB] = await Promise.all([
        renderPageImages(pdfA, MAX_COMPARE_PAGES),
        renderPageImages(pdfB, MAX_COMPARE_PAGES),
      ]);

      setProgress('Comparing…');
      const { entries, summary } = buildDiff(extractedA.pages, extractedB.pages, { ignoreWhitespace, ignorePageNumbers });

      let visualDiffs = null;
      if (compareVisualLayout) {
        setProgress('Checking visual layout…');
        const pairCount = Math.min(imagesA.length, imagesB.length);
        visualDiffs = [];
        for (let i = 0; i < pairCount; i++) {
          visualDiffs.push(await pageVisualDiff(imagesA[i], imagesB[i]));
        }
      }

      setResult({
        imagesA, imagesB, entries, summary,
        changes: changeEntries(entries),
        visualDiffs,
        truncated: extractedA.truncated || extractedB.truncated,
      });
      setActiveView('summary');
      setCurrentChangeIndex(0);
      setPageIndex(0);
    } catch (err) {
      console.error(err);
      setError('Something went wrong comparing these files. Please check both files and try again.');
    } finally {
      setBusy(false);
      setProgress('');
    }
  }

  function reset() {
    setFileA(null);
    setFileB(null);
    setUsingSessionDoc(false);
    setResult(null);
    setError('');
    setActiveView('summary');
  }

  const { pagesAffectedA, pagesAffectedB } = useMemo(() => {
    const a = new Set(), b = new Set();
    if (result) {
      result.entries.forEach((e) => {
        if (e.type === 'equal') return;
        if (e.pageA != null) a.add(e.pageA);
        if (e.pageB != null) b.add(e.pageB);
      });
    }
    return { pagesAffectedA: a, pagesAffectedB: b };
  }, [result]);

  function jumpToChange(idx) {
    if (!result) return;
    const entry = result.changes[idx];
    setCurrentChangeIndex(idx);
    setPageIndex(entry.pageB ?? entry.pageA ?? 0);
    setActiveView('page-by-page');
  }
  function stepChange(delta) {
    if (!result || result.changes.length === 0) return;
    setCurrentChangeIndex((i) => Math.min(result.changes.length - 1, Math.max(0, i + delta)));
  }

  async function downloadReport() {
    if (!result) return;
    setReportBusy(true);
    setError('');
    try {
      const rows = result.changes.map((e) => [
        e.pageA != null ? `p.${e.pageA + 1}` : '—',
        e.pageB != null ? `p.${e.pageB + 1}` : '—',
        e.type === 'added' ? 'Added' : e.type === 'removed' ? 'Removed' : 'Modified',
        truncate(e.textA || ''),
        truncate(e.textB || ''),
      ]);
      await generateFinancialReportPdf({
        toolName: 'Compare Documents',
        fileName: `compare-report-${safeName(fileA?.name)}-vs-${safeName(fileB?.name)}.pdf`,
        hero: { label: 'Detected Differences', value: String(result.changes.length), sub: `${result.summary.pagesAffectedCount} page(s) affected` },
        statCards: [
          { label: 'Added', value: String(result.summary.added) },
          { label: 'Removed', value: String(result.summary.removed) },
          { label: 'Modified', value: String(result.summary.modified) },
          { label: 'Pages compared', value: `${result.summary.totalPagesA} → ${result.summary.totalPagesB}` },
        ],
        tables: [
          { title: 'Compared Files', head: ['File', 'Role', 'Pages'], rows: [[fileA?.name || 'Original', 'Original', String(result.summary.totalPagesA)], [fileB?.name || 'Revised', 'Revised', String(result.summary.totalPagesB)]] },
          { title: 'Detected Changes', head: ['Orig. page', 'Rev. page', 'Type', 'Original text', 'Revised text'], rows },
        ],
        privacyNote: 'This report lists detected textual differences only. It does not indicate the legal or semantic significance of any change, and should be reviewed by a qualified professional where accuracy matters. Both documents were compared entirely in your browser and were not uploaded to a server.',
      });
    } catch (err) {
      console.error(err);
      setError('Could not generate the report. Please try again.');
    } finally {
      setReportBusy(false);
    }
  }

  const pageEntries = result ? result.entries.filter((e) => e.type !== 'equal' && (e.pageA === pageIndex || e.pageB === pageIndex)) : [];

  return (
    <div className="panel">
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />

      {!result && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Original version</p>
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 10 }}>The earlier document</p>
              {session.status === 'active' && session.document && !usingSessionDoc ? (
                <button
                  onClick={() => setOriginal(getDocumentAsFile(), true)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Use {session.document.name}
                </button>
              ) : (
                <input type="file" accept="application/pdf" onChange={(e) => setOriginal(e.target.files?.[0] || null)} />
              )}
              {fileA && (
                <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 8 }}>
                  ✓ {fileA.name}{usingSessionDoc ? ' (from session)' : ''}
                  {' · '}
                  <button onClick={() => setOriginal(null)} style={{ background: 'none', border: 'none', color: '#2563EB', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}>change</button>
                </p>
              )}
            </div>
            <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: 24, textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Revised version</p>
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: 10 }}>The newer document</p>
              <input type="file" accept="application/pdf" onChange={(e) => setRevised(e.target.files?.[0] || null)} />
              {fileB && <p style={{ fontSize: '0.75rem', color: '#059669', marginTop: 8 }}>✓ {fileB.name}</p>}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 18, fontSize: '0.8rem', color: '#475569' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={ignoreWhitespace} onChange={(e) => setIgnoreWhitespace(e.target.checked)} /> Ignore insignificant whitespace
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={ignorePageNumbers} onChange={(e) => setIgnorePageNumbers(e.target.checked)} /> Ignore page-number changes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={compareVisualLayout} onChange={(e) => setCompareVisualLayout(e.target.checked)} /> Also compare visual layout
            </label>
          </div>

          <button onClick={runCompare} disabled={!fileA || !fileB || busy} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: (!fileA || !fileB || busy) ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: (!fileA || !fileB) ? 'default' : 'pointer' }}>
            {busy ? (progress || 'Comparing…') : 'Compare PDFs'}
          </button>
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
          <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: 12 }}>Compares text content page by page and highlights what was added, removed, or changed. PDFs over {MAX_COMPARE_PAGES} pages are compared up to that limit.</p>
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveView(t.id)}
                  style={{
                    padding: '7px 13px', borderRadius: 8, border: activeView === t.id ? '1px solid #2563EB' : '1px solid #E2E8F0',
                    background: activeView === t.id ? '#EFF6FF' : 'white', color: activeView === t.id ? '#2563EB' : '#475569',
                    fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {activeView !== 'summary' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button onClick={() => setZoom((z) => Math.max(50, z - 10))} style={{ ...zoomBtn }}>−</button>
                  <span style={{ fontSize: '0.75rem', color: '#64748B', width: 40, textAlign: 'center' }}>{zoom}%</span>
                  <button onClick={() => setZoom((z) => Math.min(200, z + 10))} style={{ ...zoomBtn }}>+</button>
                </div>
              )}
              <button onClick={reset} style={{ padding: '7px 13px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Compare Different Files</button>
            </div>
          </div>

          {result.truncated && (
            <p style={{ fontSize: '0.72rem', color: '#B45309', marginBottom: 10 }}>One or both documents exceed {MAX_COMPARE_PAGES} pages — only the first {MAX_COMPARE_PAGES} pages of each were compared.</p>
          )}

          {activeView === 'summary' && (
            <DiffSummaryView
              summary={result.summary}
              changes={result.changes}
              currentChangeIndex={currentChangeIndex}
              onJumpToChange={jumpToChange}
              onPrev={() => stepChange(-1)}
              onNext={() => stepChange(1)}
              onDownloadReport={downloadReport}
              reportBusy={reportBusy}
            />
          )}

          {activeView === 'side-by-side' && (
            <SideBySideView
              imagesA={result.imagesA} imagesB={result.imagesB}
              fileNameA={fileA?.name || 'Original'} fileNameB={fileB?.name || 'Revised'}
              pagesAffectedA={pagesAffectedA} pagesAffectedB={pagesAffectedB}
              zoom={zoom}
            />
          )}

          {activeView === 'page-by-page' && (
            <PageByPageView
              imagesA={result.imagesA} imagesB={result.imagesB}
              pageIndex={pageIndex} onPageChange={setPageIndex}
              pageEntries={pageEntries} zoom={zoom}
            />
          )}

          {activeView === 'overlay' && (
            <OverlayView
              imagesA={result.imagesA} imagesB={result.imagesB}
              pageIndex={pageIndex} onPageChange={setPageIndex}
              blend={blend} onBlendChange={setBlend}
              showHeat={showHeat} onToggleHeat={setShowHeat}
              visualDiff={result.visualDiffs ? result.visualDiffs[pageIndex] : null}
              visualLayoutEnabled={!!result.visualDiffs}
              zoom={zoom}
            />
          )}

          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
        </div>
      )}

      <p className="privacy-note">Both documents are processed entirely in your browser — never uploaded to a server.</p>
    </div>
  );
}

const zoomBtn = { width: 26, height: 26, borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.9rem', lineHeight: 1, fontWeight: 700, color: '#475569' };
