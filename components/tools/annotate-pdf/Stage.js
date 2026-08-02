'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { handleAt, handleSize, resizeRect } from '../redact-edit/geometry';
import { boundsOf, createObject, drawObject, hitTestAt, interactionOf, stampShared } from './objectTypes';
import { noteBg, NOTE_SIZE } from './objectTypes/note';
import { translateObject } from './alignment';
import { computeFitToWidthScale, getPointerPageSpace, pageSpaceToWrapperOffset } from './coordinateTransform';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const DRAG_TYPES_LIVE = new Set(['highlight', 'draw', 'underline', 'strikethrough', 'shape']);

function smallBtn(danger) {
  return {
    padding: '5px 10px', borderRadius: 6, border: '1px solid', borderColor: danger ? '#FECACA' : '#E2E8F0',
    background: danger ? '#FEF2F2' : 'white', color: danger ? '#DC2626' : '#334155', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 600,
  };
}

function viewBtn(disabled) {
  return {
    padding: '5px 9px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white',
    color: disabled ? '#CBD5E1' : '#334155', cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600, lineHeight: 1,
  };
}

function isEditableTarget(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
}

function supportsResize(o) {
  if (o.type === 'shape') return o.shapeKind !== 'polygon';
  return ['highlight', 'underline', 'strikethrough', 'image', 'signature', 'callout'].includes(o.type);
}
function supportsRotate(o) {
  return o.type === 'shape' || o.type === 'image' || o.type === 'signature';
}
function angleTo(center, pos) {
  return (Math.atan2(pos.y - center.y, pos.x - center.x) * 180) / Math.PI;
}
function rectsIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function normalizeRect(a, b) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

