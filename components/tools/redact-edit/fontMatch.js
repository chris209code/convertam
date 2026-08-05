// "Smart" style matching is deliberately scoped to what pdf.js's public,
// documented API can reliably tell us, plus pixel sampling from our own
// already-rendered page — nothing here depends on undocumented internals.
// Reliable: font size (from the text item's transform matrix) and a
// generic font-family bucket (from content.styles[fontName].fontFamily,
// part of the public getTextContent() result). Also reliable, and works
// even on scanned/flattened/non-embedded-font PDFs where font data isn't
// exposed at all: text color, read directly off the rendered pixels.
// Bold/italic/line-height/letter-spacing/alignment aren't reliably
// recoverable this way, so they fall back to sane defaults rather than
// guessing — the spec explicitly allows "intelligently approximate"
// over promising perfect detection.

export function normalizeFontFamily(raw) {
  const s = (raw || '').toLowerCase();
  if (s.includes('courier') || s.includes('mono')) return 'mono';
  // Checked before the generic serif test: pdf.js's public getTextContent()
  // reports plain (non-embedded-name) fonts via a generic CSS fallback
  // family, and "sans-serif" itself contains the substring "serif" — without
  // this check first, ordinary Helvetica/Arial text would be misclassified
  // as the serif bucket.
  if (s.includes('sans')) return 'sans';
  if (s.includes('times') || s.includes('georgia') || s.includes('serif')) return 'serif';
  return 'sans';
}

// Embedded fonts are frequently subsetted with the source font's name still
// visible in the PDF font resource name (e.g. "ABCDEE+Arial-BoldMT"), so a
// keyword check against both the font's declared name and its reported
// family string is a real (if imperfect) signal — clearly better than a
// fixed "never bold" default, without pretending to reliably detect every
// case (a font using a genuinely custom/renamed bold variant won't match).
export function detectWeightStyle(fontName, fontFamilyRaw) {
  const s = `${fontName || ''} ${fontFamilyRaw || ''}`.toLowerCase();
  return {
    bold: /bold|black|heavy|semibold/.test(s),
    italic: /italic|oblique/.test(s),
  };
}

// Reads a small patch of pixels and returns the darkest (lowest-luminance)
// one as the best guess for "ink" color — works for the overwhelmingly
// common case of dark text on a light page background.
export function sampleColorPatch(canvasEl, cx, cy, radius = 6) {
  const ctx = canvasEl.getContext('2d');
  const x0 = Math.max(0, Math.round(cx - radius));
  const y0 = Math.max(0, Math.round(cy - radius));
  const w = Math.min(canvasEl.width - x0, radius * 2);
  const h = Math.min(canvasEl.height - y0, radius * 2);
  if (w <= 0 || h <= 0) return '#111827';
  let data;
  try {
    data = ctx.getImageData(x0, y0, w, h).data;
  } catch {
    return '#111827';
  }
  let best = null;
  let bestLum = Infinity;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 200) continue;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum < bestLum) { bestLum = lum; best = [r, g, b]; }
  }
  if (!best || bestLum > 235) return '#111827'; // patch is essentially blank — fall back
  return '#' + best.map((c) => c.toString(16).padStart(2, '0')).join('');
}

export function sampleColorAt(canvasEl, xPx, yPx) {
  return sampleColorPatch(canvasEl, xPx, yPx, 5);
}

