// Annotation object model + drawing/hit-testing, all in canvas-native pixel
// space. Five types: highlight, blur, arrow, callout, number. Kept as a
// flat array of plain objects (like Redact PDF's rect/text model) so
// undo/redo and serialization stay trivial if ever needed.
export const HANDLE_SIZE = 10;

export function createAnnotation(type, canvasW, canvasH, extra = {}) {
  const id = `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const cx = canvasW / 2, cy = canvasH / 2;
  switch (type) {
    case 'highlight':
    case 'blur':
      return { id, type, x: cx - canvasW * 0.12, y: cy - canvasH * 0.08, w: canvasW * 0.24, h: canvasH * 0.16 };
    case 'callout':
      return { id, type, x: cx - canvasW * 0.15, y: cy - canvasH * 0.1, w: canvasW * 0.3, h: canvasH * 0.12, text: extra.text || 'Note' };
    case 'arrow':
      return { id, type, x1: cx - canvasW * 0.12, y1: cy + canvasH * 0.1, x2: cx + canvasW * 0.12, y2: cy - canvasH * 0.1 };
    case 'number':
      return { id, type, x: cx, y: cy, n: extra.n || 1 };
    default:
      return { id, type, x: cx, y: cy, w: 100, h: 100 };
  }
}

function drawSelectionBox(ctx, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.fillStyle = '#2563EB';
  [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([hx, hy]) => {
    ctx.beginPath();
    ctx.arc(hx, hy, HANDLE_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export function drawAnnotation(ctx, ann, { selected, interactive = true } = {}) {
  switch (ann.type) {
    case 'highlight': {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.42)';
      ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
      if (selected && interactive) drawSelectionBox(ctx, ann.x, ann.y, ann.w, ann.h);
      break;
    }
    case 'blur': {
      // The actual blur is baked into the base image separately (see
      // applyBlurRegion) — this outline is purely an editing aid, so it
      // must never appear in a real export.
      if (!interactive) break;
      ctx.save();
      ctx.strokeStyle = 'rgba(37,99,235,0.9)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 2;
      ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
      ctx.restore();
      if (selected && interactive) drawSelectionBox(ctx, ann.x, ann.y, ann.w, ann.h);
      break;
    }
    case 'callout': {
      const r = Math.min(16, ann.h * 0.2);
      ctx.beginPath();
      ctx.moveTo(ann.x + r, ann.y);
      ctx.arcTo(ann.x + ann.w, ann.y, ann.x + ann.w, ann.y + ann.h, r);
      ctx.arcTo(ann.x + ann.w, ann.y + ann.h, ann.x, ann.y + ann.h, r);
      ctx.arcTo(ann.x, ann.y + ann.h, ann.x, ann.y, r);
      ctx.arcTo(ann.x, ann.y, ann.x + ann.w, ann.y, r);
      ctx.lineTo(ann.x + ann.w * 0.3, ann.y + ann.h);
      ctx.lineTo(ann.x + ann.w * 0.18, ann.y + ann.h + ann.h * 0.28);
      ctx.lineTo(ann.x + ann.w * 0.42, ann.y + ann.h);
      ctx.closePath();
      ctx.fillStyle = '#FDE68A';
      ctx.fill();
      ctx.strokeStyle = '#B45309';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#78350F';
      const fontSize = Math.max(11, Math.min(ann.h * 0.28, ann.w * 0.09));
      ctx.font = `700 ${fontSize}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ann.text || '', ann.x + ann.w / 2, ann.y + ann.h / 2, ann.w - 12);
      if (selected && interactive) drawSelectionBox(ctx, ann.x, ann.y, ann.w, ann.h);
      break;
    }
    case 'arrow': {
      ctx.save();
      ctx.strokeStyle = '#DC2626';
      ctx.fillStyle = '#DC2626';
      ctx.lineWidth = Math.max(3, 0.008 * Math.hypot(ann.x2 - ann.x1, ann.y2 - ann.y1) + 2);
      ctx.beginPath();
      ctx.moveTo(ann.x1, ann.y1);
      ctx.lineTo(ann.x2, ann.y2);
      ctx.stroke();
      const angle = Math.atan2(ann.y2 - ann.y1, ann.x2 - ann.x1);
      const headLen = 16;
      ctx.beginPath();
      ctx.moveTo(ann.x2, ann.y2);
      ctx.lineTo(ann.x2 - headLen * Math.cos(angle - Math.PI / 7), ann.y2 - headLen * Math.sin(angle - Math.PI / 7));
      ctx.lineTo(ann.x2 - headLen * Math.cos(angle + Math.PI / 7), ann.y2 - headLen * Math.sin(angle + Math.PI / 7));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (selected && interactive) {
        ctx.fillStyle = '#2563EB';
        [[ann.x1, ann.y1], [ann.x2, ann.y2]].forEach(([hx, hy]) => {
          ctx.beginPath(); ctx.arc(hx, hy, HANDLE_SIZE / 2, 0, Math.PI * 2); ctx.fill();
        });
      }
      break;
    }
    case 'number': {
      const r = 18;
      ctx.beginPath();
      ctx.arc(ann.x, ann.y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#2563EB';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${r}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(ann.n), ann.x, ann.y + 1);
      if (selected && interactive) {
        ctx.strokeStyle = '#2563EB';
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc(ann.x, ann.y, r + 6, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      break;
    }
  }
}

// Cheap, dependency-free blur: downscale the region then draw it back up —
// the interpolation on the upscale is what produces the blur.
export function applyBlurRegion(ctx, x, y, w, h, strength = 12) {
  if (w <= 0 || h <= 0) return;
  const factor = Math.max(1, strength);
  const smallW = Math.max(1, Math.round(w / factor));
  const smallH = Math.max(1, Math.round(h / factor));
  const temp = document.createElement('canvas');
  temp.width = smallW; temp.height = smallH;
  const tctx = temp.getContext('2d');
  tctx.drawImage(ctx.canvas, x, y, w, h, 0, 0, smallW, smallH);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.clearRect(x, y, w, h);
  ctx.drawImage(temp, 0, 0, smallW, smallH, x, y, w, h);
  ctx.restore();
}

export function hitTestAnnotation(ann, px, py) {
  if (ann.type === 'arrow') {
    const near = (ax, ay) => Math.hypot(px - ax, py - ay) <= HANDLE_SIZE;
    if (near(ann.x1, ann.y1)) return 'p1';
    if (near(ann.x2, ann.y2)) return 'p2';
    // distance from point to segment
    const dx = ann.x2 - ann.x1, dy = ann.y2 - ann.y1;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((px - ann.x1) * dx + (py - ann.y1) * dy) / len2));
    const projX = ann.x1 + t * dx, projY = ann.y1 + t * dy;
    return Math.hypot(px - projX, py - projY) <= 10 ? 'body' : null;
  }
  if (ann.type === 'number') {
    return Math.hypot(px - ann.x, py - ann.y) <= 18 ? 'body' : null;
  }
  const { x, y, w, h } = ann;
  const corners = { nw: [x, y], ne: [x + w, y], sw: [x, y + h], se: [x + w, y + h] };
  for (const [key, [cx, cy]] of Object.entries(corners)) {
    if (Math.hypot(px - cx, py - cy) <= HANDLE_SIZE) return key;
  }
  if (px >= x && px <= x + w && py >= y && py <= y + h) return 'body';
  return null;
}
