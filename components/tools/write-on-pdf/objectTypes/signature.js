'use client';

// Signature/initials: rendered identically to a plain image (both are PNG
// data URLs), kept as its own object `type` purely so labels/copy can say
// "Signature"/"Initials" rather than the generic "Image". Placement UI is
// annotate-pdf/SignaturePad.js, imported directly and unchanged — its
// draw/type/upload capture flow has no canvas-rendering coupling, so it's
// genuine drop-in reuse (unlike the canvas-drawn object types in that
// tool's own objectTypes/, which are not reused here).
export const interaction = 'select';

export function createDefaults({ src, w, h, kind = 'signature' } = {}) {
  return { src, w, h, kind, opacity: 1 }; // kind: 'signature' | 'initials'
}

export function Content({ obj }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={obj.src}
      alt={obj.kind === 'initials' ? 'Initials' : 'Signature'}
      draggable={false}
      style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: obj.opacity ?? 1, cursor: 'move', pointerEvents: 'none' }}
    />
  );
}
