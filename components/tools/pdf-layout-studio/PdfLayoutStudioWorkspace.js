'use client';

import { useEffect, useRef, useState } from 'react';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';
import { useObjectHistory } from '@/components/shared/useObjectHistory';
import { useKeyboardShortcuts } from '@/components/shared/useKeyboardShortcuts';
import ThumbnailRail from '@/components/shared/ThumbnailRail';
import SignaturePad from '@/components/shared/SignaturePad';
import { warmMeasurementFonts } from '@/components/shared/fontResolver';
import { MAX_FILE_BYTES, RENDER_SCALE, DATE_FORMATS } from './constants';
import { createObject } from './objectTypes';
import { extractTextBoxes } from './letterheadDetection';
import { generateQrDataUrl } from '@/lib/invoice-studio/qrGenerate';
import { applyLayoutToPdf, extractPageInfo } from './pdfExport';
import ElementsPanel from './ElementsPanel';
import PropertiesPanel from './PropertiesPanel';
import Toolbar from './Toolbar';
import Stage from './Stage';
import BatchPanel from './BatchPanel';

const DATE_FORMAT_STORAGE_KEY = 'convertam_pdf_layout_studio_date_format';

// Re-encodes any uploaded image file to a PNG data URL through a canvas, so
// export can always call pdfDoc.embedPng() unconditionally.
function fileToPngDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/png'), naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

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

