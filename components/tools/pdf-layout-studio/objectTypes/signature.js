'use client';

// A captured signature or initials image — near-identical to image.js, kept
// as its own type purely for labeling ("Signature" vs generic "Image") and
// so future signature-specific behavior (e.g. auto-placement on a detected
// signature line) has a distinct type to hook into without touching plain
// images. Always a PNG data URL (see components/shared/SignaturePad.js).
export const interaction = 'select';

export function createDefaults({ src, w, h, naturalWidth, naturalHeight, kind = 'signature' } = {}) {
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
