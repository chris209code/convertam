'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Script from 'next/script';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Corner handles are sized in canvas-pixel space but scaled up when the
// canvas is displayed smaller than its native resolution (e.g. on mobile),
// so the physical tap target stays roughly the same regardless of zoom.
function handleSize(scale) {
  return Math.max(10, 16 * scale);
}

function pointInRect(pos, r) {
  return pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h;
}

function handleAt(pos, r, scale) {
  const s = handleSize(scale);
  const corners = {
    nw: { x: r.x, y: r.y },
    ne: { x: r.x + r.w, y: r.y },
    sw: { x: r.x, y: r.y + r.h },
    se: { x: r.x + r.w, y: r.y + r.h },
  };
  for (const [name, c] of Object.entries(corners)) {
    if (Math.abs(pos.x - c.x) <= s && Math.abs(pos.y - c.y) <= s) return name;
  }
  return null;
}

function resizeRect(orig, handle, pos, page) {
  let x = orig.x, y = orig.y, x2 = orig.x + orig.w, y2 = orig.y + orig.h;
  if (handle.includes('w')) x = Math.min(pos.x, x2 - 4);
  if (handle.includes('e')) x2 = Math.max(pos.x, x + 4);
  if (handle.includes('n')) y = Math.min(pos.y, y2 - 4);
  if (handle.includes('s')) y2 = Math.max(pos.y, y + 4);
  x = clamp(x, 0, page.width);
  y = clamp(y, 0, page.height);
  x2 = clamp(x2, 0, page.width);
  y2 = clamp(y2, 0, page.height);
  return { ...orig, x, y, w: x2 - x, h: y2 - y };
}

const MODES = {
  black: {
    label: 'Black (Permanent)',
    icon: '⬛',
    fill: '#000000',
    note: '🔒 Permanent Redaction removes sensitive information from the final PDF.',
  },
  white: {
    label: 'White (Correction)',
    icon: '⬜',
    fill: '#FFFFFF',
    note: '⚠️ Whiteout hides content visually for editing purposes. It should not be used to remove confidential information.',
  },
};

