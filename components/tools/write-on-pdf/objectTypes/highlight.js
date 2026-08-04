'use client';

// A translucent highlight rectangle, drag-drawn on the page (see Stage.js's
// highlight pointerdown/move/up flow — the only object type in this tool
// created by dragging rather than a single click). Exports as a real
// pdf-lib drawRectangle with the same opacity, never a raster overlay.
export const interaction = 'select';

export function createDefaults({ color = '#FDE047' } = {}) {
  return { color, opacity: 0.4, w: 120, h: 22 };
}

export function Content({ obj }) {
  return (
    <div
      style={{ width: '100%', height: '100%', background: obj.color, opacity: obj.opacity ?? 0.4, cursor: 'move' }}
    />
  );
}
