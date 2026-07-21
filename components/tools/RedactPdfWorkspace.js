'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Script from 'next/script';
import TextBox from './redact-edit/TextBox';
import { FONT_OPTIONS, DEFAULT_TEXT_STYLE } from './redact-edit/constants';
import { sampleStyleNear, sampleColorAt } from './redact-edit/fontMatch';
import { drawTextObjectToCanvas } from './redact-edit/renderText';
import { clamp, handleSize, pointInRect, handleAt, resizeRect } from './redact-edit/geometry';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import ContinueWorkingPanel from '@/components/workspace/ContinueWorkingPanel';
import WorkspaceStatusPanel from '@/components/workspace/WorkspaceStatusPanel';

const RENDER_SCALE = 1.5;

const REDACT_MODES = {
  black: {
    label: 'Black (Permanent)',
    icon: '⬛',
    fill: '#000000',
    note: '🔒 Permanent Redaction removes sensitive information from the exported PDF.',
  },
  white: {
    label: 'White (Correction)',
    icon: '⬜',
    fill: '#FFFFFF',
    note: '⚠️ Whiteout is for correcting visible content. It should not be used for securely removing confidential information.',
  },
};

function toolBtnStyle(active) {
  return {
    display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9,
    border: '1px solid', borderColor: active ? '#2563EB' : '#E2E8F0', background: active ? '#EFF6FF' : 'white',
    color: active ? '#1D4ED8' : '#334155', fontWeight: active ? 700 : 600, cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.82rem',
  };
}
function smallBtn(active, danger) {
  return {
    padding: '6px 10px', borderRadius: 7, border: '1px solid', borderColor: danger ? '#FECACA' : (active ? '#2563EB' : '#E2E8F0'),
    background: danger ? (active ? '#FEE2E2' : '#FEF2F2') : (active ? '#EFF6FF' : 'white'),
    color: danger ? '#DC2626' : (active ? '#1D4ED8' : '#334155'), cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.78rem', fontWeight: 600,
  };
}

