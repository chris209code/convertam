// Pure align/distribute helpers for multi-selected annotation objects.
// Every mutation is expressed as a translation (dx, dy) rather than
// recomputing x/y/w/h directly, so the same code works for every object
// shape — rect-like objects (x,y,w,h), freehand/polygon point arrays, and
// callouts (whose leaderPoint has to move together with the bubble so the
// leader line doesn't detach from what it's pointing at).
export function translateObject(o, dx, dy) {
  if (dx === 0 && dy === 0) return o;
  const next = { ...o, x: o.x + dx, y: o.y + dy, updatedAt: Date.now() };
  if (o.points) next.points = o.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  if (o.leaderPoint) next.leaderPoint = { x: o.leaderPoint.x + dx, y: o.leaderPoint.y + dy };
  return next;
}

const ALIGN_MODES = ['left', 'right', 'top', 'bottom', 'center-h', 'center-v'];

// Aligns every selected object to a shared edge/center line computed from
// the group's own combined bounds (not to one designated "anchor" object —
// simpler to reason about and matches how most design tools default).
export function alignObjects(objects, selectedIds, boundsOf, ctx, mode) {
  if (!ALIGN_MODES.includes(mode)) return objects;
  const targets = objects.filter((o) => selectedIds.has(o.id));
  if (targets.length < 2) return objects;
  const boundsById = new Map(targets.map((o) => [o.id, boundsOf(o, ctx)]));

  let ref;
  if (mode === 'left') ref = Math.min(...targets.map((o) => boundsById.get(o.id).x));
  else if (mode === 'right') ref = Math.max(...targets.map((o) => { const b = boundsById.get(o.id); return b.x + b.w; }));
  else if (mode === 'top') ref = Math.min(...targets.map((o) => boundsById.get(o.id).y));
  else if (mode === 'bottom') ref = Math.max(...targets.map((o) => { const b = boundsById.get(o.id); return b.y + b.h; }));
  else if (mode === 'center-h') {
    const xs = targets.map((o) => { const b = boundsById.get(o.id); return b.x + b.w / 2; });
    ref = (Math.min(...xs) + Math.max(...xs)) / 2;
  } else if (mode === 'center-v') {
    const ys = targets.map((o) => { const b = boundsById.get(o.id); return b.y + b.h / 2; });
    ref = (Math.min(...ys) + Math.max(...ys)) / 2;
  }

  return objects.map((o) => {
    if (!selectedIds.has(o.id)) return o;
    const b = boundsById.get(o.id);
    let dx = 0, dy = 0;
    if (mode === 'left') dx = ref - b.x;
    else if (mode === 'right') dx = ref - (b.x + b.w);
    else if (mode === 'top') dy = ref - b.y;
    else if (mode === 'bottom') dy = ref - (b.y + b.h);
    else if (mode === 'center-h') dx = ref - (b.x + b.w / 2);
    else if (mode === 'center-v') dy = ref - (b.y + b.h / 2);
    return translateObject(o, dx, dy);
  });
}

// Spaces the selected objects' centers evenly between the outermost two
// along one axis (the two endpoints don't move — only the ones between them
// shift to close the gaps evenly).
export function distributeObjects(objects, selectedIds, boundsOf, ctx, axis) {
  const targets = objects.filter((o) => selectedIds.has(o.id));
  if (targets.length < 3) return objects;
  const withBounds = targets.map((o) => ({ o, b: boundsOf(o, ctx) }));
  const centerOf = axis === 'horizontal' ? (b) => b.x + b.w / 2 : (b) => b.y + b.h / 2;
  withBounds.sort((a, b) => centerOf(a.b) - centerOf(b.b));

  const first = centerOf(withBounds[0].b);
  const last = centerOf(withBounds[withBounds.length - 1].b);
  const step = (last - first) / (withBounds.length - 1);

  const patchById = new Map();
  withBounds.forEach((item, i) => {
    if (i === 0 || i === withBounds.length - 1) return;
    const delta = (first + step * i) - centerOf(item.b);
    patchById.set(item.o.id, axis === 'horizontal' ? { dx: delta, dy: 0 } : { dx: 0, dy: delta });
  });

  return objects.map((o) => {
    const patch = patchById.get(o.id);
    return patch ? translateObject(o, patch.dx, patch.dy) : o;
  });
}
