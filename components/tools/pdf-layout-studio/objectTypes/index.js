// Registry of PDF Layout Studio's object types. Every object is a real DOM
// node (see Stage.js) rather than a canvas draw call — this is what makes a
// true vector pdf-lib export possible (draw text/shapes/images directly
// onto the ORIGINAL PDF pages), unlike Annotate PDF's canvas-rasterize
// pipeline. Each type module exports `createDefaults` (type-specific fields
// for a freshly created object) and a `Content` React component (how it
// renders inside a TransformableBox). New element types (Phase 1+: Logo,
// Signature, Watermark, Stamp, QR Code, Shapes, ...) register here the same
// way — this file is the one place that needs a new entry, nothing about
// Stage.js/PropertiesPanel.js's dispatch logic changes per type.
import * as text from './text';
import * as image from './image';
import * as signature from './signature';
import * as shape from './shape';
import * as pageNumber from './pageNumber';
import * as watermark from './watermark';
import * as stamp from './stamp';
import * as footer from './footer';
import * as qrcode from './qrcode';

export const OBJECT_TYPES = { text, image, signature, shape, pageNumber, watermark, stamp, footer, qrcode };

export function contentFor(type) {
  return OBJECT_TYPES[type]?.Content;
}

// Human-readable per-type labels for the Layers panel — used whenever an
// object doesn't have a user-given `name` (the common case; renaming is
// opt-in).
export const TYPE_LABELS = {
  text: 'Text', image: 'Image', signature: 'Signature', shape: 'Shape', pageNumber: 'Page numbers',
  watermark: 'Watermark', stamp: 'Stamp', footer: 'Footer', qrcode: 'QR code',
};

// Stamps the shared fields every object carries regardless of type
// (id/z ordering, per-page tagging, timestamps, rotation, and the Layers
// panel's lock/hide/name state).
export function stampShared(partial, { page, nextId, nextZ }) {
  const now = Date.now();
  return {
    page,
    rotation: 0,
    locked: false,
    hidden: false,
    name: null,
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
