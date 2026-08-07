'use client';

// Letterhead is a page-spanning "rule" object, architecturally like
// pageNumber.js — one placed object can apply across many pages rather than
// living on a single page (see pagesRule). Its `mode` governs HOW it's
// placed on each target page:
//
// - 'overlay': manual, unconditional placement. The object's own x/y/w/h —
//   wherever the user dragged/resized it on whichever page they were
//   viewing — is stamped identically onto every target page. No detection,
//   no per-page adaptation: "I say exactly where it goes."
// - 'scaleToFit': deterministic, content-blind placement. The object's own
//   w/h becomes a fixed band size that's fit flush against the page's top
//   or bottom edge (per `zone`) on every target page, at the same x — the
//   same visual band every time, regardless of what's on each page.
// - 'smartLayout': content-aware placement. On export, each target page's
//   own Smart Detection result (see ../letterheadDetection.js) determines
//   how tall the letterhead can be in that page's actual top/bottom
//   whitespace, shrinking (never enlarging past the reference w/h) to fit.
//   Pages with too little whitespace are skipped with a disclosed warning
//   rather than silently overlapping real text.
//
// All three modes draw the same underlying image via pdf-lib's drawImage
// on export, exactly like the Image/Logo element types — only the per-page
// placement math differs (see PdfLayoutStudioWorkspace.js's handleApply).
export const interaction = 'select';

export function createDefaults({ src, w, h, naturalWidth, naturalHeight } = {}) {
  return {
    src, w, h, naturalWidth: naturalWidth || w, naturalHeight: naturalHeight || h,
    lockAspect: true, mode: 'overlay', zone: 'top', pagesRule: 'all', opacity: 1,
  };
}

export function Content({ obj }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={obj.src}
      alt=""
      draggable={false}
      style={{ width: '100%', height: '100%', objectFit: 'fill', opacity: obj.opacity ?? 1, cursor: 'move', pointerEvents: 'none' }}
    />
  );
}
