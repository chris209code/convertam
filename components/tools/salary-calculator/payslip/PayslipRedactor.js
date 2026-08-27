'use client';

// Interactive redaction editor — draw/move/resize/delete rectangular boxes
// over any page of the uploaded payslip before it's processed. Applying
// redactions FLATTENS them: flattenPages() below draws solid black
// rectangles directly into a brand-new canvas's pixel data and returns
// that, never the original. Nothing downstream of this component ever
// sees the original pixels under a redacted area again — this is a real
// permanent edit, not a CSS overlay sitting on top of the original image.
import { useMemo, useRef, useState } from 'react';

const HANDLE_SIZE = 10;

// Draws every page's boxes as opaque black rectangles onto a fresh copy of
// that page's canvas. Called once, when the user is done redacting — the
// result is what every downstream step (OCR, AI fallback) receives.
export function flattenPages(pages, boxesByPage) {
  return pages.map((page, i) => {
    const boxes = boxesByPage[i] || [];
    if (!boxes.length) return page.canvas; // nothing redacted on this page — pass the original through unchanged
    const out = document.createElement('canvas');
    out.width = page.width;
    out.height = page.height;
    const ctx = out.getContext('2d');
    ctx.drawImage(page.canvas, 0, 0);
    ctx.fillStyle = '#000000';
    for (const b of boxes) ctx.fillRect(b.x, b.y, b.w, b.h);
    return out;
  });
}

function normalizeBox(b) {
  const x = Math.min(b.x, b.x + b.w);
  const y = Math.min(b.y, b.y + b.h);
  return { ...b, x, y, w: Math.abs(b.w), h: Math.abs(b.h) };
}

