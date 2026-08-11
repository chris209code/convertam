// Tier 2 of the priority order: proactively scans a page's own pdf.js
// text layer for recognizable blanks — a label immediately followed by a
// run of underscores/dots ("Date: ______"), or a bare run on its own — and
// surfaces them as clickable hotspots, rather than requiring the user to
// click precisely on a thin underline themselves. Always gated behind tier
// 1 (see formFields.js): any hotspot whose rectangle overlaps a real
// AcroForm field is dropped here, before Stage.js ever renders it, so a
// genuine interactive field always wins.
//
// pdf.js's getTextContent() gives one transform/width per text *item*, not
// per character, and a label and its blank are frequently two separate
// items ("Date:" then "______") rather than one run — so detection groups
// items into visual rows first (clustering by baseline y, matching
// fontMatch.js's own tolerance-based approach), concatenates each row into
// one string with a position map back to the contributing item(s), and runs
// the regex over that. Mapping a matched span back to page-space x/w then
// interpolates proportionally across each covering item's own width by
// character count — an approximation (real glyphs aren't equal-width), but
// the same "intelligently approximate, not exact" ceiling every other piece
// of style detection in this tool already commits to.
const LABELED_BLANK_RE = /([A-Za-z][A-Za-z /]{1,20}?)\s*[:\-]\s*(_{3,}|\.{4,})/g;
const BARE_BLANK_RE = /(_{4,}|\.{5,})/g;
const ROW_Y_TOLERANCE_PDF = 3;

function buildRows(items) {
  const rows = [];
  for (const item of items) {
    if (!item.str) continue;
    const y0 = item.transform[5];
    let row = rows.find((r) => Math.abs(r.y0 - y0) <= ROW_Y_TOLERANCE_PDF);
    if (!row) {
      row = { y0, items: [] };
      rows.push(row);
    }
    row.items.push(item);
  }
  rows.forEach((r) => r.items.sort((a, b) => a.transform[4] - b.transform[4]));
  return rows;
}

// Concatenates a row's items left-to-right (single space between items) and
// returns { text, map } where map[i] = { item, localIndex } for building the
// page-space rectangle of any substring later.
function flattenRow(row) {
  let text = '';
  const map = [];
  row.items.forEach((item, idx) => {
    if (idx > 0) { text += ' '; map.push(null); }
    for (let i = 0; i < item.str.length; i++) map.push({ item, localIndex: i });
    text += item.str;
  });
  return { text, map };
}

// Page-space (RENDER_SCALE px, top-left origin) rectangle for the [start,end)
// character span of a flattened row, proportionally interpolating each
// covering item's own width/length — the item boundary itself is exact
// (pdf.js gives that directly), only the position *within* one item's run is
// an estimate.
function spanToPageRect(map, start, end, pageHeightPx, renderScale) {
  const entries = map.slice(start, end).filter(Boolean);
  if (!entries.length) return null;
  let minX = Infinity, maxX = -Infinity, minYPdf = Infinity, maxYPdf = -Infinity;
  for (const { item, localIndex } of entries) {
    const len = item.str.length || 1;
    const charW = (item.width || 0) / len;
    const x0Pdf = item.transform[4] + charW * localIndex;
    const x1Pdf = x0Pdf + charW;
    const heightPdf = item.height || Math.hypot(item.transform[0], item.transform[1]) || 10;
    minX = Math.min(minX, x0Pdf);
    maxX = Math.max(maxX, x1Pdf);
    minYPdf = Math.min(minYPdf, item.transform[5]);
    maxYPdf = Math.max(maxYPdf, item.transform[5] + heightPdf);
  }
  return {
    x: minX * renderScale,
    y: pageHeightPx - maxYPdf * renderScale,
    w: (maxX - minX) * renderScale,
    h: (maxYPdf - minYPdf) * renderScale,
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Returns [{ id, x, y, w, h, label }] in page-space, already filtered
// against `existingFieldRects` (tier-1 AcroForm widgets on this same page —
// pass activePageFields, already page-space rects from formFields.js).
export function detectFieldHotspots(textContent, pageHeightPx, renderScale, existingFieldRects = []) {
  if (!textContent?.items?.length) return [];
  const rows = buildRows(textContent.items);
  const hotspots = [];
  let seq = 0;

  for (const row of rows) {
    const { text, map } = flattenRow(row);
    if (!text.trim()) continue;

    const claimed = []; // [start, end) ranges already turned into a labeled hotspot this row
    LABELED_BLANK_RE.lastIndex = 0;
    let m;
    while ((m = LABELED_BLANK_RE.exec(text))) {
      const blankStart = m.index + m[0].indexOf(m[2]);
      const blankEnd = blankStart + m[2].length;
      const rect = spanToPageRect(map, blankStart, blankEnd, pageHeightPx, renderScale);
      if (rect && rect.w > 0 && rect.h > 0) {
        claimed.push([blankStart, blankEnd]);
        hotspots.push({ id: `hotspot-${seq++}`, ...rect, label: m[1].trim() });
      }
    }

    // Bare runs not already covered by a labeled match above (avoids
    // double-counting the same underscores as both a labeled and unlabeled
    // hotspot when LABELED_BLANK_RE already matched them).
    BARE_BLANK_RE.lastIndex = 0;
    while ((m = BARE_BLANK_RE.exec(text))) {
      const start = m.index;
      const end = start + m[0].length;
      if (claimed.some(([cs, ce]) => start < ce && end > cs)) continue;
      const rect = spanToPageRect(map, start, end, pageHeightPx, renderScale);
      if (rect && rect.w > 0 && rect.h > 0) {
        hotspots.push({ id: `hotspot-${seq++}`, ...rect, label: null });
      }
    }
  }

  if (!existingFieldRects.length) return hotspots;
  return hotspots.filter((h) => !existingFieldRects.some((f) => rectsOverlap(h, f)));
}
