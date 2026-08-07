'use client';

import { useRef, useState } from 'react';
import { resizeLocal } from '@/components/tools/redact-edit/geometry';

const HANDLES = ['nw', 'ne', 'sw', 'se'];
const HANDLE_CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };

// Generic move/resize/rotate/commit primitive for any {x,y,w,h,rotation}
// object rendered as a DOM overlay on a scaled stage — extracted from
// Redact & Edit PDF's TextBox.js (that component's move/resize/rotate
// mechanics had zero text-specific logic in them; only the rendered content
// and the double-click-to-edit affordance were text-specific). Content is
// supplied via the `children` render prop: `(display, {isEditing}) => node`,
// where `display` is the object's live (in-drag) or committed transform.
//
// Like the original, drag/resize/rotate are tracked in local state during
// the gesture and only reported upstream via onCommitTransform on
// pointer-up — callers should NOT push every intermediate frame through
// undo history, only the final commit.
export default function TransformableBox({
  obj, scale, isSelected, isEditing,
  onSelect, onStartEdit, onCommitTransform, onLiveTransform,
  minW = 24, minH = 18,
  resizable = true, rotatable = true, locked = false,
  // Optional live-drag position override, called only during a MOVE drag
  // (not resize/rotate) with the unsnapped candidate {x,y,w,h,rotation} —
  // return {x, y} to override where the box actually lands (e.g. snapped to
  // a page/other-object guide line). Has no opinion on what a "guide" is;
  // that's entirely the caller's concern (see PDF Layout Studio's
  // snapping.js) — this component only applies whatever position it's told.
  getSnap,
  children,
}) {
  const [live, setLive] = useState(null);
  const liveRef = useRef(null);
  const dragRef = useRef(null);
  const boxRef = useRef(null);

  const display = live || obj;
  const effectiveResizable = resizable && !locked;
  const effectiveRotatable = rotatable && !locked;

  function endDrag() {
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragEnd);
    dragRef.current = null;
  }

  function onDragMove(e) {
    const drag = dragRef.current;
    if (!drag) return;
    let next = null;
    if (drag.type === 'move') {
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;
      next = { ...drag.orig, x: drag.orig.x + dx, y: drag.orig.y + dy };
      if (getSnap) {
        const snapped = getSnap(next);
        if (snapped) next = { ...next, x: snapped.x, y: snapped.y };
      }
    } else if (drag.type === 'resize') {
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;
      next = resizeLocal(drag.orig, drag.handle, dx, dy, minW, minH);
    } else if (drag.type === 'rotate') {
      const angle = (Math.atan2(e.clientY - drag.center.y, e.clientX - drag.center.x) * 180) / Math.PI;
      const delta = angle - drag.startAngle;
      next = { ...drag.orig, rotation: Math.round(drag.origRotation + delta) };
    }
    if (next) {
      liveRef.current = next;
      setLive(next);
      onLiveTransform?.(next);
    }
  }

  function onDragEnd() {
    if (liveRef.current) onCommitTransform(liveRef.current);
    liveRef.current = null;
    setLive(null);
    endDrag();
  }

  function beginMove(e) {
    if (isEditing) return;
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    if (locked) return;
    dragRef.current = { type: 'move', startX: e.clientX, startY: e.clientY, orig: { x: obj.x, y: obj.y, w: obj.w, h: obj.h, rotation: obj.rotation || 0 } };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }

  function beginResize(e, handle) {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    dragRef.current = { type: 'resize', handle, startX: e.clientX, startY: e.clientY, orig: { x: obj.x, y: obj.y, w: obj.w, h: obj.h, rotation: obj.rotation || 0 } };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }

  function beginRotate(e) {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    const rect = boxRef.current.getBoundingClientRect();
    const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const startAngle = (Math.atan2(e.clientY - center.y, e.clientX - center.x) * 180) / Math.PI;
    dragRef.current = { type: 'rotate', center, startAngle, origRotation: obj.rotation || 0, orig: { x: obj.x, y: obj.y, w: obj.w, h: obj.h } };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }

  const outerStyle = {
    position: 'absolute',
    left: display.x,
    top: display.y,
    width: display.w,
    height: display.h,
    transform: isEditing ? 'none' : `rotate(${display.rotation || 0}deg)`,
    transformOrigin: 'center center',
    pointerEvents: 'auto',
  };

  return (
    <div
      ref={boxRef}
      style={outerStyle}
      onPointerDown={(e) => { if (!isEditing) beginMove(e); }}
      onDoubleClick={onStartEdit ? (e) => { e.stopPropagation(); onSelect(); onStartEdit(); } : undefined}
    >
      {children(display, { isEditing })}

      {isSelected && !isEditing && effectiveResizable && HANDLES.map((h) => {
        const pos = {
          nw: { left: -6, top: -6 }, ne: { right: -6, top: -6 },
          sw: { left: -6, bottom: -6 }, se: { right: -6, bottom: -6 },
        }[h];
        return (
          <div
            key={h}
            onPointerDown={(e) => beginResize(e, h)}
            style={{
              position: 'absolute', width: 12, height: 12, borderRadius: 3,
              background: '#2563EB', border: '2px solid white', cursor: HANDLE_CURSOR[h],
              ...pos,
            }}
          />
        );
      })}
      {isSelected && !isEditing && effectiveRotatable && (
        <>
          <div
            onPointerDown={beginRotate}
            title="Drag to rotate"
            style={{
              position: 'absolute', left: '50%', top: -28, width: 12, height: 12, marginLeft: -6,
              borderRadius: '50%', background: '#2563EB', border: '2px solid white', cursor: 'grab',
            }}
          />
          <div style={{ position: 'absolute', left: '50%', top: -22, width: 1, height: 16, background: '#2563EB', marginLeft: 0, pointerEvents: 'none' }} />
        </>
      )}
    </div>
  );
}
