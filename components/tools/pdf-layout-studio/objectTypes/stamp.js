'use client';

import { STAMP_PRESETS } from '../constants';

// Professional Stamps — a single-page placement (not a page-spanning rule
// object, unlike Watermark/Page Numbers) since a stamp usually
// marks one specific page (e.g. the signature page), not the whole
// document. Rendered as a bordered box with centered label text rather
// than a pre-rendered bitmap, so color/size/rotation stay fully editable —
// on export it draws via the same drawRectangle+drawText primitives
// already used for shapes and text (see PdfLayoutStudioWorkspace.js's
// handleApply), reusing that rotation-correction math rather than
// duplicating it.
export const interaction = 'select';

export function createDefaults({ presetId = 'approved' } = {}) {
  const preset = STAMP_PRESETS.find((p) => p.id === presetId) || STAMP_PRESETS[0];
  return {
    presetId, label: preset.label, color: preset.color,
    borderWidth: 3, fontSize: 20, opacity: 0.9,
    w: 180, h: 56, rotation: -8,
  };
}

export function Content({ obj }) {
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: `${obj.borderWidth}px solid ${obj.color}`, borderRadius: 6,
        color: obj.color, opacity: obj.opacity ?? 1, cursor: 'move',
        fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: obj.fontSize,
        letterSpacing: 2, textTransform: 'uppercase', textAlign: 'center',
        userSelect: 'none', background: 'transparent', padding: '0 6px',
      }}
    >
      {obj.label}
    </div>
  );
}
