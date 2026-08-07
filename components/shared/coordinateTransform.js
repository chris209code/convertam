// Pure client-space <-> page-space coordinate math for canvas-based PDF
// editing stages. Annotation/element objects are always authored in raw,
// unrotated "page-space" pixels (the same pixel space as the offscreen page
// bitmap, at each tool's own RENDER_SCALE) — never pre-multiplied by zoom or
// pan. The canvas (and, in some tools, DOM-overlay nodes on top of it) is
// what gets resized/translated via CSS to fit the viewport; these helpers
// read the element's live `getBoundingClientRect()` to convert between the
// two spaces, so they keep working unmodified as zoom/pan are layered on —
// resizing or translating the canvas via CSS updates its bounding rect, and
// that's the only thing this math depends on.
//
// Originally built for Annotate PDF, then reused by Write on PDF, then
// moved here (matching the precedent already set by useObjectHistory.js and
// useKeyboardShortcuts.js) once a third tool — PDF Layout Studio — needed
// the identical math.
//
// Rotation is the one case that needs more than a simple scale factor: a
// rotated element's axis-aligned bounding rect no longer has a simple
// width/height ratio back to page-space, so `getPointerPageSpace` unrotates
// the pointer position around the page's center before applying the scale
// factor. Tools that don't support page rotation simply never pass
// `rotationDegrees`, making it a no-op.

export function getPointerPageSpace(clientPoint, canvasEl, { rotationDegrees = 0 } = {}) {
  const rect = canvasEl.getBoundingClientRect();
  const scaleX = canvasEl.width / rect.width;
  const scaleY = canvasEl.height / rect.height;
  let x = (clientPoint.x - rect.left) * scaleX;
  let y = (clientPoint.y - rect.top) * scaleY;
  if (rotationDegrees) {
    const cx = canvasEl.width / 2;
    const cy = canvasEl.height / 2;
    const rad = (-rotationDegrees * Math.PI) / 180;
    const dx = x - cx;
    const dy = y - cy;
    x = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
    y = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
  }
  return { x, y };
}

// Screen-space offset (relative to `wrapperEl`) of a page-space point —
// used to position a DOM overlay (an editor textarea, or an entire
// DOM-rendered object) exactly on top of the canvas-drawn page it
// corresponds to.
export function pageSpaceToWrapperOffset(point, canvasEl, wrapperEl, displayScale) {
  const wrapperRect = wrapperEl.getBoundingClientRect();
  const canvasRect = canvasEl.getBoundingClientRect();
  const offsetX = canvasRect.left - wrapperRect.left;
  const offsetY = canvasRect.top - wrapperRect.top;
  return { left: offsetX + point.x * displayScale, top: offsetY + point.y * displayScale };
}

// Fit-to-width scale factor, clamped to a sane range — the "zoom" level
// before the user has manually zoomed in/out (tools multiply this base
// scale by a user-controlled zoom factor rather than replacing it).
export function computeFitToWidthScale(pageWidth, availableWidth, { min = 0.15, max = 1 } = {}) {
  return Math.min(max, Math.max(min, availableWidth / pageWidth));
}
