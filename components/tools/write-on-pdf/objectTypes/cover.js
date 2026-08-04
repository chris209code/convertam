'use client';

// The "Cover and replace visually" primitive from clickMenu.js: an opaque
// rectangle sized to the existing text item it's placed behind (see
// styleMatchPreview.js's sampleBackgroundColor + fontMatch.js's `box`), with
// a new text object placed on top of it. This visually covers the original
// text but never removes or edits it — the underlying PDF text is still
// there, just painted over — so UI copy anywhere near this must say
// "cover"/"visually replace", never "edit" or "delete".
export const interaction = 'select';

export function createDefaults({ color = '#FFFFFF' } = {}) {
  return { color, opacity: 1, w: 60, h: 20 };
}

export function Content({ obj }) {
  return <div style={{ width: '100%', height: '100%', background: obj.color, opacity: obj.opacity ?? 1, cursor: 'move' }} />;
}
