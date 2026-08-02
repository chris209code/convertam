// Registry of annotation object-type implementations. Each module exports
// {interaction, createDefaults, draw, bounds, hitTest}.
import * as highlight from './highlight';
import * as draw from './draw';
import * as note from './note';
import * as text from './text';
import * as underline from './underline';
import * as strikethrough from './strikethrough';
import * as shape from './shape';
import * as callout from './callout';
import * as image from './image';
import * as numbering from './numbering';
import * as signature from './signature';
import * as stamp from './stamp';

export const OBJECT_TYPES = { highlight, draw, note, text, underline, strikethrough, shape, callout, image, numbering, signature, stamp };

export function drawObject(ctx, o) {
  if (o.hidden) return;
  OBJECT_TYPES[o.type]?.draw(ctx, o);
}

export function boundsOf(o, ctx) {
  const impl = OBJECT_TYPES[o.type];
  if (impl?.bounds) return impl.bounds(o, ctx);
  return { x: o.x, y: o.y, w: o.w || 0, h: o.h || 0 };
}

export function hitTestAt(pos, o, ctx) {
  return OBJECT_TYPES[o.type]?.hitTest(pos, o, ctx) ?? false;
}

export function interactionOf(type) {
  return OBJECT_TYPES[type]?.interaction ?? null;
}

// Stamps the shared fields every annotation carries regardless of type
// (id/z ordering, per-page tagging, lock/hide/resolved state, authorship)
// onto a partial object. Used both for click-to-create tools (createObject,
// below — geometry is just a point) and drag-to-create tools (highlight,
// draw), where the caller only knows the final shape/points once the drag
// ends, so it builds the type-specific fields itself and stamps them here.
export function stampShared(partial, { page, nextId, nextZ }) {
  const now = Date.now();
  return {
    page,
    locked: false,
    hidden: false,
    resolved: false,
    author: 'You',
    createdAt: now,
    updatedAt: now,
    rotation: 0,
    ...partial,
    // id/z must win over anything in `partial` — callers building a live
    // preview object during a drag (highlight/draw/underline/strikethrough/
    // shape) stamp it with a placeholder `id: null` so drawObject() has
    // something to render before the object is ever committed; without
    // this coming after the spread, that placeholder would silently
    // clobber the real id assigned here on commit.
    id: nextId(),
    z: nextZ(),
  };
}

// Builds a brand-new click-to-create object of `type` (note, text, ...) at
// a point, using that type's own createDefaults() for its type-specific
// fields. `extra` passes through anything a given type's createDefaults()
// needs beyond color/position (shapeKind for shapes, src/w/h for image and
// signature stamps, number for numbering markers).
export function createObject(type, { page, x, y, color, nextId, nextZ, ...extra }) {
  const impl = OBJECT_TYPES[type];
  const defaults = impl.createDefaults({ color, x, y, ...extra });
  return stampShared({ type, x, y, ...defaults }, { page, nextId, nextZ });
}