export default function RedactPdfWorkspace() {
  const { session, startSession, updateDocument, endSession, getDocumentAsFile, restoreOriginal } = useDocumentSession();
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // { canvas, width, height, textContent } — immutable after load
  const [activePage, setActivePage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resultBytes, setResultBytes] = useState(null); // set once "Apply Changes" runs; cleared by any further edit

  const [activeTool, setActiveTool] = useState('redact'); // 'redact' | 'text'
  const [mode, setMode] = useState('black'); // redaction sub-style, default Black per spec
  const [styleMode, setStyleMode] = useState('auto'); // 'auto' | 'custom' text style source
  const [customStyle, setCustomStyle] = useState(DEFAULT_TEXT_STYLE);
  const [eyedropperActive, setEyedropperActive] = useState(false);
  const [selected, setSelected] = useState(null); // { id, type }
  const [editingTextId, setEditingTextId] = useState(null);
  const [displayScale, setDisplayScale] = useState(1);

  // history.stack[k][pageIndex] = ordered array of objects (rects + texts)
  // for that page at that point in time. Undo/redo just moves the pointer;
  // nothing is mutated in place, so redo always has somewhere to go back to.
  const [history, setHistory] = useState({ stack: [[]], index: 0 });

  const canvasRef = useRef(null);
  const stageWrapperRef = useRef(null);
  const dragRef = useRef(null);
  const liveRectRef = useRef(null);
  const nextIdRef = useRef(1);

  const currentObjects = history.stack[history.index]?.[activePage] || [];
  const rects = currentObjects.filter((o) => o.type === 'rect');
  const texts = currentObjects.filter((o) => o.type === 'text');

  // Shared loader: a fresh upload and a document pulled from an active
  // Document Session both land here. `fromSession` skips re-registering the
  // session (it's already the source of truth) and confirms before
  // replacing an active session that has undownloaded work behind it.
  async function loadPdfIntoWorkspace(f, { fromSession = false } = {}) {
    if (!f) return;
    if (!window.pdfjsLib) {
      setError('Still loading — please wait a moment and try again.');
      return;
    }
    setFile(f);
    setLoading(true);
    setError('');
    try {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const buf = await f.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      const loadedPages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: RENDER_SCALE });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        let textContent = null;
        try { textContent = await page.getTextContent(); } catch { /* scanned/broken text layer — smart matching just won't fire */ }
        loadedPages.push({ canvas, width: viewport.width, height: viewport.height, textContent });
      }
      nextIdRef.current = 1;
      setPages(loadedPages);
      setHistory({ stack: [loadedPages.map(() => [])], index: 0 });
      setActivePage(0);
      setSelected(null);
      setEditingTextId(null);
      setActiveTool('redact');
      setMode('black');
      setResultBytes(null);
      if (!fromSession) {
        const hasUndownloadedWork = session.status === 'active' && session.history.length > 0;
        if (!hasUndownloadedWork || window.confirm('Starting with this document will replace the document currently in your session. Continue?')) {
          startSession(f, { toolSlug: 'redact-pdf' });
        }
      }
    } catch (err) {
      console.error(err);
      setError('Could not read this PDF. Please try another file.');
    } finally {
      setLoading(false);
    }
  }

  async function handleFile(e) {
    const f = e.target.files?.[0];
    await loadPdfIntoWorkspace(f);
  }

  async function continueWithSessionDocument() {
    const f = getDocumentAsFile();
    await loadPdfIntoWorkspace(f, { fromSession: true });
  }

  async function handleRestoreOriginal() {
    const f = await restoreOriginal();
    if (f) await loadPdfIntoWorkspace(f, { fromSession: true });
  }

  function handleCloseWorkspace() {
    endSession();
    setFile(null);
    setPages([]);
    setHistory({ stack: [[]], index: 0 });
    setActivePage(0);
    setSelected(null);
    setEditingTextId(null);
    setResultBytes(null);
    setError('');
  }

  function newId() {
    return nextIdRef.current++;
  }

  function commitObjects(newObjects) {
    const snapshot = history.stack[history.index];
    if (newObjects === snapshot[activePage]) return;
    const allPages = snapshot.map((arr, i) => (i === activePage ? newObjects : arr));
    setHistory((h) => {
      const trimmed = h.stack.slice(0, h.index + 1);
      return { stack: [...trimmed, allPages], index: trimmed.length };
    });
    // Any further edit invalidates a previously-applied result, so the
    // Continue Working panel can't hand off stale bytes.
    setResultBytes(null);
  }

  function undo() {
    setHistory((h) => (h.index > 0 ? { ...h, index: h.index - 1 } : h));
    setSelected(null);
    setEditingTextId(null);
    setResultBytes(null);
  }
  function redo() {
    setHistory((h) => (h.index < h.stack.length - 1 ? { ...h, index: h.index + 1 } : h));
    setSelected(null);
    setEditingTextId(null);
    setResultBytes(null);
  }
  function clearPage() {
    commitObjects([]);
    setSelected(null);
    setEditingTextId(null);
  }
  function deleteSelected() {
    if (!selected) return;
    commitObjects(currentObjects.filter((o) => o.id !== selected.id));
    setSelected(null);
    setEditingTextId(null);
  }
  function duplicateSelected() {
    if (!selected) return;
    const obj = currentObjects.find((o) => o.id === selected.id);
    if (!obj) return;
    const copy = { ...obj, id: newId(), x: obj.x + 18, y: obj.y + 18 };
    commitObjects([...currentObjects, copy]);
    setSelected({ id: copy.id, type: copy.type });
  }

  function goToPage(next) {
    dragRef.current = null;
    liveRectRef.current = null;
    setSelected(null);
    setEditingTextId(null);
    setActivePage(next);
  }

  // Formatting controls edit whatever text object is currently selected;
  // with nothing selected, they instead edit the "next new object" defaults
  // (customStyle), used when styleMode is 'custom'.
  function applyStylePatch(patch) {
    if (selected?.type === 'text') {
      commitObjects(currentObjects.map((o) => (o.id === selected.id ? { ...o, ...patch } : o)));
    } else {
      setCustomStyle((prev) => ({ ...prev, ...patch }));
    }
  }
  function rotateSelected(delta) {
    if (selected?.type !== 'text') return;
    commitObjects(currentObjects.map((o) => (o.id === selected.id ? { ...o, rotation: (o.rotation || 0) + delta } : o)));
  }

  function createTextAt(pos) {
    const page = pages[activePage];
    const base = styleMode === 'custom' ? customStyle : DEFAULT_TEXT_STYLE;
    const guess = styleMode === 'auto' ? sampleStyleNear(pos, page.textContent, page.canvas, page.height, RENDER_SCALE) : null;
    const style = { ...base, ...(guess || {}) };
    const w = 260;
    const h = Math.max(34, style.fontSizePx * 1.6);
    const id = newId();
    const obj = {
      id, type: 'text',
      x: pos.x, y: pos.y - h / 2, w, h,
      rotation: 0, text: '',
      ...style,
    };
    commitObjects([...currentObjects, obj]);
    setSelected({ id, type: 'text' });
    setEditingTextId(id);
  }

  function handleTextCommit(id, text, extraPatch) {
    const obj = currentObjects.find((o) => o.id === id);
    if (!obj) { setEditingTextId(null); return; }
    if (!text.trim()) {
      commitObjects(currentObjects.filter((o) => o.id !== id));
      setSelected(null);
      setEditingTextId(null);
      return;
    }
    const changed = obj.text !== text || (extraPatch && extraPatch.h !== obj.h);
    if (changed) {
      commitObjects(currentObjects.map((o) => (o.id === id ? { ...o, text, ...(extraPatch || {}) } : o)));
    }
    setEditingTextId(null);
  }
  function handleTextTransformCommit(id, patch) {
    commitObjects(currentObjects.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  // ---------------- Responsive scale: canvas + text overlay share one
  // page-space coordinate system, fitted to the available width via a CSS
  // transform on their shared parent (see the stage markup below).
  useEffect(() => {
    function recompute() {
      const page = pages[activePage];
      const wrapper = stageWrapperRef.current;
      if (!page || !wrapper) return;
      const available = Math.max(120, wrapper.clientWidth - 32);
      setDisplayScale(Math.min(1, Math.max(0.15, available / page.width)));
    }
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, [pages, activePage]);

  // ---------------- Redaction rect canvas rendering & pointer handling
  const drawDisplay = useCallback(() => {
    const displayCanvas = canvasRef.current;
    const page = pages[activePage];
    if (!displayCanvas || !page) return;
    const ctx = displayCanvas.getContext('2d');
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(page.canvas, 0, 0);

    const live = liveRectRef.current;
    const rectsToDraw = rects.map((r) => (live && live.id === r.id ? live : r));
    if (live && live.id == null) rectsToDraw.push(live);

    // handleSize wants "canvas px per screen px" (grows as the page is
    // scaled down further), which is the inverse of displayScale — not
    // displayScale itself.
    const scale = displayScale ? 1 / displayScale : 1;

    rectsToDraw.forEach((r) => {
      ctx.fillStyle = REDACT_MODES[r.mode]?.fill || REDACT_MODES.black.fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (r.mode === 'white') {
        ctx.save();
        ctx.strokeStyle = '#94A3B8';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, Math.max(0, r.w - 1), Math.max(0, r.h - 1));
        ctx.restore();
      }
      if (selected?.type === 'rect' && r.id === selected.id) {
        ctx.save();
        ctx.strokeStyle = '#2563EB';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.setLineDash([]);
        const s = handleSize(scale);
        ctx.fillStyle = '#2563EB';
        [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(([cx, cy]) => {
          ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
        });
        ctx.restore();
      }
    });
  }, [pages, activePage, rects, selected, displayScale]);

  useEffect(() => { drawDisplay(); }, [drawDisplay]);

  function getPosAndScale(e) {
    const rectEl = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rectEl.width;
    const scaleY = canvasRef.current.height / rectEl.height;
    return { pos: { x: (e.clientX - rectEl.left) * scaleX, y: (e.clientY - rectEl.top) * scaleY }, scale: scaleX };
  }

  function updateHoverCursor(pos, scale) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (eyedropperActive) { canvas.style.cursor = 'crosshair'; return; }
    if (activeTool === 'text') { canvas.style.cursor = 'text'; return; }
    if (selected?.type === 'rect') {
      const sel = rects.find((r) => r.id === selected.id);
      if (sel) {
        const h = handleAt(pos, sel, scale);
        if (h === 'nw' || h === 'se') { canvas.style.cursor = 'nwse-resize'; return; }
        if (h === 'ne' || h === 'sw') { canvas.style.cursor = 'nesw-resize'; return; }
      }
    }
    for (let i = rects.length - 1; i >= 0; i--) {
      if (pointInRect(pos, rects[i])) { canvas.style.cursor = 'move'; return; }
    }
    canvas.style.cursor = 'crosshair';
  }

  function onPointerDown(e) {
    const { pos, scale } = getPosAndScale(e);

    if (eyedropperActive) {
      const src = pages[activePage].canvas;
      const color = sampleColorAt(src, pos.x, pos.y);
      applyStylePatch({ color });
      setEyedropperActive(false);
      return;
    }

    if (activeTool === 'text') {
      createTextAt(pos);
      return;
    }

    if (selected?.type === 'rect') {
      const sel = rects.find((r) => r.id === selected.id);
      if (sel) {
        const h = handleAt(pos, sel, scale);
        if (h) {
          dragRef.current = { type: 'resize', id: sel.id, handle: h, orig: { ...sel } };
          liveRectRef.current = { ...sel };
          return;
        }
      }
    }

    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (pointInRect(pos, r)) {
        setSelected({ id: r.id, type: 'rect' });
        dragRef.current = { type: 'move', id: r.id, start: pos, orig: { ...r } };
        liveRectRef.current = { ...r };
        return;
      }
    }

    setSelected(null);
    dragRef.current = { type: 'draw', start: pos };
    liveRectRef.current = { id: null, type: 'rect', x: pos.x, y: pos.y, w: 0, h: 0, mode };
  }

  function onPointerMove(e) {
    const { pos, scale } = getPosAndScale(e);
    const drag = dragRef.current;
    if (!drag) {
      updateHoverCursor(pos, scale);
      return;
    }
    const page = pages[activePage];
    if (drag.type === 'draw') {
      liveRectRef.current = {
        id: null, type: 'rect',
        x: Math.min(drag.start.x, pos.x),
        y: Math.min(drag.start.y, pos.y),
        w: Math.abs(pos.x - drag.start.x),
        h: Math.abs(pos.y - drag.start.y),
        mode,
      };
    } else if (drag.type === 'move') {
      const dx = pos.x - drag.start.x;
      const dy = pos.y - drag.start.y;
      liveRectRef.current = {
        ...drag.orig,
        x: clamp(drag.orig.x + dx, 0, Math.max(0, page.width - drag.orig.w)),
        y: clamp(drag.orig.y + dy, 0, Math.max(0, page.height - drag.orig.h)),
      };
    } else if (drag.type === 'resize') {
      liveRectRef.current = resizeRect(drag.orig, drag.handle, pos, page);
    }
    drawDisplay();
  }

  function onPointerUp() {
    const drag = dragRef.current;
    if (!drag) return;
    const live = liveRectRef.current;
    let newRects = rects;

    if (drag.type === 'draw') {
      if (live && live.w > 4 && live.h > 4) {
        const created = { ...live, id: newId() };
        newRects = [...rects, created];
        setSelected({ id: created.id, type: 'rect' });
      }
    } else if (drag.type === 'move' || drag.type === 'resize') {
      const changed = live.x !== drag.orig.x || live.y !== drag.orig.y || live.w !== drag.orig.w || live.h !== drag.orig.h;
      if (changed) newRects = rects.map((r) => (r.id === live.id ? live : r));
    }

    dragRef.current = null;
    liveRectRef.current = null;

    if (newRects !== rects) {
      commitObjects([...newRects, ...texts]);
    } else {
      drawDisplay();
    }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (selected == null) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape') {
        setSelected(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, activePage, history]);

  // Rasterizes every page (redactions + text) into a fresh PDF, then hands
  // the result to the Document Session instead of downloading immediately —
  // Continue Working or Download becomes an explicit choice (see
  // ContinueWorkingPanel below). Redaction rasterizes the page, so the
  // resulting document no longer has a real text layer.
  async function handleApply() {
    setBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const snapshot = history.stack[history.index];

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const objects = snapshot[i] || [];
        const pageRects = objects.filter((o) => o.type === 'rect');
        const pageTexts = objects.filter((o) => o.type === 'text');

        const flat = document.createElement('canvas');
        flat.width = p.width;
        flat.height = p.height;
        const ctx = flat.getContext('2d');
        ctx.drawImage(p.canvas, 0, 0);
        pageRects.forEach((r) => {
          ctx.fillStyle = REDACT_MODES[r.mode]?.fill || REDACT_MODES.black.fill;
          ctx.fillRect(r.x, r.y, r.w, r.h);
        });
        // Text always renders above redaction boxes, matching the editor —
        // covering up your own just-typed correction would defeat typing it.
        pageTexts.forEach((t) => drawTextObjectToCanvas(ctx, t));

        const dataUrl = flat.toDataURL('image/png');
        const bytes = await (await fetch(dataUrl)).arrayBuffer();
        const embedded = await pdfDoc.embedPng(bytes);
        const page = pdfDoc.addPage([p.width, p.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: p.width, height: p.height });
      }

      const bytes = await pdfDoc.save();
      setResultBytes(bytes);
      await updateDocument(bytes, { toolSlug: 'redact-pdf', label: 'Redacted / Edited', hasTextLayer: false });
    } finally {
      setBusy(false);
    }
  }

  // Downloading exports the current document but does not end the
  // workspace — the session stays active until the user closes it, starts a
  // new document, or discards it (see WorkspaceStatusPanel's Close Workspace).
  function downloadResult() {
    if (!resultBytes) return;
    const blob = new Blob([resultBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = (file?.name || 'document').replace(/\.pdf$/i, '') + '-edited.pdf';
    link.click();
    URL.revokeObjectURL(url);
  }

  const totalObjects = history.stack[history.index].reduce((sum, arr) => sum + arr.length, 0);
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  if (!file || pages.length === 0) {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />
          {session.status === 'active' && session.document && (
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 16px', marginBottom: 18, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
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
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a PDF to redact or correct</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Black out anything sensitive to permanently remove it, or whiteout a mistake and type the correction right on the page. It's genuinely removed, not just covered up.</p>
          <input type="file" accept="application/pdf" onChange={handleFile} />
          {loading && <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 12 }}>Loading pages…</p>}
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  const page = pages[activePage];
  const selectedObj = selected ? currentObjects.find((o) => o.id === selected.id) : null;
  const activeModeInfo = REDACT_MODES[mode];
  const panelStyle = selected?.type === 'text' ? selectedObj : customStyle;

  return (
    <div className="panel">
      <WorkspaceStatusPanel onRestoreOriginal={handleRestoreOriginal} onClose={handleCloseWorkspace} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => goToPage(Math.max(0, activePage - 1))} disabled={activePage === 0} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Page {activePage + 1} of {pages.length}</span>
          <button onClick={() => goToPage(Math.min(pages.length - 1, activePage + 1))} disabled={activePage === pages.length - 1} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>→</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={undo} disabled={!canUndo} style={{ ...smallBtn(false), opacity: canUndo ? 1 : 0.5, cursor: canUndo ? 'pointer' : 'default' }}>↶ Undo</button>
          <button onClick={redo} disabled={!canRedo} style={{ ...smallBtn(false), opacity: canRedo ? 1 : 0.5, cursor: canRedo ? 'pointer' : 'default' }}>↷ Redo</button>
          <button onClick={duplicateSelected} disabled={!selected} style={{ ...smallBtn(false), opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'default' }}>⧉ Duplicate</button>
          <button onClick={deleteSelected} disabled={!selected} style={{ ...smallBtn(false, true), opacity: selected ? 1 : 0.5, cursor: selected ? 'pointer' : 'default' }}>🗑 Delete Selected</button>
          <button onClick={clearPage} style={smallBtn(false)}>Clear Page</button>
        </div>
      </div>

      <div role="tablist" aria-label="Editing tool" style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button role="tab" aria-selected={activeTool === 'redact'} style={toolBtnStyle(activeTool === 'redact')} onClick={() => { setActiveTool('redact'); setEyedropperActive(false); }}>⬛ Redact</button>
        <button role="tab" aria-selected={activeTool === 'text'} style={toolBtnStyle(activeTool === 'text')} onClick={() => setActiveTool('text')}>🅰 Text</button>
      </div>

      {activeTool === 'redact' && (
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', marginBottom: 14, background: '#F8FAFC' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>Redaction Style</div>
          <div role="radiogroup" aria-label="Redaction style" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
            {Object.entries(REDACT_MODES).map(([key, info]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', fontWeight: 600, color: mode === key ? '#0F172A' : '#64748B', cursor: 'pointer' }}>
                <input type="radio" name="redact-mode" checked={mode === key} onChange={() => setMode(key)} />
                {info.icon} {info.label}
              </label>
            ))}
          </div>
          <p style={{ fontSize: '0.76rem', color: mode === 'black' ? '#334155' : '#92400E', background: mode === 'black' ? '#EEF2FF' : '#FFFBEB', border: `1px solid ${mode === 'black' ? '#C7D2FE' : '#FDE68A'}`, borderRadius: 8, padding: '8px 10px', margin: 0 }}>
            {activeModeInfo.note}
          </p>
        </div>
      )}

      {activeTool === 'text' && (
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', marginBottom: 14, background: '#F8FAFC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <div role="radiogroup" aria-label="Text style source" style={{ display: 'flex', gap: 6 }}>
              <button style={smallBtn(styleMode === 'auto')} onClick={() => setStyleMode('auto')}>✨ Match Nearby Text</button>
              <button style={smallBtn(styleMode === 'custom')} onClick={() => setStyleMode('custom')}>🎨 Custom Style</button>
            </div>
            <button
              style={{ ...smallBtn(eyedropperActive), display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => setEyedropperActive((v) => !v)}
              title="Sample a color from the page"
            >💧 Eyedropper</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <select
              value={panelStyle?.fontFamily || 'sans'}
              onChange={(e) => applyStylePatch({ fontFamily: e.target.value })}
              style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit' }}
            >
              {FONT_OPTIONS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button style={smallBtn(false)} onClick={() => applyStylePatch({ fontSizePx: Math.max(8, (panelStyle?.fontSizePx || 24) - 2) })}>A−</button>
              <span style={{ fontSize: '0.78rem', minWidth: 28, textAlign: 'center', fontWeight: 600 }}>{panelStyle?.fontSizePx || 24}</span>
              <button style={smallBtn(false)} onClick={() => applyStylePatch({ fontSizePx: Math.min(120, (panelStyle?.fontSizePx || 24) + 2) })}>A+</button>
            </div>

            <button style={smallBtn(panelStyle?.bold)} onClick={() => applyStylePatch({ bold: !panelStyle?.bold })}><b>B</b></button>
            <button style={smallBtn(panelStyle?.italic)} onClick={() => applyStylePatch({ italic: !panelStyle?.italic })}><i>I</i></button>
            <button style={smallBtn(panelStyle?.underline)} onClick={() => applyStylePatch({ underline: !panelStyle?.underline })}><u>U</u></button>

            <input
              type="color"
              value={panelStyle?.color || '#111827'}
              onChange={(e) => applyStylePatch({ color: e.target.value })}
              style={{ width: 32, height: 30, borderRadius: 6, border: '1px solid #E2E8F0', cursor: 'pointer', padding: 0 }}
              title="Text color"
            />

            <div style={{ display: 'flex', gap: 2 }}>
              {['left', 'center', 'right'].map((a) => (
                <button key={a} style={smallBtn(panelStyle?.align === a)} onClick={() => applyStylePatch({ align: a })}>
                  {a === 'left' ? '⟸' : a === 'center' ? '↔' : '⟹'}
                </button>
              ))}
            </div>

            {selected?.type === 'text' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button style={smallBtn(false)} onClick={() => rotateSelected(-15)} title="Rotate left">⟲</button>
                <span style={{ fontSize: '0.78rem', minWidth: 34, textAlign: 'center' }}>{selectedObj?.rotation || 0}°</span>
                <button style={smallBtn(false)} onClick={() => rotateSelected(15)} title="Rotate right">⟳</button>
              </div>
            )}
          </div>

          <p style={{ fontSize: '0.76rem', color: '#334155', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 8, padding: '8px 10px', margin: 0 }}>
            {styleMode === 'auto'
              ? '✨ Click anywhere to add text — we\'ll try to match the size, font, and color of nearby text. When no reliable match is found (scanned pages, unusual fonts), we use a close approximation instead.'
              : '🎨 Click anywhere to add text using the custom style set above.'}
            {selected?.type !== 'text' ? ' These controls set the style for the next text you add.' : ' Editing the selected text box.'}
          </p>
        </div>
      )}

      <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>
        {activeTool === 'redact'
          ? 'Drag on the page to draw a new box in the selected style. Click an existing box to move it, drag its corners to resize, or press Delete to remove it.'
          : 'Click anywhere to add text. Double-click a text box to edit it, drag to move, use the corner handles to resize, or the top handle to rotate.'}
      </p>

      <div
        ref={stageWrapperRef}
        onPointerDownCapture={(e) => {
          // A bare <canvas> (or another text box) doesn't steal DOM focus on
          // click, so without this a textarea being edited can stay focused
          // — and its draft un-committed — while a new object gets created
          // underneath it. Force any in-progress edit to commit first,
          // before the click's own handler runs.
          const active = document.activeElement;
          if (active && active.tagName === 'TEXTAREA' && active !== e.target) active.blur();
        }}
        style={{ display: 'flex', justifyContent: 'center', background: '#F1F5F9', borderRadius: 12, padding: 16, marginBottom: 20, overflow: 'auto' }}
      >
        <div style={{ width: page.width * displayScale, height: page.height * displayScale, flexShrink: 0 }}>
          <div style={{ width: page.width, height: page.height, transform: `scale(${displayScale})`, transformOrigin: 'top left', position: 'relative', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            <canvas
              ref={canvasRef}
              width={page.width}
              height={page.height}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              style={{ display: 'block', width: page.width, height: page.height, touchAction: 'none' }}
            />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {texts.map((t) => (
                <TextBox
                  key={t.id}
                  obj={t}
                  scale={displayScale}
                  isSelected={selected?.type === 'text' && selected.id === t.id}
                  isEditing={editingTextId === t.id}
                  onSelect={() => setSelected({ id: t.id, type: 'text' })}
                  onStartEdit={() => setEditingTextId(t.id)}
                  onCommitText={(text, patch) => handleTextCommit(t.id, text, patch)}
                  onCommitTransform={(patch) => handleTextTransformCommit(t.id, patch)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {!resultBytes ? (
        <button onClick={handleApply} disabled={busy || totalObjects === 0} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: (busy || totalObjects === 0) ? '#94A3B8' : '#DC2626', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: (busy || totalObjects === 0) ? 'default' : 'pointer', fontFamily: 'inherit' }}>
          {busy ? 'Applying changes…' : `Apply Changes (${totalObjects} item${totalObjects === 1 ? '' : 's'} across all pages)`}
        </button>
      ) : (
        <>
          <ContinueWorkingPanel toolSlug="redact-pdf" documentName={file?.name || 'document.pdf'} onDownload={downloadResult} downloading={busy} />
          <button onClick={() => setResultBytes(null)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#64748B', fontSize: '0.78rem', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
            ← Keep editing
          </button>
        </>
      )}

      <p className="privacy-note">Your document is processed entirely in your browser — never uploaded to a server.</p>
    </div>
  );
}
