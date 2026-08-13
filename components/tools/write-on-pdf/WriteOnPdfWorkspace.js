'use client';

import { useState } from 'react';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';
import { useObjectHistory } from '@/components/shared/useObjectHistory';
import { useKeyboardShortcuts } from '@/components/shared/useKeyboardShortcuts';
import SignaturePad from '@/components/shared/SignaturePad';
import { INK_COLORS, RENDER_SCALE } from './constants';
import { createFontEmbedCache, measureTextWidthPagePx, warmMeasurementFonts } from '@/components/shared/fontResolver';
import { applyFormFieldValues, detectFormFields } from './formFields';
import { fitFontSize } from './autoFit';
import Toolbar, { DATE_FORMATS } from './Toolbar';
import TextProperties from './TextProperties';
import PageNavigator from './PageNavigator';
import Stage from './Stage';

const MAX_FILE_BYTES = 100 * 1024 * 1024;
const DATE_FORMAT_STORAGE_KEY = 'convertam_write_on_pdf_date_format';

// Re-encodes any uploaded image file to a PNG data URL through a canvas, so
// export can always call pdfDoc.embedPng() unconditionally — sidesteps
// having to sniff/branch on the original format (jpeg/webp/etc.) at either
// insert or export time.
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

function hexToRgbFractions(hex) {
  const clean = (hex || '#111827').replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  return { r: r || 0, g: g || 0, b: b || 0 };
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

// Orchestrator: owns document/session loading, the object history, and the
// export/download flow. All canvas + object interaction lives in Stage.js,
// all toolbar chrome lives in Toolbar.js — this file composes them and is
// the only place that talks to DocumentSessionProvider or pdf-lib.
//
// Export draws real vector pdf-lib operations straight onto the ORIGINAL
// PDF page (drawText, later drawImage/drawRectangle) rather than
// rasterizing the page like Annotate PDF/Redact & Edit PDF do — those tools
// rasterize because they need to support 13+ shape/markup types freely;
// Write on PDF doesn't need that tradeoff, and skipping it keeps the
// original document's text 100% untouched (still selectable/searchable,
// no re-encoding blur), which matters more here given the "can't tell what
// was added" success metric.
export default function WriteOnPdfWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // [{ canvas, width, height, textContent }]
  const [activePage, setActivePage] = useState(0);
  const [formFields, setFormFields] = useState([]); // tier 1: real AcroForm fields, see formFields.js
  const [fieldValues, setFieldValues] = useState({}); // { [fieldName]: value }
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultBytes, setResultBytes] = useState(null);

  const [activeTool, setActiveTool] = useState('select');
  const [inkColor] = useState(INK_COLORS[0]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [dateFormatId, setDateFormatId] = useState(() => {
    if (typeof window === 'undefined') return DATE_FORMATS[0].id;
    return window.localStorage.getItem(DATE_FORMAT_STORAGE_KEY) || DATE_FORMATS[0].id;
  });
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const { objects, commit, undo: rawUndo, redo: rawRedo, canUndo, canRedo, reset: resetHistory, nextId, nextZ } = useObjectHistory();
  const pageObjects = objects.filter((o) => o.page === activePage);
  const selectedObject = pageObjects.find((o) => o.id === selectedId) || null;

  function commitPageObjects(nextPageObjects) {
    const others = objects.filter((o) => o.page !== activePage);
    commit([...others, ...nextPageObjects]);
    setResultBytes(null);
  }

  function undo() { rawUndo(); setSelectedId(null); setEditingId(null); }
  function redo() { rawRedo(); setSelectedId(null); setEditingId(null); }

  function deleteObjectById(id) {
    commitPageObjects(pageObjects.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  }
  function deleteSelected() {
    if (!selectedId) return;
    deleteObjectById(selectedId);
  }
  function duplicateSelected() {
    const obj = pageObjects.find((o) => o.id === selectedId);
    if (!obj) return;
    const OFFSET = 16;
    const copy = { ...obj, id: nextId(), z: nextZ(), createdAt: Date.now(), updatedAt: Date.now(), x: obj.x + OFFSET, y: obj.y + OFFSET };
    commitPageObjects([...pageObjects, copy]);
    setSelectedId(copy.id);
  }
  function nudgeSelected(dx, dy) {
    if (!selectedId) return;
    commitPageObjects(pageObjects.map((o) => (o.id === selectedId ? { ...o, x: o.x + dx, y: o.y + dy, updatedAt: Date.now() } : o)));
  }
  function updateSelectedObject(patch) {
    if (!selectedId) return;
    commitPageObjects(pageObjects.map((o) => (o.id === selectedId ? { ...o, ...patch, updatedAt: Date.now() } : o)));
  }
  function deselectAll() {
    setSelectedId(null);
    setEditingId(null);
  }

  function setFieldValue(name, value) {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
    setResultBytes(null);
  }

  function handleDateFormatChange(id) {
    setDateFormatId(id);
    try { window.localStorage.setItem(DATE_FORMAT_STORAGE_KEY, id); } catch { /* ignore */ }
  }

  // One-shot insert (not a persistent click-to-place tool, like Annotate
  // PDF's own insertDate()) — places at a sensible default spot and
  // immediately selects it so the user can drag it into position.
  function insertDate() {
    const page = pages[activePage];
    if (!page) return;
    const format = DATE_FORMATS.find((f) => f.id === dateFormatId) || DATE_FORMATS[0];
    const text = format.format(new Date());
    const fontSize = 16;
    const w = 160;
    const h = 24;
    const obj = {
      id: nextId(), type: 'text', page: activePage, z: nextZ(), rotation: 0,
      createdAt: Date.now(), updatedAt: Date.now(),
      x: page.width * 0.62, y: page.height * 0.9, w, h,
      text, fontFamily: 'sans', bold: false, italic: false, fontSize, color: inkColor,
      align: 'left', opacity: 1, uppercase: false,
    };
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
    setActiveTool('select');
  }

  // Centers a raster object (signature/initials/image) on the visible page,
  // sized to fit within 40% of the page in either dimension — mirrors
  // Annotate PDF's placeCenteredRaster(), the established pattern for "just
  // inserted, now drag it where it belongs" raster placement.
  function placeCenteredRaster(type, { src, naturalWidth, naturalHeight, extra }) {
    const page = pages[activePage];
    if (!page) return;
    const maxW = page.width * 0.4;
    const maxH = page.height * 0.4;
    const scale = Math.min(1, maxW / naturalWidth, maxH / naturalHeight);
    const w = naturalWidth * scale;
    const h = naturalHeight * scale;
    const x = (page.width - w) / 2;
    const y = (page.height - h) / 2;
    const obj = {
      id: nextId(), type, page: activePage, z: nextZ(), rotation: 0,
      createdAt: Date.now(), updatedAt: Date.now(),
      x, y, w, h, src, opacity: 1, ...extra,
    };
    commitPageObjects([...pageObjects, obj]);
    setSelectedId(obj.id);
    setActiveTool('select');
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

  async function insertImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const { dataUrl, naturalWidth, naturalHeight } = await fileToPngDataUrl(file);
      placeCenteredRaster('image', { src: dataUrl, naturalWidth, naturalHeight, extra: {} });
    } catch {
      setError('Could not insert that image. Please try a different file.');
    }
  }

  function handleChooseImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    insertImageFile(file);
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
      const [pdfjsLib, { PDFDocument }] = await Promise.all([import('pdfjs-dist'), import('pdf-lib')]);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      // Fire-and-forget: warms the font-metric cache Stage.js's alignment
      // math needs (see fontResolver.js). Not awaited — text placement
      // works fine before it resolves (getCachedMeasureFont just returns
      // null briefly), and it typically finishes well before a user
      // actually clicks to place their first text object.
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
        let textContent = null;
        try { textContent = await page.getTextContent(); } catch { /* scanned page — no text layer */ }
        loadedPages.push({ canvas, width: viewport.width, height: viewport.height, textContent });
      }
      setPages(loadedPages);

      // Tier 1 of the priority order (see project plan): detect real
      // AcroForm fields via a second, independent load of the same bytes —
      // pdf.js (above) has no form-field API, and pdf-lib has no page-
      // rendering API, so both libraries are needed for their own part.
      // Uses a fresh arrayBuffer() read rather than reusing `buf` — pdf.js's
      // getDocument() can transfer/detach the buffer it's given, which would
      // leave a shared buffer unreadable by pdf-lib afterward.
      let detectedFields = [];
      try {
        const fieldsBuf = await f.arrayBuffer();
        const pdfDocForFields = await PDFDocument.load(fieldsBuf);
        detectedFields = detectFormFields(pdfDocForFields);
      } catch (fieldErr) { console.error('Form field detection failed:', fieldErr); /* malformed AcroForm — treat as "no fields", tiers 2/3 still work */ }
      setFormFields(detectedFields);
      setFieldValues({});

      resetHistory([]);
      setActivePage(0);
      setSelectedId(null);
      setEditingId(null);
      setActiveTool('select');
      if (!fromSession) {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          startSession(f, { toolSlug: 'write-on-pdf' });
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

  // Arriving here via a Workspace Handoff (e.g. "Continue in Write on PDF"
  // from Redact & Edit PDF's completion screen) loads the document
  // immediately instead of waiting on the manual "Continue with {name}"
  // banner click below — that's what makes the transition feel instant.
  useAutoContinueSession('write-on-pdf', continueWithSessionDocument);

  function handleFileInput(e) {
    loadPdfIntoWorkspace(e.target.files?.[0]);
  }

  async function handleApply() {
    setBusy(true);
    setError('');
    try {
      const { PDFDocument, degrees, rgb } = await import('pdf-lib');
      const buf = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buf);

      // Tier 1 first: writes real AcroForm field values and flattens the
      // form (mirroring FillPdfWorkspace.js's own export sequence) before
      // any tier 2/3 free-positioned content is drawn on top. Skipped
      // entirely for PDFs with no fields, rather than calling
      // pdfDoc.getForm() (and risking pdf-lib creating an empty AcroForm
      // dict) on a plain PDF that never had one.
      if (formFields.length) applyFormFieldValues(pdfDoc, fieldValues);

      const embedFor = createFontEmbedCache(pdfDoc);
      const pdfPages = pdfDoc.getPages();
      const imageEmbedCache = new Map(); // src -> embedded pdf-lib PNG image, avoids re-embedding repeats

      async function embedImage(src) {
        if (!imageEmbedCache.has(src)) {
          const bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
          imageEmbedCache.set(src, await pdfDoc.embedPng(bytes));
        }
        return imageEmbedCache.get(src);
      }

      for (const o of objects) {
        const pdfPage = pdfPages[o.page];
        if (!pdfPage) continue;
        const { height: pageHeightPx } = pages[o.page];
        // Page-space (RENDER_SCALE px, top-left origin) -> PDF points
        // (bottom-left origin) for any rectangular object.
        const pdfX = o.x / RENDER_SCALE;
        const wPt = o.w / RENDER_SCALE;
        const hPt = o.h / RENDER_SCALE;
        const pdfTopY = (pageHeightPx - o.y) / RENDER_SCALE;
        const pdfBottomY = pdfTopY - hPt;

        if (o.type === 'text') {
          if (!o.text.trim()) continue;
          const font = await embedFor(o);
          const displayText = o.uppercase ? o.text.toUpperCase() : o.text;
          // Auto Text Fit (autoFit.js): the same shrink-to-fit size the
          // on-screen idle render uses (text.js's Content), so a fitted
          // object never disagrees between preview and downloaded PDF.
          const effSize = fitFontSize(o);
          const sizePt = effSize / RENDER_SCALE;
          // Same vertical-centering heuristic the on-screen DOM box uses —
          // exact when Stage.js snapped this object to a real detected
          // baseline (Phase 2), an approximation otherwise.
          const baselineFromTopPx = o.h * 0.5 + effSize * 0.32;
          let xPx = o.x;
          // The same measureTextWidthPagePx() the on-screen preview's
          // alignment math uses (text.js's Content) — same font family/
          // size in, same width out, since a StandardFonts entry's metrics
          // don't vary by which document embedded it. This is what keeps
          // center/right alignment from visibly disagreeing between the
          // preview and the downloaded PDF.
          const widthPx = measureTextWidthPagePx(font, displayText, effSize, RENDER_SCALE);
          if (o.align === 'center') xPx = o.x + (o.w - widthPx) / 2;
          else if (o.align === 'right') xPx = o.x + o.w - widthPx;
          const { r, g, b } = hexToRgbFractions(o.color);
          pdfPage.drawText(displayText, {
            x: xPx / RENDER_SCALE,
            y: (pageHeightPx - (o.y + baselineFromTopPx)) / RENDER_SCALE,
            size: sizePt,
            font,
            color: rgb(r, g, b),
            opacity: o.opacity ?? 1,
            rotate: degrees(o.rotation || 0),
          });
        } else if (o.type === 'highlight' || o.type === 'cover') {
          // Real vector fill, never a rasterized overlay — cover is opaque,
          // highlight uses its own translucent opacity.
          const { r, g, b } = hexToRgbFractions(o.color);
          pdfPage.drawRectangle({ x: pdfX, y: pdfBottomY, width: wPt, height: hPt, color: rgb(r, g, b), opacity: o.opacity ?? 1 });
        } else if (o.type === 'checkbox') {
          const { r, g, b } = hexToRgbFractions(o.color);
          const color = rgb(r, g, b);
          pdfPage.drawRectangle({ x: pdfX, y: pdfBottomY, width: wPt, height: hPt, borderColor: color, borderWidth: Math.max(1, wPt * 0.06), opacity: o.opacity ?? 1 });
          if (o.checked) {
            // Same checkmark proportions as the on-screen SVG path
            // (checkbox.js), converted from its 0-1 unit-square coordinates
            // into this box's real PDF-space rectangle — real vector line
            // segments, not a rasterized glyph.
            const toPt = (u, v) => ({ x: pdfX + u * wPt, y: pdfTopY - v * hPt });
            const p1 = toPt(4 / 24, 12.5 / 24);
            const p2 = toPt(9.5 / 24, 18 / 24);
            const p3 = toPt(20 / 24, 5 / 24);
            const thickness = Math.max(1, wPt * 0.13);
            pdfPage.drawLine({ start: p1, end: p2, thickness, color });
            pdfPage.drawLine({ start: p2, end: p3, thickness, color });
          }
        } else if (o.type === 'image' || o.type === 'signature') {
          if (!o.src) continue;
          const embedded = await embedImage(o.src);
          pdfPage.drawImage(embedded, { x: pdfX, y: pdfBottomY, width: wPt, height: hPt, opacity: o.opacity ?? 1, rotate: degrees(o.rotation || 0) });
        }
      }

      const bytes = await pdfDoc.save();
      setResultBytes(bytes);
      await updateDocument(bytes, { toolSlug: 'write-on-pdf', label: 'Text added' });
    } catch (err) {
      console.error(err);
      setError('Could not generate PDF. Please try again.');
    }
    setBusy(false);
  }

  // Downloading exports the current document but does not end the
  // workspace — see WorkspaceSidebar for Close Workspace.
  function downloadResult() {
    if (!resultBytes || !file) return;
    downloadBlob(new Blob([resultBytes], { type: 'application/pdf' }), file.name.replace('.pdf', '') + '-filled.pdf');
  }

  function reset() {
    setFile(null);
    setPages([]);
    setFormFields([]);
    setFieldValues({});
    resetHistory([]);
    setSelectedId(null);
    setEditingId(null);
    setResultBytes(null);
    setError('');
  }

  const filledObjectCount = objects.filter((o) => o.type !== 'text' || o.text.trim()).length;
  const filledFieldCount = Object.values(fieldValues).filter((v) => v !== undefined && v !== null && v !== '' && v !== false).length;
  const filledCount = filledObjectCount + filledFieldCount;
  const activePageFields = formFields.filter((f) => f.page === activePage);

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
          Upload any PDF — scanned bank forms, government documents, printed forms — and type text directly onto it anywhere you want.
        </p>
        <label className="dropzone block cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); loadPdfIntoWorkspace(e.dataTransfer.files[0]); }}>
          <input type="file" accept="application/pdf" onChange={handleFileInput} hidden />
          <div className="dz-icon">[ PDF ]</div>
          <div className="dz-main">Click to choose a PDF, or drag it here</div>
          <div className="dz-sub">Works on scanned PDFs, printed forms, bank forms — any PDF. Max 100MB.</div>
        </label>
        {loading && <p className="text-xs text-ink-soft mt-2">Loading PDF…</p>}
        {error && <div className="status error">{error}</div>}
        <p className="privacy-note">Processed entirely in your browser — your documents never leave your device.</p>
      </div>
    );
  }

  const page = pages[activePage];

  return (
    <div className="panel">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div>
          <p className="font-semibold text-ink text-sm">{file?.name}</p>
          <p className="text-xs text-ink-soft">{pages.length} page{pages.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-ghost-sm" onClick={reset}>Change file</button>
      </div>

      <PageNavigator
        pages={pages}
        activePage={activePage}
        onSelectPage={(i) => { setActivePage(i); setSelectedId(null); setEditingId(null); }}
      />

      <Toolbar
        activeTool={activeTool}
        onToolChange={(id) => { setActiveTool(id); setSelectedId(null); setEditingId(null); }}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        hasSelection={!!selectedId}
        onDeleteSelected={deleteSelected}
        onDuplicateSelected={duplicateSelected}
        dateFormatId={dateFormatId}
        onDateFormatChange={handleDateFormatChange}
        onInsertDate={insertDate}
        showSignaturePad={showSignaturePad}
        onToggleSignaturePad={() => setShowSignaturePad((v) => !v)}
        onChooseImage={handleChooseImage}
      />

      {showSignaturePad && <SignaturePad onCapture={insertSignatureCapture} />}

      {selectedObject?.type === 'text' && (
        <TextProperties obj={selectedObject} onChange={updateSelectedObject} />
      )}

      {activePageFields.length > 0 && (
        <p className="text-xs mb-3" style={{ color: '#1D4ED8' }}>
          📋 This page has {activePageFields.length} fillable form field{activePageFields.length !== 1 ? 's' : ''} — click directly inside one to fill it in.
        </p>
      )}

      <Stage
        page={page}
        activePage={activePage}
        pageObjects={pageObjects}
        activeTool={activeTool}
        inkColor={inkColor}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        editingId={editingId}
        setEditingId={setEditingId}
        commitPageObjects={commitPageObjects}
        deleteObjectById={deleteObjectById}
        nextId={nextId}
        nextZ={nextZ}
        formFields={activePageFields}
        fieldValues={fieldValues}
        setFieldValue={setFieldValue}
      />

      {filledCount > 0 && (
        <p className="text-xs text-ink-soft mb-3">✅ {filledCount} item{filledCount !== 1 ? 's' : ''} filled in.</p>
      )}

      {error && <div className="status error mb-3">{error}</div>}

      {!resultBytes ? (
        <div className="actions">
          <button className="btn btn-primary" disabled={busy || filledCount === 0} onClick={handleApply}>
            {busy ? 'Generating…' : 'Apply Changes'}
          </button>
          <button className="btn btn-ghost" onClick={reset}>Start over</button>
        </div>
      ) : (
        <>
          <ContinueWorkingPanel toolSlug="write-on-pdf" documentName={file?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
          <button onClick={() => setResultBytes(null)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#64748B', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            ← Edit more text
          </button>
        </>
      )}

      <p className="privacy-note">Processed entirely in your browser — your documents never leave your device.</p>
    </div>
  );
}
