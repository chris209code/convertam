'use client';

import { cssFontFamily, getCachedMeasureFont, measureTextWidthPagePx } from '@/components/shared/fontResolver';
import { DEFAULT_FONT_SIZE, RENDER_SCALE } from '../constants';
import { fitFontSize } from '../autoFit';

export const interaction = 'edit';

export function createDefaults({ color = '#111827' } = {}) {
  return {
    text: '', fontFamily: 'sans', bold: false, italic: false, fontSize: DEFAULT_FONT_SIZE,
    color, align: 'left', opacity: 1, uppercase: false, w: 180, h: 26,
  };
}

// Real DOM content, not a canvas draw function — the actively-edited object
// gets a real <input> (real cursor/selection), and the committed/idle state
// renders the same styling in a plain <div> so there's no visual jump when
// editing starts or ends. See Stage.js for why this tool renders every
// object as DOM rather than mirroring Annotate PDF's canvas-hit-test model.
export function Content({ obj, isEditing, value, onChangeValue, onBlurCommit }) {
  const baseStyle = {
    width: '100%', height: '100%', boxSizing: 'border-box',
    // Longhand font properties, not the `font` shorthand — mixing the
    // shorthand with the longhand `lineHeight` set alongside it triggers a
    // React dev warning on rerender (stale shorthand-expanded values
    // colliding with the explicit longhand) and is fragile in general.
    fontFamily: cssFontFamily(obj.fontFamily), fontSize: obj.fontSize,
    fontWeight: obj.bold ? 700 : 400, fontStyle: obj.italic ? 'italic' : 'normal',
    color: obj.color, opacity: obj.opacity ?? 1,
    textAlign: obj.align || 'left', background: 'transparent', border: 'none', outline: 'none',
    padding: 0, margin: 0, lineHeight: 1.15,
    textTransform: obj.uppercase ? 'uppercase' : 'none',
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

  // Auto Text Fit (autoFit.js): only objects placed against a specific
  // matched width (fitWidth — set at placement time in Stage.js) ever
  // shrink; free-positioned text keeps its own stored fontSize untouched.
  const effectiveFontSize = fitFontSize(obj);
  const idleStyle = { ...baseStyle, fontSize: effectiveFontSize };

  // Horizontal alignment is computed from the same pdf-lib font metrics
  // export will use (measureTextWidthPagePx), not CSS's own text-width
  // calculation — the browser's substitute font for "Helvetica" (usually
  // Arial/Helvetica Neue) doesn't have identical glyph widths to pdf-lib's
  // real Helvetica AFM table, so letting CSS `justify-content` decide
  // center/right placement risked the preview and the downloaded PDF
  // visibly disagreeing on where text lands, especially for longer or bold
  // text. An explicit marginLeft, calculated the same way export positions
  // the glyph run, keeps the two in sync.
  const displayText = obj.uppercase ? obj.text.toUpperCase() : obj.text;
  const measureFont = getCachedMeasureFont(obj);
  const textWidthPagePx = measureFont ? measureTextWidthPagePx(measureFont, displayText, effectiveFontSize, RENDER_SCALE) : 0;
  let marginLeft = 0;
  if (obj.align === 'center') marginLeft = Math.max(0, (obj.w - textWidthPagePx) / 2);
  else if (obj.align === 'right') marginLeft = Math.max(0, obj.w - textWidthPagePx);

  return (
    <div
      style={{
        ...idleStyle, whiteSpace: 'nowrap', overflow: 'hidden', cursor: 'move',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', textAlign: 'left',
      }}
    >
      <span style={{ marginLeft, whiteSpace: 'nowrap' }}>{obj.text}</span>
    </div>
  );
}
