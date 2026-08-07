'use client';

// Watermark is a page-spanning "rule" object, architecturally the same as
// pageNumber.js and letterhead.js — one placed object applies its text to
// every page it targets (pagesRule), drawn once per matching page at
// export. Deliberately lighter-weight than the standalone Watermark PDF
// tool (components/tools/WatermarkPdfWorkspace.js): rather than its own
// color-swatch/opacity-preset/click-to-position UI, this element reuses
// the Properties panel's already-generic Position/Rotation/Opacity
// controls (every object type gets those for free) — its own type-specific
// fields are just the text and color. The real differentiator from the
// standalone tool isn't more watermark features, it's composability: this
// version lives on the same canvas as text, images, letterheads, and
// stamps, undoes/redoes with them, and exports as one combined layout.
export const interaction = 'edit';

export function createDefaults({ color = '#94A3B8', text = 'CONFIDENTIAL' } = {}) {
  return {
    text, color, fontSize: 60, opacity: 0.16, pagesRule: 'all',
    rotation: -45, w: 420, h: 100,
  };
}

export function Content({ obj, isEditing, value, onChangeValue, onBlurCommit }) {
  const baseStyle = {
    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Arial, sans-serif', fontWeight: 800, fontSize: obj.fontSize,
    color: obj.color, opacity: obj.opacity ?? 1, letterSpacing: 2,
    textTransform: 'uppercase', whiteSpace: 'nowrap', userSelect: 'none',
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={(e) => onChangeValue(e.target.value)}
        onBlur={onBlurCommit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
        }}
        style={{ ...baseStyle, textAlign: 'center', outline: 'none', border: 'none', background: 'transparent', padding: 0 }}
      />
    );
  }

  return <div style={{ ...baseStyle, cursor: 'move' }}>{obj.text}</div>;
}
