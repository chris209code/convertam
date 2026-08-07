'use client';

// Page Numbers is a "rule" object, not a static placement: wherever it's
// dropped becomes the position used on every page it applies to (see
// pagesRule), and the export step (PdfLayoutStudioWorkspace.js's
// handleApply) draws it once per matching page with that page's own
// number substituted in — never just onto the single page it happens to
// be selected/edited on. `pagesRule` is intentionally limited to
// all/current for this phase; odd/even/custom ranges are the "Page
// Selection" system planned as a later, cross-cutting feature for every
// element type, not something to half-build here first.
export const interaction = 'select';

export function createDefaults({ color = '#111827' } = {}) {
  return { color, fontSize: 12, format: 'pageOfTotal', pagesRule: 'all', align: 'center', opacity: 1, w: 140, h: 22 };
}

export function formatPageNumberText(format, pageNumber, totalPages) {
  return format === 'number' ? String(pageNumber) : `Page ${pageNumber} of ${totalPages}`;
}

// `pageCount` is passed down from the workspace (Stage.js forwards it to
// every Content component) purely so this preview can show a believable
// "Page N of Total" — it plays no role in any other object type.
export function Content({ obj, pageCount }) {
  const previewPageNumber = (obj.page ?? 0) + 1;
  const text = formatPageNumberText(obj.format, previewPageNumber, pageCount || previewPageNumber);
  const justify = obj.align === 'left' ? 'flex-start' : obj.align === 'right' ? 'flex-end' : 'center';
  return (
    <div
      style={{
        width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: justify,
        fontSize: obj.fontSize, color: obj.color, opacity: obj.opacity ?? 1, cursor: 'move', whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
}
