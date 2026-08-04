'use client';

// A free-placed raster image (logo, stamp, photo). Always stored as a PNG
// data URL — see WriteOnPdfWorkspace.js's insertImage(), which re-encodes
// whatever format the user uploaded through a canvas so export can always
// call pdfDoc.embedPng() without format-sniffing branches.
export const interaction = 'select';

export function createDefaults({ src, w, h } = {}) {
  return { src, w, h, opacity: 1 };
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
