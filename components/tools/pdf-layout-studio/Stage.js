'use client';

import { useEffect, useRef, useState } from 'react';
import TransformableBox from '@/components/shared/TransformableBox';
import { computeFitToWidthScale } from '@/components/shared/coordinateTransform';
import { contentFor } from './objectTypes';
import { computeSnappedPosition } from './snapping';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function viewBtn(disabled) {
  return {
    padding: '5px 9px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white',
    color: disabled ? '#CBD5E1' : '#334155', cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600, lineHeight: 1,
  };
}

// Center canvas: the PDF page plus every placed element, rendered as real
// DOM nodes (not canvas-drawn) inside a CSS `transform: scale()` wrapper —
// the same technique Write on PDF's Stage uses, which is what makes a true
// vector pdf-lib export possible later (an object's raw page-space x/y/w/h
// is used directly as CSS px, no per-frame coordinate conversion needed).
// TransformableBox owns all move/resize/rotate interaction; this component
// only needs to handle clicks that land on the empty page (deselect) and
// the inline text-edit commit flow.
//
// Unlike Write on PDF, there's no "active tool" placement mode here —
// elements are inserted centered-and-selected from the Elements sidebar
// (see PdfLayoutStudioWorkspace.js's addText/addImage), then dragged into
// place. That's the more Canva-like flow the redesign calls for.
export default function Stage({
  page, pageObjects,
  selectedId, setSelectedId,
  editingId, setEditingId,
  commitPageObjects, deleteObjectById,
  pageCount,
}) {
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [draftValue, setDraftValue] = useState('');
  const [activeGuides, setActiveGuides] = useState(null); // { vertical, horizontal } | null, page-space px
  const canvasRef = useRef(null);
  const wrapperRef = useRef(null);

  const displayScale = baseScale * zoom;

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!page || !wrapper) return;
    function recompute() {
      const available = Math.max(120, wrapper.clientWidth - 32);
      // Default max is 1 (never upscale) — too conservative now that the
      // Elements panel moved to a top bar and freed up real width here;
      // without raising this, a page narrower than the available column
      // just sits at native size with dead space beside it instead of
      // actually using the room it was given.
      setBaseScale(computeFitToWidthScale(page.width, available, { max: 2.5 }));
    }
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(wrapper);
    return () => ro.disconnect();
  }, [page]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    canvas.getContext('2d').drawImage(page.canvas, 0, 0);
  }, [page]);

  useEffect(() => {
    if (!editingId) return;
    const obj = pageObjects.find((o) => o.id === editingId);
    setDraftValue(obj?.text || '');
    // Only re-sync when the editing target itself changes — not on every
    // pageObjects change, which would otherwise clobber in-progress typing
    // with the last-committed value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  function zoomIn() { setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))); }
  function zoomOut() { setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))); }
  function zoomReset() { setZoom(1); }

  function commitEditing() {
    if (!editingId) return;
    const id = editingId;
    const obj = pageObjects.find((o) => o.id === id);
    setEditingId(null);
    if (!obj) return;
    if (!draftValue.trim() && !obj.text) {
      deleteObjectById(id);
      return;
    }
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, text: draftValue, updatedAt: Date.now() } : o)));
  }

  function onCanvasClick() {
    if (editingId) { commitEditing(); return; }
    setSelectedId(null);
  }

  function handleCommitTransform(id, patch) {
    commitPageObjects(pageObjects.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: Date.now() } : o)));
    setActiveGuides(null);
  }

  // Live snap-while-dragging: called by TransformableBox on every move-drag
  // frame for object `o`, with the unsnapped candidate position. Snap
  // targets are the page's own center/edges plus every OTHER visible object
  // on the page — never the object being dragged itself, and never a
  // hidden one (nothing to visually line up against). Updates activeGuides
  // as a side effect so the guide lines below re-render live during the
  // drag; handleCommitTransform clears them once the drag ends.
  function makeSnapHandler(o) {
    return (next) => {
      const others = pageObjects.filter((other) => other.id !== o.id && !other.hidden);
      const snapped = computeSnappedPosition(next, page.width, page.height, others);
      setActiveGuides(snapped.guides.vertical != null || snapped.guides.horizontal != null ? snapped.guides : null);
      return snapped;
    };
  }

  if (!page) return null;

  const visibleObjects = pageObjects.filter((o) => !o.hidden);

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 8 }}>
        <button onClick={zoomOut} disabled={zoom <= MIN_ZOOM} style={viewBtn(zoom <= MIN_ZOOM)} aria-label="Zoom out">−</button>
        <button onClick={zoomReset} style={viewBtn(false)}>{Math.round(zoom * 100)}%</button>
        <button onClick={zoomIn} disabled={zoom >= MAX_ZOOM} style={viewBtn(zoom >= MAX_ZOOM)} aria-label="Zoom in">+</button>
      </div>

      <div
        ref={wrapperRef}
        style={{ display: 'flex', justifyContent: 'center', background: '#F1F5F9', borderRadius: 12, padding: 16, overflow: 'auto' }}
      >
        <div style={{ width: page.width * displayScale, height: page.height * displayScale, flexShrink: 0 }}>
          <div style={{ width: page.width, height: page.height, transform: `scale(${displayScale})`, transformOrigin: 'top left', position: 'relative', boxShadow: '0 4px 16px rgba(15,23,42,0.18)' }}>
            <canvas
              ref={canvasRef}
              width={page.width}
              height={page.height}
              onClick={onCanvasClick}
              style={{ display: 'block', width: page.width, height: page.height }}
            />
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {visibleObjects.map((o) => {
                const Content = contentFor(o.type);
                return (
                  <TransformableBox
                    key={o.id}
                    obj={o}
                    scale={displayScale}
                    isSelected={selectedId === o.id}
                    isEditing={editingId === o.id}
                    locked={o.locked}
                    onSelect={() => setSelectedId(o.id)}
                    onStartEdit={o.type === 'text' ? () => setEditingId(o.id) : undefined}
                    onCommitTransform={(patch) => handleCommitTransform(o.id, patch)}
                    getSnap={makeSnapHandler(o)}
                    minW={24}
                    minH={16}
                  >
                    {(display, { isEditing }) => (
                      <Content
                        obj={display}
                        isEditing={isEditing}
                        value={draftValue}
                        onChangeValue={setDraftValue}
                        onBlurCommit={commitEditing}
                        pageCount={pageCount}
                      />
                    )}
                  </TransformableBox>
                );
              })}
              {activeGuides?.vertical != null && (
                <div style={{ position: 'absolute', left: activeGuides.vertical, top: 0, width: 0, height: page.height, borderLeft: '1px solid #EC4899' }} />
              )}
              {activeGuides?.horizontal != null && (
                <div style={{ position: 'absolute', top: activeGuides.horizontal, left: 0, height: 0, width: page.width, borderTop: '1px solid #EC4899' }} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
