'use client';

import { cssFontFamily, getCachedMeasureFont, measureTextWidthPagePx } from '@/components/shared/fontResolver';
import { DEFAULT_FONT_SIZE, RENDER_SCALE } from '../constants';

export const interaction = 'edit';

// Single-line by design (like Write on PDF's text object) — this keeps the
// center/right alignment math below exact against pdf-lib's real export
// metrics. Multi-line paragraph text (word-wrap across several lines, each
// with its own measured width) is real additional work, deliberately left
// for a later phase rather than shipped as an approximation now.
export function createDefaults({ color = '#111827', text = '' } = {}) {
  return {
    text, fontFamily: 'sans', fontSize: DEFAULT_FONT_SIZE, bold: false, italic: false, underline: false,
    color, align: 'left', opacity: 1, letterSpacing: 0,
    background: null, borderColor: null, borderWidth: 0,
    w: 220, h: 32,
  };
}

// Real DOM content, not a canvas draw function — the actively-edited object
// gets a real <input> (real cursor/selection), and the committed/idle state
// renders the same styling in a plain <div> so there's no visual jump when
// editing starts or ends.
export function Content({ obj, isEditing, value, onChangeValue, onBlurCommit }) {
  const baseStyle = {
    width: '100%', height: '100%', boxSizing: 'border-box',
    fontFamily: cssFontFamily(obj.fontFamily), fontSize: obj.fontSize,
    fontWeight: obj.bold ? 700 : 400, fontStyle: obj.italic ? 'italic' : 'normal',
    textDecoration: obj.underline ? 'underline' : 'none',
    letterSpacing: obj.letterSpacing ? `${obj.letterSpacing}px` : 'normal',
    color: obj.color, opacity: obj.opacity ?? 1,
    background: obj.background || 'transparent',
    border: obj.borderWidth > 0 ? `${obj.borderWidth}px solid ${obj.borderColor || '#111827'}` : 'none',
    textAlign: obj.align || 'left', outline: 'none',
    padding: 0, margin: 0, lineHeight: 1.15,
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
        style={baseStyle}
      />
    );
  }

  // Horizontal alignment is computed from the same pdf-lib font metrics
  // export will use (measureTextWidthPagePx), not CSS's own text-width
  // calculation — the browser's substitute font for "Helvetica" doesn't
  // have identical glyph widths to pdf-lib's real Helvetica AFM table, so
  // letting CSS decide center/right placement risked the preview and the
  // downloaded PDF visibly disagreeing on where text lands. An explicit
  // marginLeft, calculated the same way export positions the glyph run,
  // keeps the two in sync. (Letter-spacing is a CSS-only visual nicety here
  // — it isn't replicated in the exported PDF, which draws plain pdf-lib
  // text; this is a real, disclosed limitation rather than a hidden one.)
  const measureFont = getCachedMeasureFont(obj);
  const textWidthPagePx = measureFont ? measureTextWidthPagePx(measureFont, obj.text, obj.fontSize, RENDER_SCALE) : 0;
  let marginLeft = 0;
  if (obj.align === 'center') marginLeft = Math.max(0, (obj.w - textWidthPagePx) / 2);
  else if (obj.align === 'right') marginLeft = Math.max(0, obj.w - textWidthPagePx);

  return (
    <div
      style={{
        ...baseStyle, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'move',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left',
      }}
    >
      <span style={{ marginLeft, whiteSpace: 'nowrap' }}>{obj.text}</span>
    </div>
  );
}