// Center panel: the PDF page canvas, the pointer-driven create/select/
// multi-select interaction, the inline note/text/callout editor overlay,
// and view controls (zoom/pan/rotate/fullscreen). Every coordinate
// conversion goes through coordinateTransform.js, which reads the canvas's
// live bounding rect — that's what lets pan (a pure CSS translate) and zoom
// (baseScale * zoom) keep working with zero changes to the pointer-math call
// sites below. Page rotation is display-only here (pointer interaction is
// disabled while a page is rotated).
//
// Selection/transform model: everything except note/text/callout's inline
// text editing is canvas-only (rendering, hit-testing, resize/rotate
// handles) — that's what keeps redraws cheap with hundreds of objects. A
// single `liveOverridesRef` map holds in-progress move/resize/rotate
// transforms during a drag (keyed by object id) so drawDisplay can render
// the live position without touching history; the real commit only happens
// once, on pointer-up.
export default function Stage({
  page, activePage, pageObjects,
  activeTool, highlightColor, inkColor, shapeKind,
  numberingCounter, onNumberPlaced,
  selectedIds, setSelectedIds,
  editor, setEditor,
  commitPageObjects, deleteObjectById,
  nextId, nextZ,
  rotation, onRotate,
  fullscreen, onToggleFullscreen,
}) {
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [polygonPoints, setPolygonPoints] = useState([]);
  const canvasRef = useRef(null);
  const stageWrapperRef = useRef(null);
  const dragRef = useRef(null); // in-progress *creation* drag (highlight/draw/underline/strikethrough/shape)
  const liveObjectRef = useRef(null); // uncommitted new object being created
  const groupDragRef = useRef(null); // in-progress move drag of already-selected object(s)
  const resizeDragRef = useRef(null);
  const rotateDragRef = useRef(null);
  const marqueeRef = useRef(null);
  const liveOverridesRef = useRef(null); // Map<id, patchedObject> during move/resize/rotate
  const polygonHoverRef = useRef(null);
  const clickStartRef = useRef(null); // polygon-mode click-vs-drag disambiguation
  const panDragRef = useRef(null);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const displayScale = baseScale * zoom;
  const rotated90 = rotation === 90 || rotation === 270;

  useEffect(() => {
    const wrapper = stageWrapperRef.current;
    if (!page || !wrapper) return;
    function recompute() {
      const available = Math.max(120, wrapper.clientWidth - 32);
      const sourceWidth = rotated90 ? page.height : page.width;
      setBaseScale(computeFitToWidthScale(sourceWidth, available));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [page, fullscreen, rotated90]);

  useEffect(() => { setPan({ x: 0, y: 0 }); }, [activePage]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.code === 'Space' && !isEditableTarget(e.target)) { setSpaceHeld(true); e.preventDefault(); }
      if (e.key === 'Escape' && polygonPoints.length) setPolygonPoints([]);
    }
    function onKeyUp(e) {
      if (e.code === 'Space') setSpaceHeld(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
  }, [polygonPoints]);

  function zoomIn() { setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))); }
  function zoomOut() { setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))); }
  function zoomReset() { setZoom(1); setPan({ x: 0, y: 0 }); }

  const sortedByZ = [...pageObjects].sort((a, b) => a.z - b.z);
  const soleSelected = selectedIds.size === 1 ? pageObjects.find((o) => selectedIds.has(o.id)) : null;

  const drawDisplay = useCallback(() => {
    const displayCanvas = canvasRef.current;
    if (!displayCanvas || !page) return;
    const ctx = displayCanvas.getContext('2d');
    ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    ctx.drawImage(page.canvas, 0, 0);

    const overrides = liveOverridesRef.current;
    const dragging = !!(groupDragRef.current || resizeDragRef.current || rotateDragRef.current);

    sortedByZ.forEach((o) => {
      const draw = overrides?.get(o.id) || o;
      drawObject(ctx, draw);
      if (selectedIds.has(o.id) && !dragging) {
        ctx.save();
        ctx.strokeStyle = '#2563EB';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 2;
        const b = boundsOf(draw, ctx);
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        ctx.restore();
      }
    });

    const live = liveObjectRef.current;
    if (live) drawObject(ctx, live);

    if (soleSelected && !dragging && !editor && !soleSelected.locked) {
      const b = boundsOf(soleSelected, ctx);
      const scale = 1 / displayScale;
      const hs = handleSize(scale);
      if (supportsResize(soleSelected)) {
        ctx.save();
        ctx.fillStyle = '#2563EB';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].forEach(([hx, hy]) => {
          ctx.beginPath();
          ctx.rect(hx - hs / 2, hy - hs / 2, hs, hs);
          ctx.fill();
          ctx.stroke();
        });
        ctx.restore();
      }
      if (supportsRotate(soleSelected)) {
        const cx = b.x + b.w / 2;
        const ry = b.y - 30 * scale;
        ctx.save();
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, b.y);
        ctx.lineTo(cx, ry);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = '#2563EB';
        ctx.arc(cx, ry, hs / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.stroke();
        ctx.restore();
      }
    }

    if (marqueeRef.current?.current) {
      const r = normalizeRect(marqueeRef.current.start, marqueeRef.current.current);
      ctx.save();
      ctx.fillStyle = 'rgba(37,99,235,0.1)';
      ctx.strokeStyle = '#2563EB';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.restore();
    }

    if (polygonPoints.length) {
      ctx.save();
      ctx.strokeStyle = inkColor;
      ctx.fillStyle = inkColor;
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
      polygonPoints.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      if (polygonHoverRef.current) ctx.lineTo(polygonHoverRef.current.x, polygonHoverRef.current.y);
      ctx.stroke();
      polygonPoints.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageObjects, selectedIds, soleSelected, displayScale, editor, polygonPoints, inkColor]);

  useEffect(() => { drawDisplay(); }, [drawDisplay]);

  function getPos(e) {
    return getPointerPageSpace({ x: e.clientX, y: e.clientY }, canvasRef.current);
  }

  function screenPosFor(o) {
    return pageSpaceToWrapperOffset(o, canvasRef.current, stageWrapperRef.current, displayScale);
  }

  function hitAnyObject(pos) {
    const ctx = canvasRef.current.getContext('2d');
    const topmostFirst = [...pageObjects].sort((a, b) => b.z - a.z);
    for (const o of topmostFirst) {
      if (o.hidden) continue;
      if (hitTestAt(pos, o, ctx)) return o;
    }
    return null;
  }

  function openEditor(o) {
    setSelectedIds(new Set());
    setEditor({ id: o.id, value: o.text || '' });
  }

  function startCreation(tool, pos) {
    if (tool === 'highlight') {
      dragRef.current = { type: 'highlight', start: pos };
      liveObjectRef.current = { id: null, type: 'highlight', x: pos.x, y: pos.y, w: 0, h: 0, color: highlightColor, opacity: 0.42 };
    } else if (tool === 'draw') {
      dragRef.current = { type: 'draw' };
      liveObjectRef.current = { id: null, type: 'draw', points: [pos], color: inkColor, thickness: 5 };
    } else if (tool === 'underline' || tool === 'strikethrough') {
      dragRef.current = { type: tool, start: pos };
      liveObjectRef.current = { id: null, type: tool, x: pos.x, y: pos.y, w: 0, h: 0, color: inkColor, thickness: 2, style: 'solid' };
    } else if (tool === 'shape') {
      dragRef.current = { type: 'shape', start: pos };
      liveObjectRef.current = { id: null, type: 'shape', shapeKind, x: pos.x, y: pos.y, w: 0, h: 0, color: inkColor, thickness: 3, fill: false };
    } else if (tool === 'note' || tool === 'text' || tool === 'callout') {
      const obj = createObject(tool, { page: activePage, x: pos.x, y: pos.y, color: inkColor, nextId, nextZ });
      commitPageObjects([...pageObjects, obj]);
      openEditor(obj);
    } else if (tool === 'numbering') {
      const obj = createObject('numbering', { page: activePage, x: pos.x, y: pos.y, color: inkColor, number: numberingCounter, nextId, nextZ });
      commitPageObjects([...pageObjects, obj]);
      onNumberPlaced();
    }
    drawDisplay();
  }

  function handleObjectHit(hit, pos, e) {
    let nextIds;
    if (e.shiftKey) {
      nextIds = new Set(selectedIds);
      if (nextIds.has(hit.id)) nextIds.delete(hit.id); else nextIds.add(hit.id);
    } else if (selectedIds.has(hit.id) && selectedIds.size > 1) {
      nextIds = selectedIds;
    } else {
      nextIds = new Set([hit.id]);
    }
    setSelectedIds(nextIds);
    if (hit.locked) return;
    const ids = nextIds.has(hit.id) ? nextIds : new Set([hit.id]);
    const origById = new Map();
    pageObjects.forEach((o) => { if (ids.has(o.id)) origById.set(o.id, o); });
    if (!origById.size) return;
    groupDragRef.current = { start: pos, origById };
  }

  function onPointerDown(e) {
    if (rotation) return; // view-only while this page is rotated — see rotateCanvas.js
    if (editor) {
      // Clicking anywhere else while a note/text/callout editor is open
      // commits it first and absorbs this click, rather than letting it
      // fall through to the active tool's own click handling — otherwise a
      // click meant to dismiss the editor would also be read as "create a
      // new annotation here" (with the just-typed text silently discarded,
      // since openEditor() for the new object overwrites `editor` before
      // the old one was ever saved).
      commitEditor();
      return;
    }
    if (spaceHeld) {
      panDragRef.current = { startX: e.clientX, startY: e.clientY, origin: pan };
      setIsPanning(true);
      return;
    }
    const pos = getPos(e);

    if (soleSelected && !editor && !soleSelected.locked) {
      const ctx = canvasRef.current.getContext('2d');
      const b = boundsOf(soleSelected, ctx);
      const scale = 1 / displayScale;
      if (supportsRotate(soleSelected)) {
        const center = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
        const handlePos = { x: center.x, y: b.y - 30 * scale };
        if (Math.hypot(pos.x - handlePos.x, pos.y - handlePos.y) <= handleSize(scale)) {
          rotateDragRef.current = { id: soleSelected.id, center, startAngle: angleTo(center, pos), origRotation: soleSelected.rotation || 0 };
          return;
        }
      }
      if (supportsResize(soleSelected)) {
        const handle = handleAt(pos, b, scale);
        if (handle) {
          resizeDragRef.current = { id: soleSelected.id, handle, orig: { ...soleSelected } };
          return;
        }
      }
    }

    if (activeTool === 'shape' && shapeKind === 'polygon') {
      clickStartRef.current = pos;
      return;
    }

    const hit = hitAnyObject(pos);
    if (hit) {
      handleObjectHit(hit, pos, e);
      return;
    }

    setSelectedIds(new Set());
    if (activeTool === 'select') {
      marqueeRef.current = { start: pos, current: null };
      return;
    }
    startCreation(activeTool, pos);
  }

  function onPointerMove(e) {
    if (panDragRef.current) {
      const { startX, startY, origin } = panDragRef.current;
      setPan({ x: origin.x + (e.clientX - startX), y: origin.y + (e.clientY - startY) });
      return;
    }
    const pos = getPos(e);

    if (rotateDragRef.current) {
      const d = rotateDragRef.current;
      const angle = angleTo(d.center, pos);
      const nextRotation = Math.round(d.origRotation + (angle - d.startAngle));
      const base = pageObjects.find((o) => o.id === d.id);
      liveOverridesRef.current = new Map([[d.id, { ...base, rotation: nextRotation }]]);
      drawDisplay();
      return;
    }
    if (resizeDragRef.current) {
      const d = resizeDragRef.current;
      const next = resizeRect(d.orig, d.handle, pos, null);
      liveOverridesRef.current = new Map([[d.id, next]]);
      drawDisplay();
      return;
    }
    if (groupDragRef.current) {
      const d = groupDragRef.current;
      const dx = pos.x - d.start.x;
      const dy = pos.y - d.start.y;
      const map = new Map();
      d.origById.forEach((orig, id) => map.set(id, translateObject(orig, dx, dy)));
      liveOverridesRef.current = map;
      drawDisplay();
      return;
    }
    if (marqueeRef.current) {
      marqueeRef.current.current = pos;
      drawDisplay();
      return;
    }
    if (activeTool === 'shape' && shapeKind === 'polygon' && polygonPoints.length) {
      polygonHoverRef.current = pos;
      drawDisplay();
      return;
    }

    const drag = dragRef.current;
    if (!drag) return;
    if (drag.type === 'highlight') {
      liveObjectRef.current = {
        id: null, type: 'highlight', color: highlightColor, opacity: 0.42,
        x: Math.min(drag.start.x, pos.x), y: Math.min(drag.start.y, pos.y),
        w: Math.abs(pos.x - drag.start.x), h: Math.abs(pos.y - drag.start.y),
      };
    } else if (drag.type === 'draw') {
      liveObjectRef.current = { ...liveObjectRef.current, points: [...liveObjectRef.current.points, pos] };
    } else if (drag.type === 'underline' || drag.type === 'strikethrough') {
      liveObjectRef.current = {
        ...liveObjectRef.current,
        x: Math.min(drag.start.x, pos.x), y: Math.min(drag.start.y, pos.y),
        w: Math.abs(pos.x - drag.start.x), h: Math.abs(pos.y - drag.start.y),
      };
    } else if (drag.type === 'shape') {
      liveObjectRef.current = { ...liveObjectRef.current, x: drag.start.x, y: drag.start.y, w: pos.x - drag.start.x, h: pos.y - drag.start.y };
    }
    drawDisplay();
  }

  function onPointerUp(e) {
    if (panDragRef.current) { panDragRef.current = null; setIsPanning(false); return; }

    if (rotateDragRef.current) {
      const d = rotateDragRef.current;
      const live = liveOverridesRef.current?.get(d.id);
      rotateDragRef.current = null;
      liveOverridesRef.current = null;
      if (live && live.rotation !== (pageObjects.find((o) => o.id === d.id)?.rotation || 0)) {
        commitPageObjects(pageObjects.map((o) => (o.id === d.id ? { ...o, rotation: live.rotation, updatedAt: Date.now() } : o)));
      } else {
        drawDisplay();
      }
      return;
    }
    if (resizeDragRef.current) {
      const d = resizeDragRef.current;
      const live = liveOverridesRef.current?.get(d.id);
      resizeDragRef.current = null;
      liveOverridesRef.current = null;
      if (live && (live.x !== d.orig.x || live.y !== d.orig.y || live.w !== d.orig.w || live.h !== d.orig.h)) {
        commitPageObjects(pageObjects.map((o) => (o.id === d.id ? { ...o, ...live, updatedAt: Date.now() } : o)));
      } else {
        drawDisplay();
      }
      return;
    }
    if (groupDragRef.current) {
      const map = liveOverridesRef.current;
      groupDragRef.current = null;
      liveOverridesRef.current = null;
      let changed = false;
      const next = pageObjects.map((o) => {
        const patched = map?.get(o.id);
        if (patched && patched !== o) { changed = true; return patched; }
        return o;
      });
      if (changed) commitPageObjects(next); else drawDisplay();
      return;
    }
    if (marqueeRef.current) {
      const { start, current } = marqueeRef.current;
      marqueeRef.current = null;
      if (current) {
        const rect = normalizeRect(start, current);
        const ctx = canvasRef.current.getContext('2d');
        const hitIds = pageObjects.filter((o) => !o.hidden && rectsIntersect(rect, boundsOf(o, ctx))).map((o) => o.id);
        if (hitIds.length) setSelectedIds(new Set(hitIds));
      }
      drawDisplay();
      return;
    }
    if (activeTool === 'shape' && shapeKind === 'polygon') {
      const start = clickStartRef.current;
      clickStartRef.current = null;
      if (start) {
        const pos = getPos(e);
        if (Math.hypot(pos.x - start.x, pos.y - start.y) < 4) setPolygonPoints((pts) => [...pts, pos]);
      }
      return;
    }

    const drag = dragRef.current;
    const live = liveObjectRef.current;
    dragRef.current = null;
    liveObjectRef.current = null;
    if (!drag || !live) return;
    if (drag.type === 'highlight' && live.w > 3 && live.h > 3) {
      commitPageObjects([...pageObjects, stampShared({ ...live }, { page: activePage, nextId, nextZ })]);
    } else if (drag.type === 'draw' && live.points.length > 1) {
      commitPageObjects([...pageObjects, stampShared({ ...live }, { page: activePage, nextId, nextZ })]);
    } else if ((drag.type === 'underline' || drag.type === 'strikethrough') && live.w > 4) {
      commitPageObjects([...pageObjects, stampShared({ ...live }, { page: activePage, nextId, nextZ })]);
    } else if (drag.type === 'shape' && (Math.abs(live.w) > 4 || Math.abs(live.h) > 4)) {
      commitPageObjects([...pageObjects, stampShared({ ...live }, { page: activePage, nextId, nextZ })]);
    } else {
      drawDisplay();
    }
  }

  function onCanvasDoubleClick(e) {
    if (rotation) return;
    const pos = getPos(e);
    if (activeTool === 'shape' && shapeKind === 'polygon' && polygonPoints.length >= 2) {
      const points = [...polygonPoints, pos];
      setPolygonPoints([]);
      const obj = stampShared(
        { type: 'shape', shapeKind: 'polygon', x: points[0].x, y: points[0].y, points, color: inkColor, thickness: 3, fill: false },
        { page: activePage, nextId, nextZ },
      );
      commitPageObjects([...pageObjects, obj]);
      return;
    }
    const ctx = canvasRef.current.getContext('2d');
    const topmostFirst = [...pageObjects].sort((a, b) => b.z - a.z);
    const hit = topmostFirst.find((o) => !o.hidden && !o.locked && interactionOf(o.type) === 'edit' && hitTestAt(pos, o, ctx));
    if (hit) openEditor(hit);
  }

  function commitEditor() {
    if (!editor) return;
    const obj = pageObjects.find((o) => o.id === editor.id);
    if (!obj) { setEditor(null); return; }
    if (!editor.value.trim() && !obj.text) {
      deleteObjectById(editor.id);
    } else {
      commitPageObjects(pageObjects.map((o) => (o.id === editor.id ? { ...o, text: editor.value, updatedAt: Date.now() } : o)));
    }
    setEditor(null);
  }

  function deleteEditorObject() {
    if (editor) deleteObjectById(editor.id);
  }

  if (!page) return null;

  const editorObj = editor ? pageObjects.find((o) => o.id === editor.id) : null;
  const editorPos = editorObj ? screenPosFor(editorObj) : null;
  const footprintW = (rotated90 ? page.height : page.width) * displayScale;
  const footprintH = (rotated90 ? page.width : page.height) * displayScale;

  const cursor = isPanning ? 'grabbing' : spaceHeld ? 'grab' : rotation ? 'default'
    : activeTool === 'select' ? 'default'
      : (activeTool === 'text' || activeTool === 'note' || activeTool === 'callout') ? 'text' : 'crosshair';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
        <button onClick={zoomOut} disabled={zoom <= MIN_ZOOM} style={viewBtn(zoom <= MIN_ZOOM)} aria-label="Zoom out">−</button>
        <button onClick={zoomReset} style={viewBtn(false)}>{Math.round(zoom * 100)}%</button>
        <button onClick={zoomIn} disabled={zoom >= MAX_ZOOM} style={viewBtn(zoom >= MAX_ZOOM)} aria-label="Zoom in">+</button>
        <span style={{ width: 1, height: 18, background: '#E2E8F0', margin: '0 2px' }} />
        <button onClick={() => onRotate((rotation + 90) % 360)} style={viewBtn(false)} aria-label="Rotate page 90 degrees">⟳ Rotate</button>
        <button onClick={onToggleFullscreen} style={viewBtn(false)} aria-label="Toggle fullscreen">{fullscreen ? '⤢ Exit Fullscreen' : '⤢ Fullscreen'}</button>
      </div>

      {rotation !== 0 && (
        <div style={{ fontSize: '0.74rem', color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
          This page is rotated for viewing. Rotate back to 0° to add or edit annotations on it.
        </div>
      )}
      {activeTool === 'shape' && shapeKind === 'polygon' && polygonPoints.length > 0 && (
        <div style={{ fontSize: '0.74rem', color: '#1D4ED8', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
          {polygonPoints.length} point{polygonPoints.length === 1 ? '' : 's'} placed — double-click to finish the shape, Esc to cancel.
        </div>
      )}

      <div
        ref={stageWrapperRef}
        style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#F1F5F9', borderRadius: 12, padding: 16, marginBottom: 14, overflow: 'hidden', minHeight: footprintH + 32 }}
      >
        <div style={{ position: 'relative', width: footprintW, height: footprintH, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <canvas
            ref={canvasRef}
            width={page.width}
            height={page.height}
            style={{
              width: page.width * displayScale, height: page.height * displayScale,
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
              borderRadius: 4, boxShadow: '0 4px 16px rgba(15,23,42,0.18)', touchAction: 'none',
              cursor,
            }}
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onDoubleClick={onCanvasDoubleClick}
          />
        </div>
        {editor && editorPos && editorObj?.type === 'note' && (
          <div style={{ position: 'absolute', left: editorPos.left, top: editorPos.top, zIndex: 20 }}>
            <textarea
              autoFocus
              value={editor.value}
              onChange={(e) => setEditor({ ...editor, value: e.target.value })}
              placeholder="Type a comment…"
              style={{
                display: 'block',
                minWidth: 160, minHeight: 160,
                width: (editorObj.w || NOTE_SIZE) * displayScale,
                height: (editorObj.h || NOTE_SIZE) * displayScale,
                background: noteBg(editorObj.color),
                border: 'none', outline: 'none', resize: 'both',
                borderRadius: 4,
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
                padding: 12, fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.5, color: '#1E293B',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
              <button onClick={deleteEditorObject} style={smallBtn(true)}>Delete</button>
              <button onClick={commitEditor} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#1E293B', color: 'white', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        )}
        {editor && editorPos && editorObj?.type === 'text' && (
          <div style={{ position: 'absolute', left: editorPos.left, top: editorPos.top, zIndex: 20, background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 10, boxShadow: '0 8px 24px rgba(15,23,42,0.18)', width: 220 }}>
            <textarea
              autoFocus
              value={editor.value}
              onChange={(e) => setEditor({ ...editor, value: e.target.value })}
              placeholder="Type text…"
              style={{ width: '100%', minHeight: 60, padding: 8, borderRadius: 6, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '0.85rem', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button onClick={deleteEditorObject} style={smallBtn(true)}>Delete</button>
              <button onClick={commitEditor} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        )}
        {editor && editorPos && editorObj?.type === 'callout' && (
          <div style={{ position: 'absolute', left: editorPos.left, top: editorPos.top, zIndex: 20 }}>
            <textarea
              autoFocus
              value={editor.value}
              onChange={(e) => setEditor({ ...editor, value: e.target.value })}
              placeholder="Type a note…"
              style={{
                display: 'block',
                width: (editorObj.w) * displayScale,
                height: (editorObj.h) * displayScale,
                background: 'white', border: `2px solid ${editorObj.color}`, borderRadius: 8, outline: 'none', resize: 'both',
                boxShadow: '0 4px 12px rgba(15,23,42,0.18)',
                padding: 10, fontFamily: 'inherit', fontSize: '0.82rem', lineHeight: 1.4, color: '#1E293B',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 6 }}>
              <button onClick={deleteEditorObject} style={smallBtn(true)}>Delete</button>
              <button onClick={commitEditor} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#1E293B', color: 'white', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer' }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
