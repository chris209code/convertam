'use client';

// A free-placed raster image (Image or Logo element — same implementation,
// differentiated only by a `kind` tag for labeling, matching the pattern
// Write on PDF already established for its image/signature/stamp objects).
// Always stored as a PNG data URL so export can always call
// pdfDoc.embedPng() without format-sniffing branches.
export const interaction = 'select';

export function createDefaults({ src, w, h, naturalWidth, naturalHeight, kind = 'image' } = {}) {
  return { src, w, h, naturalWidth: naturalWidth || w, naturalHeight: naturalHeight || h, opacity: 1, lockAspect: true, kind };
}

export function Content({ obj }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={obj.src}
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: obj.opacity ?? 1, cursor: 'move', pointerEvents: 'none' }}
    />
  );
}
