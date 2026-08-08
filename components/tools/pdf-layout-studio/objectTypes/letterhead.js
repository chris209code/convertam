'use client';

// Letterhead is a page-spanning "rule" object, architecturally like
// pageNumber.js — one placed object can apply across many pages (see
// pagesRule). Its `mode` governs HOW it's placed on each target page:
//
// - 'overlay': manual, unconditional placement. The object's own x/y/w/h —
//   wherever the user dragged/resized it on whichever page they were
//   viewing — is stamped identically onto every target page. No
//   awareness of what's underneath, so it can cover existing content;
//   `solidBackground` optionally paints an opaque rect behind the image
//   first, for letterhead PNGs with transparent areas that would
//   otherwise let the covered content show through unevenly.
// - 'pushDown': the object's own height becomes a reserved band flush
//   against the page's TOP edge on every target page. The page's own
//   pre-existing content is shifted down by that height (via pdf-lib's
//   embedPage/drawPage — the whole page is treated as one atomic block,
//   not reflowed paragraph-by-paragraph, which no PDF tool can do
//   reliably) so nothing gets covered, then the letterhead is drawn in
//   the vacated strip. `shrinkToFit` (default true) scales that shifted
//   block down just enough to guarantee it still fits below the band;
//   with it off, content already close to the bottom of the page can be
//   pushed past the page edge and lost — see pdfExport.js's
//   applyLetterheadPushDown() for the actual page-restructuring logic.
//   Only affects the ORIGINAL PDF's own content — other elements placed
//   with this tool (text, stamps, page numbers, ...) keep their own
//   position and are not shifted along with it.
//
// All modes draw the same underlying image via pdf-lib's drawImage on
// export, exactly like the Image/Logo element types — only the per-page
// placement math differs (see pdfExport.js).
export const interaction = 'select';

export function createDefaults({ src, w, h, naturalWidth, naturalHeight } = {}) {
  return {
    src, w, h, naturalWidth: naturalWidth || w, naturalHeight: naturalHeight || h,
    lockAspect: true, mode: 'overlay', pagesRule: 'all', opacity: 1,
    solidBackground: false, backgroundColor: '#FFFFFF',
    shrinkToFit: true,
  };
}

export function Content({ obj }) {
  return (
    <div style={{ width: '100%', height: '100%', background: obj.mode === 'overlay' && obj.solidBackground ? obj.backgroundColor : 'transparent' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={obj.src}
        alt=""
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'fill', opacity: obj.opacity ?? 1, cursor: 'move', pointerEvents: 'none' }}
      />
    </div>
  );
}
