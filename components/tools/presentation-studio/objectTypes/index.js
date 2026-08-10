// Registry of presentation-studio's canvas object types — mirrors
// pdf-layout-studio's objectTypes/index.js pattern ({createDefaults,
// Content} per type module, decoupled from move/resize mechanics, which
// live entirely in the reused components/shared/TransformableBox.js).
import * as text from './text';
import * as shape from './shape';
import * as image from './image';
import * as chart from './chart';

export const OBJECT_TYPES = { text, shape, image, chart };

export function contentFor(type) {
  return OBJECT_TYPES[type]?.Content;
}

export const TYPE_LABELS = { text: 'Text', shape: 'Shape', image: 'Image', chart: 'Chart' };

// Builds a brand-new object of `type` at a point, using nextId/nextZ from
// useObjectHistory — same convention as pdf-layout-studio's createObject().
export function createObject(type, { slideIndex, x, y, w, h, nextId, nextZ, ...extra }) {
  const impl = OBJECT_TYPES[type];
  const defaults = impl.createDefaults(extra);
  return { id: nextId(), z: nextZ(), type, slideIndex, x, y, w, h, rotation: 0, ...defaults };
}
