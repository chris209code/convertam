'use client';

import { useEffect, useRef, useState } from 'react';
import { useDocumentSession, useAutoContinueSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';
import { DEFAULT_FAVORITE_TOOLS, FAVORITES_STORAGE_KEY, HIGHLIGHT_COLORS, INK_COLORS, RENDER_SCALE } from './constants';
import { boundsOf, drawObject } from './objectTypes';
import { loadImageElement } from './objectTypes/image';
import { renderStampDataUrl } from './StampLibrary';
import { alignObjects, distributeObjects, translateObject } from './alignment';
import { useObjectHistory } from '@/components/shared/useObjectHistory';
import { useKeyboardShortcuts } from '@/components/shared/useKeyboardShortcuts';
import { rotateCanvas } from './rotateCanvas';
import { downloadCommentsOnlyPdf, downloadReviewSummaryPdf, downloadReviewSummaryWord } from './reviewSummaryExport';
import Toolbar from './Toolbar';
import Stage from './Stage';
import ThumbnailRail from './ThumbnailRail';
import PropertiesPanel from './PropertiesPanel';

// Orchestrator: owns document/session loading, the annotation history, and
// the export/download flow. All canvas interaction lives in Stage.js, all
// toolbar chrome lives in Toolbar.js, page thumbnails/reordering live in
// ThumbnailRail.js, the right-hand properties/layers panel lives in
// PropertiesPanel.js — this file composes them, owns multi-select and the
// lock/hide/z-order/alignment/duplicate/favorites actions those panels
// trigger, and is the only place that talks to DocumentSessionProvider or
// pdf-lib.
export default function AnnotatePdfWorkspace() {
  const { session, startSession, updateDocument, getDocumentAsFile } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageOrder, setPageOrder] = useState([]); // display/export order, as a list of original page indices
  const [pageRotations, setPageRotations] = useState({}); // { [originalPageIndex]: 0|90|180|270 }
  const [activePage, setActivePage] = useState(0); // original page index of the page currently shown
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultBytes, setResultBytes] = useState(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  const [activeTool, setActiveTool] = useState('select');
  const [shapeKind, setShapeKind] = useState('rectangle');
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);
  const [inkColor, setInkColor] = useState(INK_COLORS[3]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [editor, setEditor] = useState(null); // { id, value }
  const [favoriteTools, setFavoriteTools] = useState(DEFAULT_FAVORITE_TOOLS);
  const [numberingCounter, setNumberingCounter] = useState(1);

  const { objects, commit, undo: rawUndo, redo: rawRedo, canUndo, canRedo, reset: resetHistory, nextId, nextZ } = useObjectHistory();

  const pageObjects = objects.filter((o) => o.page === activePage);
  const selectedObjects = pageObjects.filter((o) => selectedIds.has(o.id));
  const pagePosition = pageOrder.indexOf(activePage);

  const panelRef = useRef(null);
  const measureCtxRef = useRef(null);
  const imageFileInputRef = useRef(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) setFavoriteTools(JSON.parse(stored));
    } catch {
      // localStorage unavailable (private browsing, etc.) — defaults stand.
    }
  }, []);

  function toggleFavoriteTool(toolId) {
    setFavoriteTools((prev) => {
      const next = prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId];
      try { window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function getMeasureCtx() {
    if (!measureCtxRef.current) measureCtxRef.current = document.createElement('canvas').getContext('2d');
    return measureCtxRef.current;
  }

  // Fullscreen state is derived from the real Fullscreen API (not a plain
  // boolean we flip ourselves) — a CSS-only `position:fixed` overlay was
  // tried first, but this app's Tool Guide panel puts a transformed
  // ancestor between the workspace and the viewport, which makes
  // `position:fixed` resolve against that ancestor's box instead of the
  // real viewport (per the CSS spec, `fixed` is relative to the nearest
  // transformed/filtered ancestor, not always the viewport) — so the
  // "fullscreen" overlay rendered squeezed between the nav sidebar and the
  // guide panel instead of covering the screen. The native Fullscreen API
  // doesn't have that problem: it takes the element outside normal
  // stacking/containment entirely.
  useEffect(() => {
    function onFullscreenChange() { setFullscreen(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      panelRef.current?.requestFullscreen?.();
    }
  }

  function exitFullscreenIfActive() {
    if (document.fullscreenElement) document.exitFullscreen();
  }

  function commitPageObjects(nextPageObjects) {
    const others = objects.filter((o) => o.page !== activePage);
    commit([...others, ...nextPageObjects]);
    setResultBytes(null);
  }

  function undo() { rawUndo(); setSelectedIds(new Set()); setEditor(null); }
  function redo() { rawRedo(); setSelectedIds(new Set()); setEditor(null); }

  function deleteObjectById(id) {
    commitPageObjects(pageObjects.filter((o) => o.id !== id));
    setSelectedIds(new Set());
    setEditor(null);
  }

  function clearPage() {
    commitPageObjects([]);
    setSelectedIds(new Set());
    setEditor(null);
  }

  function deleteSelected() {
    if (!selectedIds.size) return;
    commitPageObjects(pageObjects.filter((o) => !selectedIds.has(o.id)));
    setSelectedIds(new Set());
  }

  function selectAll() {
    setSelectedIds(new Set(pageObjects.filter((o) => !o.hidden).map((o) => o.id)));
  }
  function deselectAll() {
    setSelectedIds(new Set());
    setEditor(null);
  }

  function duplicateSelected() {
    if (!selectedIds.size) return;
    const OFFSET = 16;
    const copies = selectedObjects.map((o) => {
      const copy = { ...o, id: nextId(), z: nextZ(), createdAt: Date.now(), updatedAt: Date.now(), x: o.x + OFFSET, y: o.y + OFFSET };
      if (o.points) copy.points = o.points.map((p) => ({ x: p.x + OFFSET, y: p.y + OFFSET }));
      if (o.leaderPoint) copy.leaderPoint = { x: o.leaderPoint.x + OFFSET, y: o.leaderPoint.y + OFFSET };
      return copy;
    });
    commitPageObjects([...pageObjects, ...copies]);
    setSelectedIds(new Set(copies.map((c) => c.id)));
  }

  function toggleLockSelected() {
    if (!selectedIds.size) return;
    const allLocked = selectedObjects.every((o) => o.locked);
    commitPageObjects(pageObjects.map((o) => (selectedIds.has(o.id) ? { ...o, locked: !allLocked, updatedAt: Date.now() } : o)));
  }
  function toggleHideSelected() {
    if (!selectedIds.size) return;
    const allHidden = selectedObjects.every((o) => o.hidden);
    commitPageObjects(pageObjects.map((o) => (selectedIds.has(o.id) ? { ...o, hidden: !allHidden, updatedAt: Date.now() } : o)));
    if (!allHidden) setSelectedIds(new Set());
  }
  function toggleLockById(id) {
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, locked: !o.locked, updatedAt: Date.now() } : o)));
  }
  function toggleHideById(id) {
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, hidden: !o.hidden, updatedAt: Date.now() } : o)));
  }

  function reorderZ(mode) {
    if (!selectedIds.size) return;
    const sorted = [...pageObjects].sort((a, b) => a.z - b.z);
    let ordered;
    if (mode === 'front' || mode === 'back') {
      const others = sorted.filter((o) => !selectedIds.has(o.id));
      const moving = sorted.filter((o) => selectedIds.has(o.id));
      ordered = mode === 'front' ? [...others, ...moving] : [...moving, ...others];
    } else {
      ordered = [...sorted];
      if (mode === 'forward') {
        for (let i = ordered.length - 2; i >= 0; i--) {
          if (selectedIds.has(ordered[i].id) && !selectedIds.has(ordered[i + 1].id)) {
            [ordered[i], ordered[i + 1]] = [ordered[i + 1], ordered[i]];
          }
        }
      } else {
        for (let i = 1; i < ordered.length; i++) {
          if (selectedIds.has(ordered[i].id) && !selectedIds.has(ordered[i - 1].id)) {
            [ordered[i], ordered[i - 1]] = [ordered[i - 1], ordered[i]];
          }
        }
      }
    }
    commitPageObjects(ordered.map((o, i) => ({ ...o, z: i + 1 })));
  }

  function updateSelected(patch) {
    if (!selectedIds.size) return;
    commitPageObjects(pageObjects.map((o) => (selectedIds.has(o.id) ? { ...o, ...patch, updatedAt: Date.now() } : o)));
  }

  function alignSelected(mode) {
    if (selectedIds.size < 2) return;
    commitPageObjects(alignObjects(pageObjects, selectedIds, boundsOf, getMeasureCtx(), mode));
  }
  function distributeSelected(axis) {
    if (selectedIds.size < 3) return;
    commitPageObjects(distributeObjects(pageObjects, selectedIds, boundsOf, getMeasureCtx(), axis));
  }
  function nudgeSelected(dx, dy) {
    if (!selectedIds.size) return;
    commitPageObjects(pageObjects.map((o) => (selectedIds.has(o.id) ? translateObject(o, dx, dy) : o)));
  }

  function selectObjectId(id) {
    setEditor(null);
    setSelectedIds(new Set([id]));
  }

  function triggerImageInsert() {
    imageFileInputRef.current?.click();
  }

  // Shared by Image Insert, Stamp Library presets, and custom stamp upload:
  // decode a raster (via image.js's cache, primed once here) and place it
  // centered on the current page at a sane default size, then select it and
  // drop back to the Select tool so the user can immediately drag/resize it.
  async function placeCenteredRaster({ src, naturalWidth, naturalHeight, type, extra }) {
    const img = await loadImageElement(src);
    const page = pages[activePage];
    const maxW = page.width * 0.4;
    const maxH = page.height * 0.4;
    const nw = naturalWidth ?? img.naturalWidth;
    const nh = naturalHeight ?? img.naturalHeight;
    const scale = Math.min(1, maxW / nw, maxH / nh);
    const w = nw * scale;
    const h = nh * scale;
    const x = (page.width - w) / 2;
    const y = (page.height - h) / 2;
    const obj = { id: nextId(), type, page: activePage, z: nextZ(), locked: false, hidden: false, resolved: false, author: 'You', createdAt: Date.now(), updatedAt: Date.now(), rotation: 0, x, y, w, h, src, ...extra };
    commitPageObjects([...pageObjects, obj]);
    setSelectedIds(new Set([obj.id]));
    setActiveTool('select');
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleImageFileChosen(e) {
    const chosen = e.target.files?.[0];
    e.target.value = '';
    if (!chosen || !chosen.type.startsWith('image/')) return;
    try {
      const src = await readFileAsDataUrl(chosen);
      await placeCenteredRaster({ src, type: 'image' });
    } catch {
      setError('Could not insert that image. Please try a different file.');
    }
  }

  async function insertStampPreset(preset) {
    try {
      const { dataUrl, width, height } = renderStampDataUrl(preset.label, preset.color);
      await placeCenteredRaster({ src: dataUrl, naturalWidth: width, naturalHeight: height, type: 'stamp', extra: { label: preset.label } });
    } catch {
      setError('Could not place that stamp. Please try again.');
    }
  }

  async function insertCustomStamp(file) {
    if (!file.type.startsWith('image/')) return;
    try {
      const src = await readFileAsDataUrl(file);
      await placeCenteredRaster({ src, type: 'stamp', extra: { label: 'Custom stamp' } });
    } catch {
      setError('Could not insert that stamp image. Please try a different file.');
    }
  }

  async function insertSignature(dataUrl, kind) {
    try {
      await placeCenteredRaster({ src: dataUrl, type: 'signature', extra: { kind } });
    } catch {
      setError('Could not place that signature. Please try again.');
    }
  }

  function insertDate() {
    const dateText = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const page = pages[activePage];
    const size = 20;
    const obj = {
      id: nextId(), type: 'text', page: activePage, z: nextZ(), locked: false, hidden: false, resolved: false,
      author: 'You', createdAt: Date.now(), updatedAt: Date.now(), rotation: 0,
      x: page.width * 0.62, y: page.height * 0.88, color: inkColor, size, text: dateText,
    };
    commitPageObjects([...pageObjects, obj]);
    setSelectedIds(new Set([obj.id]));
    setActiveTool('select');
  }

  function restartNumbering() {
    setNumberingCounter(1);
  }
  function incrementNumbering() {
    setNumberingCounter((n) => n + 1);
  }

  function jumpToObject(page, id) {
    setActivePage(page);
    setSelectedIds(new Set([id]));
    setEditor(null);
  }
  function toggleResolvedById(page, id) {
    commit(objects.map((o) => (o.page === page && o.id === id ? { ...o, resolved: !o.resolved, updatedAt: Date.now() } : o)));
  }

  function goToPage(origIndex) {
    setActivePage(origIndex);
    setSelectedIds(new Set());
    setEditor(null);
  }
  function goToPrevPage() { if (pagePosition > 0) goToPage(pageOrder[pagePosition - 1]); }
  function goToNextPage() { if (pagePosition < pageOrder.length - 1) goToPage(pageOrder[pagePosition + 1]); }

  function rotateActivePage(nextDegrees) {
    setPageRotations((prev) => ({ ...prev, [activePage]: nextDegrees }));
  }

  useKeyboardShortcuts({
    enabled: pages.length > 0,
    onUndo: undo,
    onRedo: redo,
    onDelete: deleteSelected,
    onDuplicate: duplicateSelected,
    onSelectAll: selectAll,
    onDeselect: deselectAll,
    onNudge: nudgeSelected,
    onBringForward: () => reorderZ('forward'),
    onSendBackward: () => reorderZ('backward'),
    onBringToFront: () => reorderZ('front'),
    onSendToBack: () => reorderZ('back'),
  });

  async function loadPdfIntoWorkspace(f, { fromSession = false } = {}) {
    if (!f || f.type !== 'application/pdf') return;
    setFile(f);
    setLoading(true);
    setError('');
    setResultBytes(null);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
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
        loadedPages.push({ canvas, width: viewport.width, height: viewport.height });
      }
      setPages(loadedPages);
      setPageOrder(loadedPages.map((_, i) => i));
      setPageRotations({});
      exitFullscreenIfActive();
      resetHistory([]);
      setActivePage(0);
      setSelectedIds(new Set());
      setEditor(null);
      setActiveTool('select');
      if (!fromSession) {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          startSession(f, { toolSlug: 'annotate-pdf' });
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
  useAutoContinueSession('annotate-pdf', continueWithSessionDocument);

  function handleFileInput(e) {
    loadPdfIntoWorkspace(e.target.files?.[0]);
  }

  async function handleApply() {
    setBusy(true);
    setError('');
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();

      for (const i of pageOrder) {
        const p = pages[i];
        const pageObjs = objects.filter((o) => o.page === i);
        const flat = document.createElement('canvas');
        flat.width = p.width;
        flat.height = p.height;
        const ctx = flat.getContext('2d');
        ctx.drawImage(p.canvas, 0, 0);
        [...pageObjs].sort((a, b) => a.z - b.z).forEach((o) => drawObject(ctx, o));

        const rotated = rotateCanvas(flat, pageRotations[i] || 0);
        const dataUrl = rotated.toDataURL('image/png');
        const bytes = await (await fetch(dataUrl)).arrayBuffer();
        const embedded = await pdfDoc.embedPng(bytes);
        const page = pdfDoc.addPage([rotated.width, rotated.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: rotated.width, height: rotated.height });
      }

      const bytes = await pdfDoc.save();
      setResultBytes(bytes);
      await updateDocument(bytes, { toolSlug: 'annotate-pdf', label: 'Annotated', hasTextLayer: false });
    } catch {
      setError('Something went wrong applying your annotations. Please try again.');
    }
    setBusy(false);
  }

  function downloadResult() {
    if (!resultBytes) return;
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'convertam-annotated.pdf';
    a.click();
  }

  // The 3 additional export types (alongside the primary "Annotated PDF"
  // flow above, which stays tied to the Document Session) — each is an
  // independent, instant client download that doesn't touch session state.
  async function runExport(kind) {
    setExportMenuOpen(false);
    setExportBusy(true);
    setError('');
    try {
      const documentName = file?.name || 'document.pdf';
      if (kind === 'comments-pdf') {
        await downloadCommentsOnlyPdf({ pages, pageOrder, pageRotations, objects });
      } else if (kind === 'summary-pdf') {
        await downloadReviewSummaryPdf({ documentName, objects, pageOrder });
      } else if (kind === 'summary-word') {
        await downloadReviewSummaryWord({ documentName, objects, pageOrder });
      }
    } catch (err) {
      setError(err?.message || 'That export could not be generated. Please try again.');
    }
    setExportBusy(false);
  }

  function reset() {
    setFile(null);
    setPages([]);
    setPageOrder([]);
    setPageRotations({});
    exitFullscreenIfActive();
    resetHistory([]);
    setSelectedIds(new Set());
    setEditor(null);
    setResultBytes(null);
    setError('');
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
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a PDF to annotate</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Highlight, draw, add sticky notes, shapes, stamps and signatures — right on the page.</p>
          <input type="file" accept="application/pdf" onChange={handleFileInput} />
          {loading && <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 12 }}>Loading pages…</p>}
        </div>
        {error && <div className="status error" style={{ marginTop: 12 }}>{error}</div>}
        <p className="privacy-note">Everything happens in your browser — your PDF is never uploaded to a server.</p>
      </div>
    );
  }

  const page = pages[activePage];

  const toolbarAndStage = (
    <>
      <Toolbar
        pagePosition={pagePosition}
        pageCount={pageOrder.length}
        onPrevPage={goToPrevPage}
        onNextPage={goToNextPage}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        hasSelection={selectedIds.size > 0}
        onDeleteSelected={deleteSelected}
        onDuplicateSelected={duplicateSelected}
        onClearPage={clearPage}
        activeTool={activeTool}
        onToolChange={(id) => { setActiveTool(id); setSelectedIds(new Set()); setEditor(null); }}
        onInsertImageClick={triggerImageInsert}
        shapeKind={shapeKind}
        onShapeKindChange={setShapeKind}
        highlightColor={highlightColor}
        onHighlightColorChange={setHighlightColor}
        inkColor={inkColor}
        onInkColorChange={setInkColor}
        favoriteTools={favoriteTools}
        onToggleFavoriteTool={toggleFavoriteTool}
        nextNumber={numberingCounter}
        onRestartNumbering={restartNumbering}
        onPickStampPreset={insertStampPreset}
        onUploadCustomStamp={insertCustomStamp}
        onCaptureSignature={insertSignature}
        onInsertDate={insertDate}
      />

      <Stage
        page={page}
        activePage={activePage}
        pageObjects={pageObjects}
        activeTool={activeTool}
        highlightColor={highlightColor}
        inkColor={inkColor}
        shapeKind={shapeKind}
        numberingCounter={numberingCounter}
        onNumberPlaced={incrementNumbering}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        editor={editor}
        setEditor={setEditor}
        commitPageObjects={commitPageObjects}
        deleteObjectById={deleteObjectById}
        nextId={nextId}
        nextZ={nextZ}
        rotation={pageRotations[activePage] || 0}
        onRotate={rotateActivePage}
        fullscreen={fullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </>
  );

  return (
    <div className="panel" ref={panelRef} style={fullscreen ? { background: 'white', padding: '20px 24px', overflow: 'auto', height: '100vh' } : undefined}>
      <input ref={imageFileInputRef} type="file" accept="image/*" onChange={handleImageFileChosen} style={{ display: 'none' }} />
      {fullscreen ? (
        toolbarAndStage
      ) : (
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <ThumbnailRail
            pages={pages}
            pageOrder={pageOrder}
            activePage={activePage}
            pageRotations={pageRotations}
            onSelectPage={goToPage}
            onReorder={setPageOrder}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            {toolbarAndStage}
          </div>
          <PropertiesPanel
            selectedObjects={selectedObjects}
            pageObjects={pageObjects}
            onUpdateSelected={updateSelected}
            onToggleLockSelected={toggleLockSelected}
            onToggleHideSelected={toggleHideSelected}
            onDuplicateSelected={duplicateSelected}
            onDeleteSelected={deleteSelected}
            onBringForward={() => reorderZ('forward')}
            onSendBackward={() => reorderZ('backward')}
            onBringToFront={() => reorderZ('front')}
            onSendToBack={() => reorderZ('back')}
            onAlign={alignSelected}
            onDistribute={distributeSelected}
            onSelectObjectId={selectObjectId}
            onToggleLockById={toggleLockById}
            onToggleHideById={toggleHideById}
            allObjects={objects}
            pageOrder={pageOrder}
            onJumpToObject={jumpToObject}
            onToggleResolvedById={toggleResolvedById}
          />
        </div>
      )}

      {!resultBytes ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14, alignItems: 'flex-start' }}>
          <button onClick={handleApply} disabled={busy} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: busy ? '#94A3B8' : '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: busy ? 'default' : 'pointer' }}>
            {busy ? 'Applying…' : 'Apply Annotations'}
          </button>
          <button onClick={reset} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
            Start Over
          </button>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setExportMenuOpen((v) => !v)} disabled={exportBusy} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: exportBusy ? 'default' : 'pointer' }}>
              {exportBusy ? 'Exporting…' : 'Other exports ▾'}
            </button>
            {exportMenuOpen && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.12)', minWidth: 220, zIndex: 20, overflow: 'hidden' }}>
                {[
                  { kind: 'comments-pdf', label: 'Comments only (PDF)', sub: 'Notes, text labels & callouts only' },
                  { kind: 'summary-pdf', label: 'Review Summary (PDF)', sub: 'Dashboard + every annotation, by page' },
                  { kind: 'summary-word', label: 'Review Summary (Word)', sub: 'Same summary, as an editable .docx' },
                ].map((opt) => (
                  <button key={opt.kind} onClick={() => runExport(opt.kind)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', border: 'none', borderBottom: '1px solid #F1F5F9', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{opt.sub}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <ContinueWorkingPanel toolSlug="annotate-pdf" documentName={file?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
        </div>
      )}

      {error && <div className="status error" style={{ marginTop: 12 }}>{error}</div>}
      <p className="privacy-note">Everything happens in your browser — your PDF is never uploaded to a server.</p>
    </div>
  );
}
