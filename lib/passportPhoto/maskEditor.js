// Manual mask-refinement primitives — used when automatic segmentation is
// unavailable or flagged low-confidence, and available any time the user
// wants to fix a spot the model got wrong.

// Soft circular brush painting toward `value` (255 to restore/keep the
// subject, 0 to remove background) with a falloff at the edge so strokes
// blend rather than leaving a hard-edged circle.
export function paintBrush(mask, width, height, cx, cy, radius, value) {
  const r2 = radius * radius;
  const minX = Math.max(0, Math.floor(cx - radius));
  const maxX = Math.min(width - 1, Math.ceil(cx + radius));
  const minY = Math.max(0, Math.floor(cy - radius));
  const maxY = Math.min(height - 1, Math.ceil(cy + radius));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const idx = y * width + x;
      const falloff = 1 - Math.sqrt(d2) / radius; // 1 at center, 0 at edge
      const strength = Math.min(1, falloff * 1.6);
      mask[idx] = mask[idx] * (1 - strength) + value * strength;
    }
  }
}

export function cloneMask(mask) {
  return new Uint8ClampedArray(mask);
}

// Bounded undo/redo over mask snapshots — kept as a small plain-object
// stack rather than a class so it's trivial to hold in React state/refs.
const MAX_HISTORY = 25;

export function createMaskHistory(initialMask) {
  return { stack: [cloneMask(initialMask)], index: 0 };
}

export function pushMaskHistory(history, mask) {
  const truncated = history.stack.slice(0, history.index + 1);
  truncated.push(cloneMask(mask));
  while (truncated.length > MAX_HISTORY) truncated.shift();
  return { stack: truncated, index: truncated.length - 1 };
}

export function undoMaskHistory(history) {
  if (history.index <= 0) return null;
  const index = history.index - 1;
  return { history: { ...history, index }, mask: cloneMask(history.stack[index]) };
}

export function redoMaskHistory(history) {
  if (history.index >= history.stack.length - 1) return null;
  const index = history.index + 1;
  return { history: { ...history, index }, mask: cloneMask(history.stack[index]) };
}
