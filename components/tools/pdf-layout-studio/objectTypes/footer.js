'use client';

// Footer is a page-spanning "rule" object like pageNumber.js — one placed
// object applies its text to every page it targets (pagesRule). It's
// deliberately a distinct element from Page Numbers rather than an
// overlapping duplicate: Page Numbers only ever formats "Page X of Y"
// text, with no free-text field and no divider line, while Footer is a
// user-authored message (e.g. a confidentiality line or company name)
// that can optionally append a live page-number suffix and/or a thin
// separator line above it — the two are meant to be used together
// (a Footer with includePageNumber off, plus a separate Page Numbers
// element elsewhere) or Footer alone can cover both needs at once.
export const interaction = 'edit';

export function createDefaults({ color = '#64748B', text = 'Confidential' } = {}) {
  return {
    text, includePageNumber: false, showDivider: true,
    fontSize: 10, color, align: 'center', opacity: 1, pagesRule: 'all',
    w: 300, h: 28,
  };
}

// Builds the footer's rendered text for a given page, combining the
// user's own text with an optional live page-number suffix. Shared
// between the live preview (Content, below) and export (handleApply).
export function buildFooterText(obj, pageNumber, totalPages) {
  if (!obj.includePageNumber) return obj.text;
  const pageLabel = `Page ${pageNumber} of ${totalPages}`;
  return obj.text ? `${obj.text}   •   ${pageLabel}` : pageLabel;
}

export function Content({ obj, isEditing, value, onChangeValue, onBlurCommit, pageCount }) {
  const justify = obj.align === 'left' ? 'flex-start' : obj.align === 'right' ? 'flex-end' : 'center';
  const previewPageNumber = (obj.page ?? 0) + 1;
  const textStyle = {
    fontFamily: 'inherit', fontSize: obj.fontSize, color: obj.color, opacity: obj.opacity ?? 1, whiteSpace: 'nowrap',
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: isEditing ? 'text' : 'move' }}>
      {obj.showDivider && <div style={{ borderTop: `1px solid ${obj.color}`, opacity: 0.4, marginBottom: 4 }} />}
      {isEditing ? (
        <input
          autoFocus
          value={value}
          onChange={(e) => onChangeValue(e.target.value)}
          onBlur={onBlurCommit}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur();
          }}
          style={{ ...textStyle, textAlign: obj.align || 'center', outline: 'none', border: 'none', background: 'transparent', padding: 0, width: '100%' }}
        />
      ) : (
        <div style={{ display: 'flex', justifyContent: justify, ...textStyle }}>
          {buildFooterText(obj, previewPageNumber, pageCount || previewPageNumber) || ' '}
        </div>
      )}
    </div>
  );
}
