'use client';

import { KIND_RENDERERS } from './kindRenderers';

const HANDLE_BASE = {
  position: 'absolute', width: 10, height: 10, background: '#fff',
  border: '2px solid #2563EB', borderRadius: 2,
};

function ResizeHandles({ onResize }) {
  return (
    <>
      <div onMouseDown={(e) => onResize('tl', e)} style={{ ...HANDLE_BASE, left: -5, top: -5, cursor: 'nwse-resize' }} />
      <div onMouseDown={(e) => onResize('tr', e)} style={{ ...HANDLE_BASE, right: -5, top: -5, cursor: 'nesw-resize' }} />
      <div onMouseDown={(e) => onResize('bl', e)} style={{ ...HANDLE_BASE, left: -5, bottom: -5, cursor: 'nesw-resize' }} />
      <div onMouseDown={(e) => onResize('br', e)} style={{ ...HANDLE_BASE, right: -5, bottom: -5, cursor: 'nwse-resize' }} />
    </>
  );
}

export default function CanvasElement({ el, ctx, selected, previewMode, onMouseDown, onResize }) {
  const Renderer = KIND_RENDERERS[el.kind];
  if (!Renderer || !el.visible) return null;

  return (
    <div
      onMouseDown={onMouseDown}
      style={{
        position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
        cursor: previewMode ? 'default' : 'move',
        outline: selected ? '2px solid #2563EB' : 'none', outlineOffset: 2,
      }}
    >
      <Renderer el={el} ctx={ctx} />
      {selected && !previewMode && <ResizeHandles onResize={onResize} />}
    </div>
  );
}
