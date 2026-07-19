export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Corner handles are sized in page-space (canvas-pixel) units but scaled up
// when the page is displayed smaller than its native resolution (mobile,
// narrow viewports), so the physical tap target stays roughly constant.
export function handleSize(scale) {
  return Math.max(10, 16 * scale);
}

export function pointInRect(pos, r) {
  return pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h;
}

export function handleAt(pos, r, scale) {
  const s = handleSize(scale);
  const corners = {
    nw: { x: r.x, y: r.y },
    ne: { x: r.x + r.w, y: r.y },
    sw: { x: r.x, y: r.y + r.h },
    se: { x: r.x + r.w, y: r.y + r.h },
  };
  for (const [name, c] of Object.entries(corners)) {
    if (Math.abs(pos.x - c.x) <= s && Math.abs(pos.y - c.y) <= s) return name;
  }
  return null;
}

export function resizeRect(orig, handle, pos, bounds) {
  let x = orig.x, y = orig.y, x2 = orig.x + orig.w, y2 = orig.y + orig.h;
  if (handle.includes('w')) x = Math.min(pos.x, x2 - 4);
  if (handle.includes('e')) x2 = Math.max(pos.x, x + 4);
  if (handle.includes('n')) y = Math.min(pos.y, y2 - 4);
  if (handle.includes('s')) y2 = Math.max(pos.y, y + 4);
  if (bounds) {
    x = clamp(x, 0, bounds.width);
    y = clamp(y, 0, bounds.height);
    x2 = clamp(x2, 0, bounds.width);
    y2 = clamp(y2, 0, bounds.height);
  }
  return { ...orig, x, y, w: x2 - x, h: y2 - y };
}

// Local-delta resize used by text objects: handle drag deltas are already
// expressed in page-space (post-scale-division), and the opposite corner is
// kept fixed. Rotation is intentionally ignored here (resize deltas are
// applied along the box's own unrotated axes) — correctly compensating for
// an active rotation while resizing is a much harder pivot-math problem,
// and rotate+resize-together is a rare enough combination that a small
// precision quirk there is an acceptable, honestly-scoped trade-off.
export function resizeLocal(orig, handle, dx, dy, minW = 24, minH = 18) {
  let { x, y, w, h } = orig;
  let newW = w, newH = h, newX = x, newY = y;
  if (handle.includes('e')) newW = Math.max(minW, w + dx);
  if (handle.includes('w')) { newW = Math.max(minW, w - dx); newX = x + (w - newW); }
  if (handle.includes('s')) newH = Math.max(minH, h + dy);
  if (handle.includes('n')) { newH = Math.max(minH, h - dy); newY = y + (h - newH); }
  return { ...orig, x: newX, y: newY, w: newW, h: newH };
}
