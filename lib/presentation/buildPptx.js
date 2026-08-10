// Builds a real, editable .pptx from the flat object array — replaces
// lib/buildPptxFromOutline.js's outline-driven builder (confirmed via grep
// to have exactly one other real caller, DataAnalystWorkspace.js's dead
// import, so nothing else breaks). Every object type maps to a genuine
// pptxgenjs element (addText/addShape/addImage/addChart) — never a
// rasterized image of the slide — and charts use pptxgenjs's native
// addChart() so they stay real, editable PowerPoint chart objects, not a
// picture of a chart. Runs client-side (same as the old builder): dynamic
// import keeps pptxgenjs out of the main bundle, and pptx.writeFile()
// triggers the browser download directly with no server round-trip.

import { SLIDE_W, SLIDE_H } from './layoutEngine';

function addTextObject(slide, obj) {
  const common = { x: obj.x, y: obj.y, w: obj.w, h: obj.h, fontFace: obj.fontFace, color: obj.color, bold: !!obj.bold, italic: !!obj.italic, align: obj.align || 'left', valign: obj.bulleted ? 'top' : (obj.align === 'center' ? 'middle' : 'top') };
  if (obj.bulleted) {
    const runs = (obj.lines || []).map((line) => ({ text: line, options: { bullet: { code: '25CF' }, fontSize: obj.fontSize, breakLine: true, paraSpaceAfter: 6 } }));
    slide.addText(runs, common);
  } else {
    slide.addText(obj.text || '', { ...common, fontSize: obj.fontSize });
  }
}

function addShapeObject(pptx, slide, obj) {
  const shapeType = obj.shapeType === 'circle' ? pptx.ShapeType.ellipse : pptx.ShapeType.rect;
  slide.addShape(shapeType, {
    x: obj.x, y: obj.y, w: obj.w, h: obj.h,
    fill: { color: obj.fill },
    line: obj.outline ? { color: obj.outline, width: 1 } : { type: 'none' },
  });
}

function addImageObject(pptx, slide, obj) {
  if (obj.dataUrl) {
    slide.addImage({ data: obj.dataUrl, x: obj.x, y: obj.y, w: obj.w, h: obj.h });
    return;
  }
  // No image was ever provided for this placeholder — draw the same
  // dashed-box affordance as the editor rather than silently omitting it,
  // so the exported deck doesn't have an inexplicable blank gap.
  slide.addShape(pptx.ShapeType.rect, { x: obj.x, y: obj.y, w: obj.w, h: obj.h, fill: { color: obj.fill }, line: { color: '94A3B8', width: 1, dashType: 'dash' } });
  slide.addText(obj.placeholderLabel || 'Image placeholder', { x: obj.x, y: obj.y, w: obj.w, h: obj.h, align: 'center', valign: 'middle', fontSize: 10, color: '64748B' });
}

function addChartObject(pptx, slide, obj) {
  // pptxgenjs's ChartType enum values equal their lowercase key names
  // ('bar','line','pie','doughnut') — obj.chartType (normalized in
  // normalizeSlide.js to one of those exact 4 strings) is already valid
  // input, no lookup table needed.
  const chartType = pptx.ChartType[obj.chartType] || pptx.ChartType.bar;
  const data = [{ name: obj.title || 'Series 1', labels: obj.labels, values: obj.values }];
  slide.addChart(chartType, data, {
    x: obj.x, y: obj.y, w: obj.w, h: obj.h,
    chartColors: (obj.colors || []).length ? obj.colors : undefined,
    showLegend: obj.chartType === 'pie' || obj.chartType === 'doughnut',
    showTitle: false,
  });
}

export async function buildPptxFromDeck({ slidesMeta, objects, theme }) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'DECK', width: SLIDE_W, height: SLIDE_H });
  pptx.layout = 'DECK';

  slidesMeta.forEach((meta, slideIndex) => {
    const slide = pptx.addSlide();
    if (meta.notes) slide.addNotes(meta.notes);

    const slideObjects = objects.filter((o) => o.slideIndex === slideIndex);
    const backgroundObj = slideObjects.find((o) => o.background);
    slide.background = { color: backgroundObj ? backgroundObj.fill : theme.colors.background };

    slideObjects.forEach((obj) => {
      if (obj.background) return; // already applied as slide.background above
      if (obj.type === 'text') addTextObject(slide, obj);
      else if (obj.type === 'shape') addShapeObject(pptx, slide, obj);
      else if (obj.type === 'image') addImageObject(pptx, slide, obj);
      else if (obj.type === 'chart') addChartObject(pptx, slide, obj);
    });
  });

  return pptx;
}

export async function downloadPptx({ slidesMeta, objects, theme, title }) {
  const pptx = await buildPptxFromDeck({ slidesMeta, objects, theme });
  const fileName = `${(title || 'presentation').trim().replace(/\s+/g, '-').toLowerCase()}.pptx`;
  await pptx.writeFile({ fileName });
}