export default function RedactPdfWorkspace() {
  const [file, setFile] = useState(null);
  const [pages, setPages] = useState([]); // { canvas, width, height } — image data only, never mutated after load
  const [activePage, setActivePage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('black'); // style applied to newly-drawn boxes; default is always Black per spec
  const [selectedRectId, setSelectedRectId] = useState(null);

  // history.stack[k] is a snapshot of every page's rect list at that point
  // in time; history.index is "where we are" in that timeline. Undo/redo
  // just moves the pointer — nothing is ever mutated in place, so past
  // snapshots stay intact for redo.
  const [history, setHistory] = useState({ stack: [[]], index: 0 });

  const canvasRef = useRef(null);
  const dragRef = useRef(null); // in-progress gesture: { type: 'draw'|'move'|'resize', ... }
  const liveRectRef = useRef(null); // the rect being dragged, drawn imperatively so dragging stays smooth
  const nextIdRef = useRef(1);

  const currentRects = history.stack[history.index]?.[activePage] || [];

  async function handleFile(e) {
    const f = e.target.files?.[0];
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
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        loadedPages.push({ canvas, width: viewport.width, height: viewport.height });
      }
      nextIdRef.current = 1;
      setPages(loadedPages);
      setHistory({ stack: [loadedPages.map(() => [])], index: 0 });
      setActivePage(0);
      setSelectedRectId(null);
      setMode('black');
    } catch (err) {
      console.error(err);
      setError('Could not read this PDF. Please try another file.');
    } finally {
      setLoading(false);
    }
  }

  function newId() {
    return nextIdRef.current++;
  }

  function pushRects(allPagesRects) {
    setHistory((h) => {
      const trimmed = h.stack.slice(0, h.index + 1);
      return { stack: [...trimmed, allPagesRects], index: trimmed.length };
    });
  }

  function undo() {
    setHistory((h) => (h.index > 0 ? { ...h, index: h.index - 1 } : h));
    setSelectedRectId(null);
  }
  function redo() {
    setHistory((h) => (h.index < h.stack.length - 1 ? { ...h, index: h.index + 1 } : h));
    setSelectedRectId(null);
  }
  function clearPage() {
    const allPages = history.stack[history.index].map((arr, i) => (i === activePage ? [] : arr));
    pushRects(allPages);
    setSelectedRectId(null);
  }
  function deleteSelected() {
    if (selectedRectId == null) return;
    const newRects = currentRects.filter((r) => r.id !== selectedRectId);
    const allPages = history.stack[history.index].map((arr, i) => (i === activePage ? newRects : arr));
    pushRects(allPages);
    setSelectedRectId(null);
  }

  function goToPage(next) {
    dragRef.current = null;
    liveRectRef.current = null;
    setSelectedRectId(null);
    setActivePage(next);
  }

  const drawDisplay = useCallback(() => {
    const displayCanvas = canvasRef.current;
    const page = pages[activePage];
    if (!displayCanvas || !page) return;
    displayCanvas.width = page.width;
    displayCanvas.height = page.height;
    const ctx = displayCanvas.getContext('2d');
    ctx.drawImage(page.canvas, 0, 0);

    const live = liveRectRef.current;
    const rectsToDraw = currentRects.map((r) => (live && live.id === r.id ? live : r));
    if (live && live.id == null) rectsToDraw.push(live); // an in-progress new box has no id yet

    const rectEl = displayCanvas.getBoundingClientRect();
    const scale = rectEl.width ? displayCanvas.width / rectEl.width : 1;

    rectsToDraw.forEach((r) => {
      ctx.fillStyle = MODES[r.mode]?.fill || MODES.black.fill;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      if (r.mode === 'white') {
        // A pure white box on a white page is otherwise invisible while
        // editing — this dashed outline is display-only and is never
        // baked into the exported PDF.
        ctx.save();
        ctx.strokeStyle = '#94A3B8';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1;
        ctx.strokeRect(r.x + 0.5, r.y + 0.5, Math.max(0, r.w - 1), Math.max(0, r.h - 1));
        ctx.restore();
      }
      if (r.id === selectedRectId) {
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
  }, [pages, activePage, currentRects, selectedRectId]);

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
    if (selectedRectId != null) {
      const sel = currentRects.find((r) => r.id === selectedRectId);
      if (sel) {
        const h = handleAt(pos, sel, scale);
        if (h === 'nw' || h === 'se') { canvas.style.cursor = 'nwse-resize'; return; }
        if (h === 'ne' || h === 'sw') { canvas.style.cursor = 'nesw-resize'; return; }
      }
    }
    for (let i = currentRects.length - 1; i >= 0; i--) {
      if (pointInRect(pos, currentRects[i])) { canvas.style.cursor = 'move'; return; }
    }
    canvas.style.cursor = 'crosshair';
  }

  function onPointerDown(e) {
    // Capture so a drag that leaves the canvas bounds (fast mouse movement,
    // finger sliding off the edge) still delivers move/up events here
    // instead of stranding dragRef in an unfinished gesture.
    e.target.setPointerCapture?.(e.pointerId);
    const { pos, scale } = getPosAndScale(e);

    if (selectedRectId != null) {
      const sel = currentRects.find((r) => r.id === selectedRectId);
      if (sel) {
        const h = handleAt(pos, sel, scale);
        if (h) {
          dragRef.current = { type: 'resize', id: sel.id, handle: h, orig: { ...sel } };
          liveRectRef.current = { ...sel };
          return;
        }
      }
    }

    for (let i = currentRects.length - 1; i >= 0; i--) {
      const r = currentRects[i];
      if (pointInRect(pos, r)) {
        setSelectedRectId(r.id);
        dragRef.current = { type: 'move', id: r.id, start: pos, orig: { ...r } };
        liveRectRef.current = { ...r };
        return;
      }
    }

    setSelectedRectId(null);
    dragRef.current = { type: 'draw', start: pos };
    liveRectRef.current = { id: null, x: pos.x, y: pos.y, w: 0, h: 0, mode };
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
        id: null,
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
    let newRects = currentRects;

    if (drag.type === 'draw') {
      if (live && live.w > 4 && live.h > 4) {
        const created = { ...live, id: newId() };
        newRects = [...currentRects, created];
        setSelectedRectId(created.id);
      }
    } else if (drag.type === 'move' || drag.type === 'resize') {
      const changed = live.x !== drag.orig.x || live.y !== drag.orig.y || live.w !== drag.orig.w || live.h !== drag.orig.h;
      if (changed) {
        newRects = currentRects.map((r) => (r.id === live.id ? live : r));
      }
    }

    dragRef.current = null;
    liveRectRef.current = null;

    if (newRects !== currentRects) {
      const allPages = history.stack[history.index].map((arr, i) => (i === activePage ? newRects : arr));
      pushRects(allPages);
    } else {
      drawDisplay();
    }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (selectedRectId == null) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      } else if (e.key === 'Escape') {
        setSelectedRectId(null);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedRectId, activePage, history]);

  async function handleDownload() {
    setBusy(true);
    try {
      const { PDFDocument } = await import('pdf-lib');
      const pdfDoc = await PDFDocument.create();
      const snapshot = history.stack[history.index];

      for (let i = 0; i < pages.length; i++) {
        const p = pages[i];
        const rects = snapshot[i] || [];
        // Bake the boxes into the actual pixels, then rebuild the page as a
        // flattened image — this is what makes black redaction real: there's
        // no text layer left underneath to select or copy. White boxes are
        // flattened the same way for a clean, permanent correction area.
        const flat = document.createElement('canvas');
        flat.width = p.width;
        flat.height = p.height;
        const ctx = flat.getContext('2d');
        ctx.drawImage(p.canvas, 0, 0);
        rects.forEach((r) => {
          ctx.fillStyle = MODES[r.mode]?.fill || MODES.black.fill;
          ctx.fillRect(r.x, r.y, r.w, r.h);
        });

        const dataUrl = flat.toDataURL('image/png');
        const bytes = await (await fetch(dataUrl)).arrayBuffer();
        const embedded = await pdfDoc.embedPng(bytes);
        const page = pdfDoc.addPage([p.width, p.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: p.width, height: p.height });
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = (file?.name || 'document').replace(/\.pdf$/i, '') + '-redacted.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  const totalRects = history.stack[history.index].reduce((sum, arr) => sum + arr.length, 0);
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;

  if (!file || pages.length === 0) {
    return (
      <div className="panel">
        <div style={{ border: '2px dashed #CBD5E1', borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" />
          <p style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Upload a PDF to redact</p>
          <p style={{ fontSize: '0.82rem', color: '#64748B', marginBottom: 16 }}>Draw black boxes to permanently remove anything sensitive, or white boxes to cover up mistakes for editing. It's genuinely removed, not just covered up.</p>
          <input type="file" accept="application/pdf" onChange={handleFile} />
          {loading && <p style={{ fontSize: '0.82rem', color: '#64748B', marginTop: 12 }}>Loading pages…</p>}
          {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
        </div>
      </div>
    );
  }

  const activeModeInfo = MODES[mode];

  return (
    <div className="panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => goToPage(Math.max(0, activePage - 1))} disabled={activePage === 0} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Page {activePage + 1} of {pages.length}</span>
          <button onClick={() => goToPage(Math.min(pages.length - 1, activePage + 1))} disabled={activePage === pages.length - 1} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>→</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={undo} disabled={!canUndo} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: canUndo ? 'pointer' : 'default', fontSize: '0.8rem', fontWeight: 600, opacity: canUndo ? 1 : 0.5 }}>↶ Undo</button>
          <button onClick={redo} disabled={!canRedo} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: canRedo ? 'pointer' : 'default', fontSize: '0.8rem', fontWeight: 600, opacity: canRedo ? 1 : 0.5 }}>↷ Redo</button>
          <button onClick={deleteSelected} disabled={selectedRectId == null} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #FECACA', background: selectedRectId == null ? 'white' : '#FEF2F2', color: '#DC2626', cursor: selectedRectId == null ? 'default' : 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: selectedRectId == null ? 0.5 : 1 }}>🗑 Delete Selected</button>
          <button onClick={clearPage} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Clear Page</button>
        </div>
      </div>

      <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: '12px 14px', marginBottom: 14, background: '#F8FAFC' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: 8 }}>Redaction Style</div>
        <div role="radiogroup" aria-label="Redaction style" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
          {Object.entries(MODES).map(([key, info]) => (
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

      <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>Drag on the page to draw a new box in the selected style. Click an existing box to move it, drag its corners to resize, or press Delete to remove it.</p>

      <div style={{ display: 'flex', justifyContent: 'center', background: '#F1F5F9', borderRadius: 12, padding: 16, marginBottom: 20, overflow: 'auto' }}>
        <canvas
          ref={canvasRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={{ maxWidth: '100%', cursor: 'crosshair', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', touchAction: 'none' }}
        />
      </div>

      <button onClick={handleDownload} disabled={busy || totalRects === 0} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: (busy || totalRects === 0) ? '#94A3B8' : '#DC2626', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: (busy || totalRects === 0) ? 'default' : 'pointer' }}>
        {busy ? 'Applying redactions…' : `⬇ Download Redacted PDF (${totalRects} box${totalRects === 1 ? '' : 'es'} across all pages)`}
      </button>

      <p className="privacy-note">Your document is processed entirely in your browser — never uploaded to a server.</p>
    </div>
  );
}
