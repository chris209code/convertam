'use client';

import { useEffect, useRef, useState } from 'react';
import { cssFontFamily } from './constants';
import { resizeLocal } from './geometry';

const HANDLES = ['nw', 'ne', 'sw', 'se'];
const HANDLE_CURSOR = { nw: 'nwse-resize', se: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize' };

// Renders one text object as an absolutely-positioned element inside the
// page-space-scaled stage (see RedactPdfWorkspace). All coordinates here
// (obj.x/y/w/h/fontSizePx) are authored directly in that same page-space —
// the parent's CSS transform:scale handles fitting everything to the
// viewport, so this component never needs to know about display scale
// except to convert pointer *deltas* (client px) back into page-space px.
export default function TextBox({ obj, scale, isSelected, isEditing, onSelect, onStartEdit, onCommitText, onCommitTransform, onLiveTransform }) {
  const [live, setLive] = useState(null); // { x, y, w, h, rotation } while dragging/resizing/rotating — drives re-renders
  const liveRef = useRef(null); // same value, always current — the window pointerup listener is registered once at
  // drag-start with a closure over that render's state, so it must read the *ref*, not the (by-then-stale) `live` state
  const dragRef = useRef(null);
  const skipNextBlurRef = useRef(false);
  const boxRef = useRef(null);
  const taRef = useRef(null);
  const [draftText, setDraftText] = useState(obj.text);

  useEffect(() => {
    if (isEditing) {
      setDraftText(obj.text);
      requestAnimationFrame(() => {
        taRef.current?.focus();
        taRef.current?.select();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  const display = live || obj;

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
    } else if (drag.type === 'resize') {
      const dx = (e.clientX - drag.startX) / scale;
      const dy = (e.clientY - drag.startY) / scale;
      next = resizeLocal(drag.orig, drag.handle, dx, dy);
    } else if (drag.type === 'rotate') {
      const angle = Math.atan2(e.clientY - drag.center.y, e.clientX - drag.center.x) * 180 / Math.PI;
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
    const startAngle = Math.atan2(e.clientY - center.y, e.clientX - center.x) * 180 / Math.PI;
    dragRef.current = { type: 'rotate', center, startAngle, origRotation: obj.rotation || 0, orig: { x: obj.x, y: obj.y, w: obj.w, h: obj.h } };
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  }

  function commitDraft() {
    if (skipNextBlurRef.current) { skipNextBlurRef.current = false; return; }
    // Grow (never shrink) the box to fit what was actually typed, so text
    // never silently clips against a too-small box the user forgot to resize.
    const measuredH = taRef.current ? Math.max(obj.h, taRef.current.scrollHeight + 4) : obj.h;
    onCommitText(draftText, measuredH !== obj.h ? { h: measuredH } : null);
  }

  function cancelEdit() {
    // Revert to the original text explicitly, rather than setDraftText()
    // then immediately blurring — blur's onBlur closure can fire before
    // that state update has flushed, committing the pre-revert draft
    // instead of the cancellation. skipNextBlurRef swallows the *natural*
    // onBlur this triggers so it doesn't re-commit on top of this.
    skipNextBlurRef.current = true;
    onCommitText(obj.text, null);
    taRef.current?.blur();
  }

  const weight = obj.bold ? 700 : 400;
  const style = obj.italic ? 'italic' : 'normal';
  const decoration = obj.underline ? 'underline' : 'none';
  const fontFamily = cssFontFamily(obj.fontFamily);

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
    <div ref={boxRef} style={outerStyle} onPointerDown={(e) => { if (!isEditing) beginMove(e); }} onDoubleClick={(e) => { e.stopPropagation(); onSelect(); onStartEdit(); }}>
      {isEditing ? (
        <textarea
          ref={taRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') cancelEdit();
          }}
          style={{
            width: '100%', height: '100%', resize: 'none', boxSizing: 'border-box',
            border: '1px dashed #2563EB', outline: 'none', background: 'rgba(255,255,255,0.85)',
            fontFamily, fontSize: obj.fontSizePx, fontWeight: weight, fontStyle: style,
            textDecoration: decoration, color: obj.color, textAlign: obj.align,
            lineHeight: obj.lineHeight, letterSpacing: obj.letterSpacing, padding: 2,
            whiteSpace: 'pre-wrap', overflow: 'hidden',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%', height: '100%', boxSizing: 'border-box', cursor: 'move',
            fontFamily, fontSize: obj.fontSizePx, fontWeight: weight, fontStyle: style,
            textDecoration: decoration, color: obj.color, textAlign: obj.align,
            lineHeight: obj.lineHeight, letterSpacing: obj.letterSpacing, padding: 2,
            whiteSpace: 'pre-wrap', overflowWrap: 'break-word', overflow: 'hidden',
            border: isSelected ? '1.5px dashed #2563EB' : '1px dashed transparent',
            userSelect: 'none',
          }}
        >
          {obj.text || (isSelected ? '' : ' ')}
        </div>
      )}

      {isSelected && !isEditing && (
        <>
          {HANDLES.map((h) => {
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
