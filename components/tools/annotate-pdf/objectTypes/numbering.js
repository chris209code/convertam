import { pointInRect } from '../../redact-edit/geometry';

export const RADIUS = 15;

export const interaction = 'select';

// `number` is assigned by the Numbering Tool's own restartable counter
// (Phase 3's NumberingTool.js), not by the shared nextId()/nextZ() counters
// — it's the visible label, so restarting the series needs to hand out 1
// again without colliding with object identity.
export function createDefaults({ color, number }) {
  return { color, number };
}

export function draw(ctx, o) {
  ctx.save();
  ctx.fillStyle = o.color;
  ctx.beginPath();
  ctx.arc(o.x, o.y, RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'white';
  ctx.font = `bold ${RADIUS}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(o.number ?? ''), o.x, o.y + 1);
  ctx.restore();
}

export function bounds(o) {
  return { x: o.x - RADIUS, y: o.y - RADIUS, w: RADIUS * 2, h: RADIUS * 2 };
}

export function hitTest(pos, o) {
  return pointInRect(pos, bounds(o));
}