// posPage: click position in page-space (canvas px, y-down, origin top-left).
// textContent: result of page.getTextContent() for this page.
// renderScale: the pdf.js viewport scale used to build our page canvas (1.5).
// pageCanvas / pageHeightPx: the rendered page image + its pixel height, for color sampling.
export function sampleStyleNear(posPage, textContent, pageCanvas, pageHeightPx, renderScale) {
  if (!textContent || !textContent.items?.length) return null;

  const pdfX = posPage.x / renderScale;
  const pdfY = (pageHeightPx - posPage.y) / renderScale;

  let best = null;
  let bestDist = Infinity;
  for (const item of textContent.items) {
    if (!item.str || !item.str.trim()) continue;
    const [a, b] = item.transform;
    const fontSizePdf = Math.hypot(a, b) || 10;
    const heightPdf = item.height || fontSizePdf;
    const x0 = item.transform[4];
    const y0 = item.transform[5];
    const cx = x0 + (item.width || 0) / 2;
    const cy = y0 + heightPdf / 2;
    const dist = Math.hypot(pdfX - cx, pdfY - cy);
    if (dist < bestDist) {
      bestDist = dist;
      best = { item, fontSizePdf, x0, y0, heightPdf };
    }
  }
  // Beyond ~70pt away (roughly a full paragraph line or more), the nearest
  // text item isn't a meaningful style hint anymore.
  if (!best || bestDist > 70) return null;

  const styleInfo = textContent.styles?.[best.item.fontName];
  const fontFamily = normalizeFontFamily(styleInfo?.fontFamily);
  const { bold, italic } = detectWeightStyle(best.item.fontName, styleInfo?.fontFamily);

  let color = '#111827';
  if (pageCanvas) {
    const sampleCanvasX = (best.x0 + best.heightPdf * 0.3) * renderScale;
    const sampleCanvasY = pageHeightPx - (best.y0 + best.heightPdf * 0.35) * renderScale;
    color = sampleColorPatch(pageCanvas, sampleCanvasX, sampleCanvasY, 4);
  }

  // best.y0 is the PDF-space (bottom-left origin) baseline of the matched
  // text item — converting it to page-space (canvas px, top-left origin,
  // the same space annotation/placement code already works in) lets a
  // caller snap a new text object's insertion point to it, so typed text
  // sits on the same visual line as its neighbor instead of at the raw
  // click position.
  const baselinePageSpaceY = pageHeightPx - best.y0 * renderScale;

  // Page-space (canvas px, top-left origin) bounding box of the matched text
  // item itself — used by callers that need to visually cover the original
  // run (e.g. a "cover and replace" patch), not just snap to its baseline.
  // A couple of page-space px of padding on each side accounts for anti-
  // aliased glyph edges and the fact that item.width/heightPdf are the
  // glyph metrics, not a rendered-ink bounding box.
  const PAD = 2;
  const box = {
    x: best.x0 * renderScale - PAD,
    y: pageHeightPx - (best.y0 + best.heightPdf) * renderScale - PAD,
    w: (best.item.width || 0) * renderScale + PAD * 2,
    h: best.heightPdf * renderScale + PAD * 2,
  };

  return {
    fontFamily,
    bold,
    italic,
    fontSizePx: Math.round(clampReasonable(best.fontSizePdf * renderScale)),
    color,
    baselinePageSpaceY,
    box,
    distancePdf: bestDist,
  };
}

function clampReasonable(px) {
  return Math.min(120, Math.max(8, px));
}

// A page-wide fallback for when a click lands nowhere near any specific
// text item (sampleStyleNear's ~70pt cutoff, or a click in genuine empty
// space) — rather than a single hardcoded default (which is what produced
// a mismatched font/size when the page's own body text used something
// else entirely), this picks whichever {family, size} combination appears
// most often across the page's own text. Still an approximation (most
// pages mix a few sizes for headings/body/footers), but far more often
// right than one fixed guess, and it's what a manual override in the UI
// then corrects the remaining cases.
export function detectDominantPageStyle(textContent) {
  if (!textContent || !textContent.items?.length) return null;
  const counts = new Map(); // "family|bold|italic|roundedSize" -> { count, fontFamily, bold, italic, fontSizePdf }
  for (const item of textContent.items) {
    if (!item.str || !item.str.trim()) continue;
    const [a, b] = item.transform;
    const fontSizePdf = Math.hypot(a, b) || 10;
    const styleInfo = textContent.styles?.[item.fontName];
    const fontFamily = normalizeFontFamily(styleInfo?.fontFamily);
    const { bold, italic } = detectWeightStyle(item.fontName, styleInfo?.fontFamily);
    const roundedSize = Math.round(fontSizePdf);
    const key = `${fontFamily}|${bold}|${italic}|${roundedSize}`;
    const existing = counts.get(key);
    if (existing) existing.count += item.str.length;
    else counts.set(key, { count: item.str.length, fontFamily, bold, italic, fontSizePdf: roundedSize });
  }
  if (!counts.size) return null;
  let best = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return { fontFamily: best.fontFamily, bold: best.bold, italic: best.italic, fontSizePdf: best.fontSizePdf };
}
