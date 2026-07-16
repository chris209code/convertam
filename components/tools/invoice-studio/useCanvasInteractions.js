'use client';

import { useCallback, useRef, useState } from 'react';
import { CANVAS_W, CANVAS_H, SNAP_THRESHOLD } from '@/lib/invoice-studio/constants';

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function computeSnap(x, y, w, h, others) {
  const targetsX = [CANVAS_W / 2 - w / 2];
  const targetsY = [CANVAS_H / 2 - h / 2];
  others.forEach((o) => {
    targetsX.push(o.x, o.x - w, o.x + o.w - w, o.x + o.w / 2 - w / 2);
    targetsY.push(o.y, o.y - h, o.y + o.h - h, o.y + o.h / 2 - h / 2);
  });
  let bestX = x, guideX = null, bestDX = SNAP_THRESHOLD;
  targetsX.forEach((t) => { const d = Math.abs(t - x); if (d < bestDX) { bestDX = d; bestX = t; guideX = t + w / 2; } });
  let bestY = y, guideY = null, bestDY = SNAP_THRESHOLD;
  targetsY.forEach((t) => { const d = Math.abs(t - y); if (d < bestDY) { bestDY = d; bestY = t; guideY = t + h / 2; } });
  return { x: bestX, y: bestY, guideX, guideY };
}

// Drag-reposition and corner-resize for freeform canvas elements, with
// alignment-guide snapping to the canvas center and sibling edges/centers.
// Position updates are applied live (via onLiveChange); a history snapshot
// is only requested on mouseup (via onCommit) so undo/redo captures one step
// per drag/resize, not one per pixel of mouse movement.
export function useCanvasInteractions({ elements, zoom, previewMode, onLiveChange, onCommit, onSelect }) {
  const [guides, setGuides] = useState({ x: null, y: null });
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const findEl = useCallback((id) => elements.find((e) => e.id === id), [elements]);

  const dragStart = useCallback((id, e) => {
    if (previewMode) return;
    e.stopPropagation();
    const el = findEl(id);
    if (!el) return;
    onSelect(id);
    // Don't arm dragging from a click that's about to focus a contentEditable
    // field — that's a text-edit click, not a move, and would otherwise burn
    // an undo step for zero actual change every time someone clicks into text.
    if (e.target && e.target.isContentEditable) return;
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, zoom, moved: false };

    const move = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = (ev.clientX - d.sx) / d.zoom;
      const dy = (ev.clientY - d.sy) / d.zoom;
      const nx = d.ox + dx, ny = d.oy + dy;
      const current = findEl(d.id);
      if (!current) return;
      const others = elements.filter((o) => o.id !== d.id);
      const snap = computeSnap(nx, ny, current.w, current.h, others);
      if (snap.x !== d.ox || snap.y !== d.oy) d.moved = true;
      setGuides({ x: snap.guideX, y: snap.guideY });
      onLiveChange(d.id, { x: snap.x, y: snap.y });
    };
    const up = () => {
      const moved = dragRef.current?.moved;
      dragRef.current = null;
      setGuides({ x: null, y: null });
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (moved) onCommit();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [elements, zoom, previewMode, findEl, onLiveChange, onCommit, onSelect]);

  const resizeStart = useCallback((id, corner, e) => {
    if (previewMode) return;
    e.stopPropagation();
    const el = findEl(id);
    if (!el) return;
    resizeRef.current = { id, corner, sx: e.clientX, sy: e.clientY, ox: el.x, oy: el.y, ow: el.w, oh: el.h, zoom, moved: false };

    const move = (ev) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = (ev.clientX - r.sx) / r.zoom;
      const dy = (ev.clientY - r.sy) / r.zoom;
      let x = r.ox, y = r.oy, w = r.ow, h = r.oh;
      if (r.corner === 'br') { w = clamp(r.ow + dx, 30, 760); h = clamp(r.oh + dy, 20, 900); }
      if (r.corner === 'bl') { w = clamp(r.ow - dx, 30, 760); x = r.ox + (r.ow - w); h = clamp(r.oh + dy, 20, 900); }
      if (r.corner === 'tr') { w = clamp(r.ow + dx, 30, 760); h = clamp(r.oh - dy, 20, 900); y = r.oy + (r.oh - h); }
      if (r.corner === 'tl') { w = clamp(r.ow - dx, 30, 760); x = r.ox + (r.ow - w); h = clamp(r.oh - dy, 20, 900); y = r.oy + (r.oh - h); }
      if (w !== r.ow || h !== r.oh || x !== r.ox || y !== r.oy) r.moved = true;
      onLiveChange(r.id, { x, y, w, h });
    };
    const up = () => {
      const moved = resizeRef.current?.moved;
      resizeRef.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      if (moved) onCommit();
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  }, [previewMode, findEl, onLiveChange, onCommit]);

  return { dragStart, resizeStart, guideX: guides.x, guideY: guides.y };
}
