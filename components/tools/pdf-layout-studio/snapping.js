// Live magnetic snap guides for dragging an element — Canva/Acrobat-style
// "snap to page center/edges and to other elements" while the drag is in
// progress, as opposed to Annotate PDF's alignment.js, which only offers
// align/distribute as one-shot commands on an already-finished multi-
// selection. This is a from-scratch addition; nothing in this codebase
// already did live-drag snapping to adapt.
//
// Pure and framework-agnostic: takes the dragged object's candidate
// {x,y,w,h} plus the page size and the other objects already on the page,
// and returns the (possibly adjusted) position plus which guide lines — if
// any — should be drawn. All units are page-space px (the same space
// objects store x/y/w/h in), so callers can render the returned guide
// positions directly with no extra scaling math.

const SNAP_THRESHOLD = 6; // page-space px — the "magnetic" catch radius

// Finds the single closest match (if any, within SNAP_THRESHOLD) between the
// dragged object's own edge/center lines and a list of candidate target
// positions on the same axis.
function bestSnap(ownLines, targetPositions) {
  let best = null;
  for (const line of ownLines) {
    for (const target of targetPositions) {
      const delta = target - line.pos;
      if (Math.abs(delta) <= SNAP_THRESHOLD && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, targetPos: target };
      }
    }
  }
  return best;
}

// computeSnappedPosition({x,y,w,h}, pageWidth, pageHeight, otherObjects)
// -> { x, y, guides: { vertical: number|null, horizontal: number|null } }
//
// `otherObjects` should already exclude the object being dragged and any
// hidden objects (the caller — Stage.js — filters both before calling this).
export function computeSnappedPosition({ x, y, w, h }, pageWidth, pageHeight, otherObjects) {
  const targetX = [0, pageWidth / 2, pageWidth];
  const targetY = [0, pageHeight / 2, pageHeight];
  for (const o of otherObjects) {
    targetX.push(o.x, o.x + o.w / 2, o.x + o.w);
    targetY.push(o.y, o.y + o.h / 2, o.y + o.h);
  }

  const ownXLines = [{ pos: x }, { pos: x + w / 2 }, { pos: x + w }];
  const ownYLines = [{ pos: y }, { pos: y + h / 2 }, { pos: y + h }];

  const snapX = bestSnap(ownXLines, targetX);
  const snapY = bestSnap(ownYLines, targetY);

  return {
    x: snapX ? x + snapX.delta : x,
    y: snapY ? y + snapY.delta : y,
    guides: {
      vertical: snapX ? snapX.targetPos : null,
      horizontal: snapY ? snapY.targetPos : null,
    },
  };
}
