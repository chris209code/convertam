// Pure slide-level operations over the {slidesMeta, objects} pair used by
// the Phase C editor. `slidesMeta` is [{id, layout, title, notes}], one
// entry per slide; `objects` is the flat TransformableBox-editable array
// (each object tagged with `slideIndex`, mirroring pdf-layout-studio's
// page-tagged object model). All of these are 100% local/deterministic —
// no AI call is ever appropriate here, per the cost-control architecture.

import { buildSlideObjects } from './layoutEngine';

function retagFrom(objects, fromIndex, delta) {
  return objects.map((o) => (o.slideIndex >= fromIndex ? { ...o, slideIndex: o.slideIndex + delta } : o));
}

export function addBlankSlide(slidesMeta, objects, afterIndex, theme, { nextId, nextZ }) {
  const insertAt = afterIndex + 1;
  const newMeta = { id: `slide-${Date.now()}`, layout: 'titleBullets', title: 'New Slide', notes: '' };
  const nextSlidesMeta = [...slidesMeta.slice(0, insertAt), newMeta, ...slidesMeta.slice(insertAt)];

  const shifted = retagFrom(objects, insertAt, 1);
  const blankObjects = buildSlideObjects({ id: newMeta.id, layout: newMeta.layout, content: { title: newMeta.title, bullets: ['Add your point here'] } }, theme, insertAt)
    .map((o) => ({ ...o, id: nextId(), z: nextZ() }));

  return { slidesMeta: nextSlidesMeta, objects: [...shifted, ...blankObjects] };
}

export function deleteSlide(slidesMeta, objects, index) {
  const nextSlidesMeta = slidesMeta.filter((_, i) => i !== index);
  const withoutSlide = objects.filter((o) => o.slideIndex !== index);
  const retagged = withoutSlide.map((o) => (o.slideIndex > index ? { ...o, slideIndex: o.slideIndex - 1 } : o));
  return { slidesMeta: nextSlidesMeta, objects: retagged };
}

export function duplicateSlide(slidesMeta, objects, index, { nextId, nextZ }) {
  const insertAt = index + 1;
  const cloneMeta = { ...slidesMeta[index], id: `slide-${Date.now()}` };
  const nextSlidesMeta = [...slidesMeta.slice(0, insertAt), cloneMeta, ...slidesMeta.slice(insertAt)];

  const shifted = retagFrom(objects, insertAt, 1);
  const clonedObjects = objects
    .filter((o) => o.slideIndex === index)
    .map((o) => ({ ...o, id: nextId(), z: nextZ(), slideIndex: insertAt }));

  return { slidesMeta: nextSlidesMeta, objects: [...shifted, ...clonedObjects] };
}

export function moveSlide(slidesMeta, objects, index, dir) {
  const target = index + dir;
  if (target < 0 || target >= slidesMeta.length) return { slidesMeta, objects };
  const nextSlidesMeta = [...slidesMeta];
  [nextSlidesMeta[index], nextSlidesMeta[target]] = [nextSlidesMeta[target], nextSlidesMeta[index]];
  const nextObjects = objects.map((o) => {
    if (o.slideIndex === index) return { ...o, slideIndex: target };
    if (o.slideIndex === target) return { ...o, slideIndex: index };
    return o;
  });
  return { slidesMeta: nextSlidesMeta, objects: nextObjects };
}

// Remaps layoutEngine's per-run string ids (and missing z) into the
// sequential numeric id/z scheme components/shared/useObjectHistory.js
// requires (its reset() computes nextId via Math.max over numeric o.id).
export function toEditableObjects(objects) {
  return objects.map((o, i) => ({ ...o, id: i + 1, z: i + 1 }));
}