// Orchestrator for PDF Layout Studio (formerly the two-file "PDF Overlay"
// stamp tool — see the tools-config.js entry for the branding note). Export
// draws real vector pdf-lib operations straight onto the ORIGINAL PDF pages
// (drawText/drawImage/drawRectangle) rather than rasterizing the page like
// Annotate PDF does — this tool's whole value proposition is professional,
// print-ready output, so keeping the original document's own content 100%
// untouched (still vector, still searchable where it already was) matters
// more here than it would for a markup tool.
export default function PdfLayoutStudioWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // [{ canvas, width, height }]
  const [pageOrder, setPageOrder] = useState([]); // display/navigation order only — see reorder note below
  const [activePage, setActivePage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultBytes, setResultBytes] = useState(null);
  const [letterheadWarning, setLetterheadWarning] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [dateFormatId, setDateFormatId] = useState(() => {
    if (typeof window === 'undefined') return DATE_FORMATS[0].id;
    return window.localStorage.getItem(DATE_FORMAT_STORAGE_KEY) || DATE_FORMATS[0].id;
  });

  const { objects, commit, undo: rawUndo, redo: rawRedo, canUndo, canRedo, reset: resetHistory, nextId, nextZ } = useObjectHistory();
  const pageObjects = objects.filter((o) => o.page === activePage);
  const selectedObject = objects.find((o) => o.id === selectedId) || null;

  // Mirrors `objects` for async continuations (QR regeneration) that read
  // the current object list AFTER an `await` — a plain closure over
  // `objects` would be stale by then, since other edits (or React's own
  // re-render) may have moved on in the meantime.
  const objectsRef = useRef(objects);
  useEffect(() => { objectsRef.current = objects; }, [objects]);

  function commitPageObjects(nextPageObjects) {
    const others = objects.filter((o) => o.page !== activePage);
    commit([...others, ...nextPageObjects]);
    setResultBytes(null);
  }

  function undo() { rawUndo(); setSelectedId(null); setEditingId(null); }
  function redo() { rawRedo(); setSelectedId(null); setEditingId(null); }

  function deleteObjectById(id) {
    const obj = objects.find((o) => o.id === id);
    if (!obj) return;
    commit(objects.filter((o) => o.id !== id));
    setResultBytes(null);
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  }
  function deleteSelected() {
    if (!selectedId) return;
    deleteObjectById(selectedId);
  }
  function duplicateSelected() {
    const obj = objects.find((o) => o.id === selectedId);
    if (!obj) return;
    const OFFSET = 16;
    const copy = { ...obj, id: nextId(), z: nextZ(), createdAt: Date.now(), updatedAt: Date.now(), x: obj.x + OFFSET, y: obj.y + OFFSET };
    commit([...objects, copy]);
    setResultBytes(null);
    setSelectedId(copy.id);
  }
  function nudgeSelected(dx, dy) {
    if (!selectedId) return;
    commit(objects.map((o) => (o.id === selectedId ? { ...o, x: o.x + dx, y: o.y + dy, updatedAt: Date.now() } : o)));
    setResultBytes(null);
  }
  function updateSelectedObject(patch) {
    if (!selectedId) return;
    commit(objects.map((o) => (o.id === selectedId ? { ...o, ...patch, updatedAt: Date.now() } : o)));
    setResultBytes(null);
  }
  function deselectAll() {
    setSelectedId(null);
    setEditingId(null);
  }

  // Layers panel wiring, ported from Annotate PDF's AnnotatePdfWorkspace.js
  // (toggleLockSelected/toggleHideSelected/reorderZ) and adapted to this
  // tool's single-selection object model — no multi-select Set here, just a
  // plain selectedId, so reorderZ moves exactly one object at a time.
  function toggleLockById(id) {
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, locked: !o.locked, updatedAt: Date.now() } : o)));
  }
  function toggleHideById(id) {
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, hidden: !o.hidden, updatedAt: Date.now() } : o)));
  }
  function renameObject(id, name) {
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, name, updatedAt: Date.now() } : o)));
  }
  function reorderZ(mode) {
    if (!selectedId) return;
    const sorted = [...pageObjects].sort((a, b) => a.z - b.z);
    let ordered;
    if (mode === 'front' || mode === 'back') {
      const others = sorted.filter((o) => o.id !== selectedId);
      const moving = sorted.filter((o) => o.id === selectedId);
      ordered = mode === 'front' ? [...others, ...moving] : [...moving, ...others];
    } else {
      ordered = [...sorted];
      if (mode === 'forward') {
        for (let i = ordered.length - 2; i >= 0; i--) {
          if (ordered[i].id === selectedId && ordered[i + 1].id !== selectedId) {
            [ordered[i], ordered[i + 1]] = [ordered[i + 1], ordered[i]];
          }
        }
      } else {
        for (let i = 1; i < ordered.length; i++) {
          if (ordered[i].id === selectedId && ordered[i - 1].id !== selectedId) {
            [ordered[i], ordered[i - 1]] = [ordered[i - 1], ordered[i]];
          }
        }
      }
    }
    commitPageObjects(ordered.map((o, i) => ({ ...o, z: i + 1 })));
  }

  // Centers a new element on the visible page — the click-in-sidebar,
  // drag-to-position flow this tool uses instead of Write on PDF's
  // click-on-canvas-to-place model (see ElementsPanel.js / Stage.js).
  function addText() {
    const page = pages[activePage];
    if (!page) return;
    const obj = createObject('text', { page: activePage, x: 0, y: 0, color: '#111827', nextId, nextZ });
    obj.x = (page.width - obj.w) / 2;
    obj.y = (page.height - obj.h) / 2;
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
    setEditingId(obj.id);
  }

  // Centers a raster object (image/logo/signature) on the visible page,
  // sized to fit within 40% of the page in either dimension — the
  // established "just inserted, now drag it where it belongs" placement
  // convention shared with Annotate PDF and Write on PDF.
  function placeCenteredRaster(type, { src, naturalWidth, naturalHeight, extra }) {
    const page = pages[activePage];
    if (!page) return;
    const maxW = page.width * 0.4;
    const maxH = page.height * 0.4;
    const scale = Math.min(1, maxW / naturalWidth, maxH / naturalHeight);
    const w = naturalWidth * scale;
    const h = naturalHeight * scale;
    const obj = createObject(type, {
      page: activePage, x: (page.width - w) / 2, y: (page.height - h) / 2, nextId, nextZ,
      src, w, h, naturalWidth, naturalHeight, ...extra,
    });
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  async function addImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const { dataUrl, naturalWidth, naturalHeight } = await fileToPngDataUrl(file);
      placeCenteredRaster('image', { src: dataUrl, naturalWidth, naturalHeight, extra: {} });
    } catch {
      setError('Could not insert that image. Please try a different file.');
    }
  }

  async function addLogoFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const { dataUrl, naturalWidth, naturalHeight } = await fileToPngDataUrl(file);
      placeCenteredRaster('image', { src: dataUrl, naturalWidth, naturalHeight, extra: { kind: 'logo' } });
    } catch {
      setError('Could not insert that logo. Please try a different file.');
    }
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  async function insertSignatureCapture(dataUrl, kind) {
    try {
      const img = await loadImageElement(dataUrl);
      placeCenteredRaster('signature', { src: dataUrl, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, extra: { kind } });
      setShowSignaturePad(false);
    } catch {
      setError('Could not place that signature. Please try again.');
    }
  }

  function addShape(shapeKind) {
    const page = pages[activePage];
    if (!page) return;
    const obj = createObject('shape', { page: activePage, x: 0, y: 0, shapeKind, nextId, nextZ });
    obj.x = (page.width - obj.w) / 2;
    obj.y = (page.height - obj.h) / 2;
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  function handleDateFormatChange(id) {
    setDateFormatId(id);
    try { window.localStorage.setItem(DATE_FORMAT_STORAGE_KEY, id); } catch { /* ignore */ }
  }

  function insertDateTime() {
    const page = pages[activePage];
    if (!page) return;
    const format = DATE_FORMATS.find((f) => f.id === dateFormatId) || DATE_FORMATS[0];
    const text = format.format(new Date());
    const obj = createObject('text', { page: activePage, x: 0, y: 0, color: '#111827', nextId, nextZ, text });
    obj.x = page.width * 0.62;
    obj.y = page.height * 0.9;
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  function addPageNumber() {
    const page = pages[activePage];
    if (!page) return;
    const obj = createObject('pageNumber', { page: activePage, x: 0, y: 0, color: '#111827', nextId, nextZ });
    obj.x = (page.width - obj.w) / 2;
    obj.y = page.height - obj.h - 24;
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  // Letterhead is placed flush near the top of the page by default (a
  // header graphic, not a centered decoration) — unlike Image/Logo's
  // page-centered placement. Its w/h here is the "reference" size that
  // Overlay uses verbatim and Scale-to-Fit/Smart Layout use as their band
  // size ceiling (see objectTypes/letterhead.js and handleApply below).
  function placeLetterhead(src, naturalWidth, naturalHeight) {
    const page = pages[activePage];
    if (!page) return;
    const maxW = page.width * 0.7;
    const scale = Math.min(1, maxW / naturalWidth);
    const w = naturalWidth * scale;
    const h = naturalHeight * scale;
    const obj = createObject('letterhead', {
      page: activePage, x: (page.width - w) / 2, y: 16, nextId, nextZ,
      src, w, h, naturalWidth, naturalHeight,
    });
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  async function addLetterheadFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const { dataUrl, naturalWidth, naturalHeight } = await fileToPngDataUrl(file);
      placeLetterhead(dataUrl, naturalWidth, naturalHeight);
    } catch {
      setError('Could not insert that letterhead. Please try a different file.');
    }
  }

  function addWatermark() {
    const page = pages[activePage];
    if (!page) return;
    const obj = createObject('watermark', { page: activePage, x: 0, y: 0, nextId, nextZ });
    obj.x = (page.width - obj.w) / 2;
    obj.y = (page.height - obj.h) / 2;
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  function addStamp(presetId) {
    const page = pages[activePage];
    if (!page) return;
    const obj = createObject('stamp', { page: activePage, x: 0, y: 0, presetId, nextId, nextZ });
    obj.x = page.width - obj.w - 40;
    obj.y = page.height - obj.h - 40;
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  function addFooter() {
    const page = pages[activePage];
    if (!page) return;
    const obj = createObject('footer', { page: activePage, x: 0, y: 0, nextId, nextZ });
    obj.x = (page.width - obj.w) / 2;
    obj.y = page.height - obj.h - 24;
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
  }

  // QR generation is async (dynamically imports qr-code-styling), so the
  // real scannable image is generated BEFORE the object is created and
  // committed — a single insert, not an insert-then-patch — which sidesteps
  // having to reconcile a stale `pageObjects`/`objects` snapshot against
  // whatever the user did on the canvas while generation was in flight.
  async function addQrCode() {
    const page = pages[activePage];
    if (!page) return;
    try {
      const defaultValue = 'https://';
      const defaultColor = '#0F172A';
      const dataUrl = await generateQrDataUrl(defaultValue, { color: defaultColor });
      const w = Math.min(140, page.width * 0.25);
      const obj = createObject('qrcode', {
        page: activePage, x: (page.width - w) / 2, y: (page.height - w) / 2, nextId, nextZ,
        value: defaultValue, color: defaultColor, dataUrl, w, h: w,
      });
      commitPageObjects([...pageObjects, obj]);
      setSelectedId(obj.id);
    } catch {
      setError('Could not generate a QR code. Please try again.');
    }
  }

  // Regenerates a placed QR code's actual scannable image after the user
  // edits its content/color in the Properties panel — deliberately an
  // explicit "Update QR Code" action rather than regenerating on every
  // keystroke, since each regeneration is a real async QR-encode call.
  // Reads objectsRef.current (not the closed-over `objects`) since this
  // resolves after an await, by which point the render that created this
  // closure may no longer be the latest one.
  async function regenerateQrCode(id, value, color) {
    try {
      const dataUrl = await generateQrDataUrl(value, { color });
      if (!dataUrl) {
        setError('Please enter some text or a URL for the QR code.');
        return;
      }
      commit(objectsRef.current.map((o) => (o.id === id ? { ...o, value, color, dataUrl, updatedAt: Date.now() } : o)));
      setResultBytes(null);
    } catch {
      setError('Could not generate a QR code. Please try again.');
    }
  }

  useKeyboardShortcuts({
    enabled: pages.length > 0,
    onUndo: undo,
    onRedo: redo,
    onDelete: deleteSelected,
    onDuplicate: duplicateSelected,
    onDeselect: deselectAll,
    onNudge: nudgeSelected,
  });

  async function loadPdfIntoWorkspace(f, { fromSession = false } = {}) {
    if (!f || f.type !== 'application/pdf') return;
    if (f.size > MAX_FILE_BYTES) { setError('That file is larger than the 100MB limit. Please choose a smaller PDF.'); return; }
    setFile(f);
    setLoading(true);
    setError('');
    setResultBytes(null);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      // Fire-and-forget: warms the font-metric cache text.js's alignment
      // math needs (see components/shared/fontResolver.js).
      warmMeasurementFonts();
      const buf = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const loadedPages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        // Captured once per page for the Letterhead element's Smart Layout
        // mode (see letterheadDetection.js) — cheap to compute now, alongside
        // the render pass, rather than re-reading the PDF at export time.
        const textContent = await page.getTextContent();
        const textBoxes = extractTextBoxes(textContent, viewport.height, RENDER_SCALE);
        loadedPages.push({ canvas, width: viewport.width, height: viewport.height, textBoxes });
      }
      setPages(loadedPages);
      setPageOrder(loadedPages.map((_, i) => i));
      resetHistory([]);
      setActivePage(0);
      setSelectedId(null);
      setEditingId(null);
      if (!fromSession) {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          startSession(f, { toolSlug: 'pdf-overlay' });
        }
      }
    } catch {
      setError("Could not read this PDF. Make sure it's a valid, non-password-protected file.");
    }
    setLoading(false);
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    await loadPdfIntoWorkspace(f, { fromSession: true });
  }
  useAutoContinueSession('pdf-overlay', continueWithSessionDocument);

  function handleFileInput(e) {
    loadPdfIntoWorkspace(e.target.files?.[0]);
  }

  function goToPage(origIdx) {
    setActivePage(origIdx);
    setSelectedId(null);
    setEditingId(null);
  }

  async function handleApply() {
    setBusy(true);
    setError('');
    setLetterheadWarning('');
    try {
      const buf = await file.arrayBuffer();
      const pagesInfo = pages.map((p) => ({ width: p.width, height: p.height, textBoxes: p.textBoxes }));
      const { bytes, skippedLetterheadPages } = await applyLayoutToPdf(buf, objects, pagesInfo);
      if (skippedLetterheadPages.length) {
        const pageList = [...new Set(skippedLetterheadPages)].sort((a, b) => a - b).join(', ');
        setLetterheadWarning(`Smart Layout skipped page${skippedLetterheadPages.length > 1 ? 's' : ''} ${pageList} — not enough clear space to place the letterhead without covering existing text.`);
      }
      setResultBytes(bytes);
      await updateDocument(bytes, { toolSlug: 'pdf-overlay', label: 'Layout applied' });
    } catch (err) {
      console.error(err);
      setError('Could not generate PDF. Please try again.');
    }
    setBusy(false);
  }

  // Batch processing: applies the same `objects` template built on the main
  // document to another uploaded PDF. Reuses objectsRef.current (not the
  // closed-over `objects`) since BatchPanel awaits this per queued file —
  // by the time an earlier file's extractPageInfo() resolves, a later
  // render may already have moved on, and the template should always be
  // "whatever the layout looks like right now," not a stale snapshot from
  // whenever the batch was started.
  async function processBatchFile(batchFile) {
    // Two separate arrayBuffer() calls, not one buffer reused — pdf.js
    // transfers its input ArrayBuffer to a worker (detaching it), so a
    // buffer already handed to extractPageInfo() is unusable by pdf-lib's
    // PDFDocument.load() afterward.
    const pagesInfo = await extractPageInfo(await batchFile.arrayBuffer());
    const buf = await batchFile.arrayBuffer();
    const { bytes, skippedLetterheadPages } = await applyLayoutToPdf(buf, objectsRef.current, pagesInfo);
    return { bytes, warning: skippedLetterheadPages.length > 0 };
  }

  function downloadResult() {
    if (!resultBytes || !file) return;
    downloadBlob(new Blob([resultBytes], { type: 'application/pdf' }), file.name.replace(/\.pdf$/i, '') + '-layout.pdf');
  }

  function reset() {
    setFile(null);
    setPages([]);
    setPageOrder([]);
    resetHistory([]);
    setSelectedId(null);
    setEditingId(null);
    setResultBytes(null);
    setError('');
    setLetterheadWarning('');
  }

  if (!pages.length) {
    return (
      <div className="panel">
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
        <p className="text-sm text-ink-soft mb-4">
          Upload a PDF and build a professional layout on top of it — add text, images, logos, signatures, shapes, dates, and page numbers directly on the page. Watermarks, stamps, QR codes, and an intelligent letterhead system are on the way.
        </p>
        <label className="dropzone block cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); loadPdfIntoWorkspace(e.dataTransfer.files[0]); }}>
          <input type="file" accept="application/pdf" onChange={handleFileInput} hidden />
          <div className="dz-icon">[ PDF ]</div>
          <div className="dz-main">Click to choose a PDF, or drag it here</div>
          <div className="dz-sub">Max 100MB.</div>
        </label>
        {loading && <p className="text-xs text-ink-soft mt-2">Loading PDF…</p>}
        {error && <div className="status error">{error}</div>}
        <p className="privacy-note">Processed entirely in your browser — your documents never leave your device.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="font-semibold text-ink text-sm">{file?.name}</p>
          <p className="text-xs text-ink-soft">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-ghost-sm" onClick={reset}>Change file</button>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <ElementsPanel
          onAddText={addText}
          onChooseImage={(e) => addImageFile(e.target.files?.[0])}
          onChooseLogo={(e) => addLogoFile(e.target.files?.[0])}
          onToggleSignaturePad={() => setShowSignaturePad((v) => !v)}
          onInsertDateTime={insertDateTime}
          onAddShape={addShape}
          onAddPageNumber={addPageNumber}
          onChooseLetterhead={(e) => addLetterheadFile(e.target.files?.[0])}
          onAddWatermark={addWatermark}
          onAddStamp={addStamp}
          onAddFooter={addFooter}
          onAddQrCode={addQrCode}
        />

        <div style={{ flex: 1, minWidth: 320 }}>
          {pages.length > 1 && (
            <div className="flex items-center gap-2 mb-2">
              <button className="btn-ghost-sm" disabled={activePage === 0} onClick={() => goToPage(activePage - 1)}>← Prev</button>
              <span className="text-xs text-ink-soft">Page {activePage + 1} of {pages.length}</span>
              <button className="btn-ghost-sm" disabled={activePage === pages.length - 1} onClick={() => goToPage(activePage + 1)}>Next →</button>
            </div>
          )}
          <Toolbar
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            hasSelection={!!selectedId}
            onDuplicateSelected={duplicateSelected}
            onDeleteSelected={deleteSelected}
            dateFormatId={dateFormatId}
            onDateFormatChange={handleDateFormatChange}
          />
          {showSignaturePad && <SignaturePad onCapture={insertSignatureCapture} />}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            {pages.length > 1 && (
              <ThumbnailRail
                pages={pages}
                pageOrder={pageOrder}
                activePage={activePage}
                pageRotations={{}}
                onSelectPage={goToPage}
                // Reordering thumbnails only changes navigation order here —
                // it deliberately does not reorder pages in the exported
                // PDF (that's real, separate page-management work already
                // covered by this app's Organize PDF tools). Left as a
                // no-op for Phase 0 rather than shipping a reorder control
                // whose effect silently doesn't match what it looks like it
                // does.
                onReorder={() => {}}
              />
            )}
            <Stage
              page={pages[activePage]}
              pageObjects={pageObjects}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              editingId={editingId}
              setEditingId={setEditingId}
              commitPageObjects={commitPageObjects}
              deleteObjectById={deleteObjectById}
              pageCount={pages.length}
            />
          </div>
        </div>

        <PropertiesPanel
          selectedObject={selectedObject}
          onChange={updateSelectedObject}
          onDeselect={deselectAll}
          pageObjects={pageObjects}
          selectedId={selectedId}
          onSelectId={setSelectedId}
          onToggleLockById={toggleLockById}
          onToggleHideById={toggleHideById}
          onRenameObject={renameObject}
          onReorderZ={reorderZ}
          onDuplicateSelected={duplicateSelected}
          onDeleteSelected={deleteSelected}
          onRegenerateQrCode={regenerateQrCode}
        />
      </div>

      {error && <div className="status error mt-3">{error}</div>}
      {letterheadWarning && (
        <div style={{ marginTop: 12, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', fontSize: '0.78rem', color: '#92400E' }}>
          {letterheadWarning}
        </div>
      )}

      {!resultBytes ? (
        <div className="actions mt-3">
          <button className="btn btn-primary" disabled={busy || objects.length === 0} onClick={handleApply}>
            {busy ? 'Generating…' : 'Apply Layout'}
          </button>
          <button className="btn btn-ghost" onClick={reset}>Start over</button>
        </div>
      ) : (
        <>
          <ContinueWorkingPanel toolSlug="pdf-overlay" documentName={file?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
          <button onClick={() => setResultBytes(null)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#64748B', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            ← Edit more
          </button>
        </>
      )}

      <BatchPanel hasLayout={objects.length > 0} onProcessFile={processBatchFile} />

      <p className="privacy-note">Processed entirely in your browser — your documents never leave your device.</p>
    </div>
  );
}
