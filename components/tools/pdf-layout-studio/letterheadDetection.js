// Smart Detection for the Letterhead element's "Smart Layout" mode.
//
// Deliberately scoped to what's reliably recoverable: pdf.js's public
// getTextContent() API gives real text item positions (works even for
// PDFs whose fonts aren't embedded), which is enough to answer the one
// question Smart Layout actually needs — "how much clear vertical space
// exists at the top/bottom of THIS page before real content starts?" — for
// every target page individually. This is intentionally a vertical-band
// detector, not a full 2D free-space solver: a letterhead occupies a
// horizontal strip across the page, so only the vertical extent of the
// nearest text matters for deciding how tall it can be without overlapping
// content. No OCR, no layout-structure inference — if a page is a scanned
// image with no extractable text, its "safe zone" is honestly reported as
// the full page height (nothing to avoid), which mode's caller can still
// bound sensibly.

// Converts pdf.js getTextContent() items (raw PDF user-space coordinates,
// y-up, origin bottom-left) into simple {top, bottom} bounding boxes in
// page-space px (y-down, origin top-left, RENDER_SCALE-scaled) — the same
// coordinate space every placed object's x/y already lives in.
export function extractTextBoxes(textContent, pageHeightPx, renderScale) {
  if (!textContent?.items?.length) return [];
  return textContent.items
    .filter((item) => item.str && item.str.trim())
    .map((item) => {
      const heightPdf = item.height || Math.hypot(item.transform[0], item.transform[1]) || 10;
      const y0 = item.transform[5];
      const top = pageHeightPx - (y0 + heightPdf) * renderScale;
      const bottom = pageHeightPx - y0 * renderScale;
      return { top, bottom };
    });
}

// Returns how many page-space px of clear vertical space exist at the
// page's `zone` edge ('top' or 'bottom') before the nearest real text item.
export function detectSafeZoneHeight(textBoxes, pageHeight, zone) {
  if (!textBoxes || !textBoxes.length) return pageHeight;
  if (zone === 'bottom') {
    const maxBottom = Math.max(...textBoxes.map((b) => b.bottom));
    return Math.max(0, pageHeight - maxBottom);
  }
  const minTop = Math.min(...textBoxes.map((b) => b.top));
  return Math.max(0, minTop);
}
