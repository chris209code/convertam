// Registry of Write on PDF's object types. Unlike Annotate PDF's registry,
// there's no draw/bounds/hitTest here — every object is a real DOM node
// (see Stage.js), so there's no canvas draw function or hit-test dispatch
// to register. Each type module exports just `createDefaults` (type-specific
// fields for a freshly created object) and a `Content` React component (how
// it renders inside a TransformableBox).
import * as text from './text';
import * as checkbox from './checkbox';
import * as highlight from './highlight';
import * as image from './image';
import * as signature from './signature';
import * as cover from './cover';

export const OBJECT_TYPES = { text, checkbox, highlight, image, signature, cover };

export function contentFor(type) {
  return OBJECT_TYPES[type]?.Content;
}

// Stamps the shared fields every object carries regardless of type
// (id/z ordering, per-page tagging, timestamps).
export function stampShared(partial, { page, nextId, nextZ }) {
  const now = Date.now();
  return {
    page,
    rotation: 0,
    createdAt: now,
    updatedAt: now,
    ...partial,
    // id/z must win over anything in `partial`.
    id: nextId(),
    z: nextZ(),
  };
}

// Builds a brand-new object of `type` at a point, using that type's own
// createDefaults() for its type-specific fields.
export function createObject(type, { page, x, y, color, nextId, nextZ, ...extra }) {
  const impl = OBJECT_TYPES[type];
  const defaults = impl.createDefaults({ color, ...extra });
  return stampShared({ type, x, y, ...defaults }, { page, nextId, nextZ });
}