export default function PayslipRedactor({ pages, onCancel, onApply }) {
  const [boxesByPage, setBoxesByPage] = useState(() => pages.map(() => []));
  const [activePage, setActivePage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const dragRef = useRef(null); // { mode: 'draw'|'move'|'resize', boxId, startX, startY, orig }
  const nextIdRef = useRef(1);
  const containerRef = useRef(null);

  const page = pages[activePage];
  const boxes = boxesByPage[activePage] || [];
  const totalBoxes = boxesByPage.reduce((n, arr) => n + arr.length, 0);

  // Rendered once per (page, size) — cheap enough for a document this
  // short, and avoids keeping a second live canvas in sync on every render.
  const dataUrl = useMemo(() => page.canvas.toDataURL(), [page]);

  function setPageBoxes(updater) {
    setBoxesByPage((prev) => {
      const next = [...prev];
      next[activePage] = updater(next[activePage] || []);
      return next;
    });
  }

  function toNatural(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }

  function handleMouseDown(e) {
    const { x, y } = toNatural(e.clientX, e.clientY);
    // Resize handle hit-test (bottom-right corner of the selected box).
    if (selectedId != null) {
      const b = boxes.find((bx) => bx.id === selectedId);
      if (b) {
        const hx = b.x + b.w, hy = b.y + b.h;
        if (Math.abs(x - hx) * zoom < HANDLE_SIZE && Math.abs(y - hy) * zoom < HANDLE_SIZE) {
          dragRef.current = { mode: 'resize', boxId: selectedId, orig: { ...b } };
          return;
        }
      }
    }
    // Existing box hit-test (topmost first) — start a move.
    for (let i = boxes.length - 1; i >= 0; i--) {
      const b = boxes[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        setSelectedId(b.id);
        dragRef.current = { mode: 'move', boxId: b.id, startX: x, startY: y, orig: { ...b } };
        return;
      }
    }
    // Empty space — start drawing a new box.
    setSelectedId(null);
    const id = nextIdRef.current++;
    const newBox = { id, x, y, w: 0, h: 0 };
    setPageBoxes((prev) => [...prev, newBox]);
    dragRef.current = { mode: 'draw', boxId: id, startX: x, startY: y };
    setSelectedId(id);
  }

  function handleMouseMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = toNatural(e.clientX, e.clientY);
    setPageBoxes((prev) => prev.map((b) => {
      if (b.id !== drag.boxId) return b;
      if (drag.mode === 'draw') return { ...b, w: x - drag.startX, h: y - drag.startY };
      if (drag.mode === 'move') return { ...b, x: drag.orig.x + (x - drag.startX), y: drag.orig.y + (y - drag.startY) };
      if (drag.mode === 'resize') return { ...b, w: Math.max(4, x - drag.orig.x), h: Math.max(4, y - drag.orig.y) };
      return b;
    }));
  }

  function handleMouseUp() {
    // Captured once into a local — React may invoke a state updater
    // function more than once for the same call, so the updater below must
    // never re-read the mutable ref itself (it could already be cleared to
    // null by the time a second invocation runs).
    const drag = dragRef.current;
    if (drag?.mode === 'draw') {
      // Drop a box that never grew past a click (accidental single click).
      setPageBoxes((prev) => {
        const b = prev.find((bx) => bx.id === drag.boxId);
        if (b && Math.abs(b.w) < 4 && Math.abs(b.h) < 4) return prev.filter((bx) => bx.id !== b.id);
        return prev.map((bx) => (bx.id === b?.id ? normalizeBox(bx) : bx));
      });
    }
    dragRef.current = null;
  }

  function deleteBox(id) {
    setPageBoxes((prev) => prev.filter((b) => b.id !== id));
    setSelectedId(null);
  }

  function handleApply() {
    const normalized = boxesByPage.map((arr) => arr.map(normalizeBox).filter((b) => b.w >= 4 && b.h >= 4));
    onApply(flattenPages(pages, normalized));
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
          Draw a box over anything you want hidden. Click a box to select it, drag its bottom-right corner to resize, or click the × to remove it.
        </div>
        {pages.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
            <button className="sal2-ghost-btn" disabled={activePage === 0} onClick={() => { setActivePage((p) => p - 1); setSelectedId(null); }}>‹ Prev</button>
            <span>Page {activePage + 1} of {pages.length}</span>
            <button className="sal2-ghost-btn" disabled={activePage === pages.length - 1} onClick={() => { setActivePage((p) => p + 1); setSelectedId(null); }}>Next ›</button>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}>
          <button className="sal2-ghost-btn" onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button className="sal2-ghost-btn" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>+</button>
        </div>
      </div>

      <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'auto', maxHeight: 480, background: '#F8FAFC', padding: 12 }}>
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ position: 'relative', width: page.width * zoom, height: page.height * zoom, cursor: 'crosshair', userSelect: 'none' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dataUrl} alt={`Payslip page ${activePage + 1}`} draggable={false} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
          {boxes.map((b) => {
            const nb = normalizeBox(b);
            const isSelected = b.id === selectedId;
            return (
              <div
                key={b.id}
                style={{
                  position: 'absolute', left: nb.x * zoom, top: nb.y * zoom, width: nb.w * zoom, height: nb.h * zoom,
                  background: 'rgba(15,23,42,0.85)', border: isSelected ? '2px solid #2563EB' : '1px solid rgba(255,255,255,0.6)',
                  boxSizing: 'border-box',
                }}
              >
                {isSelected && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteBox(b.id); }}
                      title="Remove this redaction"
                      style={{ position: 'absolute', top: -12, right: -12, width: 22, height: 22, borderRadius: '50%', background: '#DC2626', color: 'white', border: '2px solid white', fontSize: '0.7rem', lineHeight: 1, cursor: 'pointer' }}
                    >×</button>
                    <div style={{ position: 'absolute', right: -5, bottom: -5, width: HANDLE_SIZE, height: HANDLE_SIZE, background: '#2563EB', border: '2px solid white', borderRadius: 2, cursor: 'nwse-resize' }} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
        <button className="sal2-ghost-btn" onClick={onCancel}>Cancel</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {totalBoxes > 0 && (
            <span style={{ fontSize: '0.72rem', color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 10px' }}>
              ⚠️ Your redactions will be permanently applied to the version used for extraction.
            </span>
          )}
          <button className="sal2-add-btn" onClick={handleApply}>
            {totalBoxes > 0 ? `Apply ${totalBoxes} redaction${totalBoxes > 1 ? 's' : ''} & continue` : 'Continue without redacting'}
          </button>
        </div>
      </div>
    </div>
  );
}
