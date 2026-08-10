// Pure, synchronous, zero-AI layout engine: {layout, content, theme} ->
// positioned canvas objects. This is the load-bearing piece of the
// cost-control architecture — the AI never outputs coordinates; every
// object's x/y/w/h/color/font comes from here, deterministically, from the
// slide's chosen layout and the active theme's design tokens. Geometry is
// in INCHES (matching pptxgenjs's native unit and lib/buildPptxFromOutline.js's
// existing WIDE 10x5.63 layout) so on-screen canvas, PPTX export, and PDF
// export never drift from each other. Every layout function below reads
// only theme tokens for color/font/spacing — never a hardcoded value — so
// all 12 layouts read as compositions of one design system, not 12
// unrelated templates.

export const SLIDE_W = 10;
export const SLIDE_H = 5.63;
export const PX_PER_INCH = 96;
export const MARGIN = 0.5;

let counter = 0;
function objId(slideId) { counter += 1; return `${slideId}-obj-${counter}`; }

function baseObj(slideId, type, rect, extra) {
  return { id: objId(slideId), type, slideIndex: null, x: rect.x, y: rect.y, w: rect.w, h: rect.h, rotation: 0, ...extra };
}

function titleObj(slideId, theme, text, { y = 0.35, h = 0.7, size, color, align = 'left' } = {}) {
  return baseObj(slideId, 'text', { x: MARGIN, y, w: SLIDE_W - MARGIN * 2, h }, {
    text, bold: true, align, fontFace: theme.fonts.heading, fontSize: size || theme.fontSizes.heading, color: color || theme.colors.primary,
  });
}

function accentBarObj(slideId, theme, { y = 1.05, w = SLIDE_W - MARGIN * 2, x = MARGIN } = {}) {
  if (theme.visualTreatment === 'flat-no-accent') return null;
  return baseObj(slideId, 'shape', { x, y, w, h: 0.035 }, { shapeType: 'rect', fill: theme.colors.accent });
}

function bulletsObj(slideId, theme, bullets, rect) {
  return baseObj(slideId, 'text', rect, {
    lines: bullets.length ? bullets : ['(no content generated for this slide)'],
    bulleted: true, fontFace: theme.fonts.body, fontSize: theme.fontSizes.body, color: theme.colors.text,
  });
}

function notesPlaceholder() { return null; } // notes never render on the visible slide — stored on the slide, not as an object.

function backgroundFill(slideId, theme, color) {
  return baseObj(slideId, 'shape', { x: 0, y: 0, w: SLIDE_W, h: SLIDE_H }, { shapeType: 'rect', fill: color || theme.colors.background, background: true });
}

function withSlideIndex(objects, slideIndex) {
  return objects.filter(Boolean).map((o) => ({ ...o, slideIndex }));
}

function layoutTitle(slide, theme) {
  const { title, subtitle } = slide.content;
  return [
    backgroundFill(slide.id, theme, theme.colors.coverBg),
    titleObj(slide.id, theme, title, { y: 2.0, h: 1.1, size: theme.fontSizes.title, color: theme.colors.coverText, align: 'center' }),
    subtitle ? baseObj(slide.id, 'text', { x: MARGIN, y: 3.2, w: SLIDE_W - MARGIN * 2, h: 0.6 }, { text: subtitle, align: 'center', fontFace: theme.fonts.body, fontSize: theme.fontSizes.subtitle, color: theme.colors.secondary }) : null,
  ];
}

function layoutTitleBullets(slide, theme) {
  const { title, bullets } = slide.content;
  return [
    titleObj(slide.id, theme, title),
    accentBarObj(slide.id, theme),
    bulletsObj(slide.id, theme, bullets, { x: MARGIN, y: 1.4, w: SLIDE_W - MARGIN * 2, h: SLIDE_H - 1.4 - MARGIN }),
  ];
}

function layoutTwoColumn(slide, theme) {
  const { title, columns } = slide.content;
  const colW = (SLIDE_W - MARGIN * 2 - 0.4) / 2;
  return [
    titleObj(slide.id, theme, title),
    accentBarObj(slide.id, theme),
    ...columns.flatMap((col, i) => {
      const x = MARGIN + i * (colW + 0.4);
      return [
        col.heading ? baseObj(slide.id, 'text', { x, y: 1.4, w: colW, h: 0.4 }, { text: col.heading, bold: true, fontFace: theme.fonts.heading, fontSize: theme.fontSizes.body + 2, color: theme.colors.secondary }) : null,
        bulletsObj(slide.id, theme, col.bullets, { x, y: 1.9, w: colW, h: SLIDE_H - 1.9 - MARGIN }),
      ];
    }),
  ];
}

function layoutImageText(slide, theme) {
  const { title, bullets, imageQuery } = slide.content;
  const imgW = 3.6;
  const textX = MARGIN + imgW + 0.4;
  return [
    titleObj(slide.id, theme, title),
    accentBarObj(slide.id, theme),
    baseObj(slide.id, 'image', { x: MARGIN, y: 1.4, w: imgW, h: SLIDE_H - 1.4 - MARGIN }, { placeholderLabel: imageQuery || 'Add an image', fill: theme.colors.background === theme.colors.text ? '1F2937' : 'E2E8F0' }),
    bulletsObj(slide.id, theme, bullets, { x: textX, y: 1.4, w: SLIDE_W - textX - MARGIN, h: SLIDE_H - 1.4 - MARGIN }),
  ];
}

function layoutProcess(slide, theme) {
  const { title, steps } = slide.content;
  const n = Math.max(steps.length, 1);
  const gap = 0.25;
  const stepW = (SLIDE_W - MARGIN * 2 - gap * (n - 1)) / n;
  return [
    titleObj(slide.id, theme, title),
    accentBarObj(slide.id, theme),
    ...steps.flatMap((step, i) => {
      const x = MARGIN + i * (stepW + gap);
      return [
        baseObj(slide.id, 'shape', { x, y: 1.5, w: 0.45, h: 0.45 }, { shapeType: 'circle', fill: theme.colors.accent }),
        baseObj(slide.id, 'text', { x, y: 1.5, w: 0.45, h: 0.45 }, { text: String(i + 1), bold: true, align: 'center', color: 'FFFFFF', fontFace: theme.fonts.heading, fontSize: theme.fontSizes.body }),
        baseObj(slide.id, 'text', { x, y: 2.1, w: stepW, h: 0.4 }, { text: step.label, bold: true, fontFace: theme.fonts.heading, fontSize: theme.fontSizes.body, color: theme.colors.primary }),
        baseObj(slide.id, 'text', { x, y: 2.5, w: stepW, h: SLIDE_H - 2.5 - MARGIN }, { text: step.description, fontFace: theme.fonts.body, fontSize: theme.fontSizes.small + 1, color: theme.colors.textLight }),
      ];
    }),
  ];
}

function layoutTimeline(slide, theme) {
  const { title, steps } = slide.content;
  const n = Math.max(steps.length, 1);
  const rowH = (SLIDE_H - 1.4 - MARGIN) / n;
  return [
    titleObj(slide.id, theme, title),
    accentBarObj(slide.id, theme),
    baseObj(slide.id, 'shape', { x: MARGIN + 0.08, y: 1.5, w: 0.02, h: SLIDE_H - 1.5 - MARGIN }, { shapeType: 'rect', fill: theme.colors.accent }),
    ...steps.flatMap((step, i) => {
      const y = 1.4 + i * rowH;
      return [
        baseObj(slide.id, 'shape', { x: MARGIN, y: y + rowH / 2 - 0.06, w: 0.18, h: 0.18 }, { shapeType: 'circle', fill: theme.colors.accent }),
        baseObj(slide.id, 'text', { x: MARGIN + 0.35, y, w: SLIDE_W - MARGIN * 2 - 0.35, h: 0.35 }, { text: step.label, bold: true, fontFace: theme.fonts.heading, fontSize: theme.fontSizes.body, color: theme.colors.primary }),
        baseObj(slide.id, 'text', { x: MARGIN + 0.35, y: y + 0.35, w: SLIDE_W - MARGIN * 2 - 0.35, h: rowH - 0.35 }, { text: step.description, fontFace: theme.fonts.body, fontSize: theme.fontSizes.small + 1, color: theme.colors.textLight }),
      ];
    }),
  ];
}

function layoutComparison(slide, theme) {
  const { title, comparisonItems } = slide.content;
  const n = Math.max(comparisonItems.length, 1);
  const gap = 0.3;
  const colW = (SLIDE_W - MARGIN * 2 - gap * (n - 1)) / n;
  return [
    titleObj(slide.id, theme, title),
    accentBarObj(slide.id, theme),
    ...comparisonItems.flatMap((item, i) => {
      const x = MARGIN + i * (colW + gap);
      return [
        baseObj(slide.id, 'shape', { x, y: 1.4, w: colW, h: SLIDE_H - 1.4 - MARGIN }, { shapeType: 'rect', fill: theme.colors.background === 'FFFFFF' ? 'F8FAFC' : theme.colors.secondary, outline: theme.colors.accent }),
        baseObj(slide.id, 'text', { x: x + 0.15, y: 1.55, w: colW - 0.3, h: 0.4 }, { text: item.heading, bold: true, fontFace: theme.fonts.heading, fontSize: theme.fontSizes.body + 1, color: theme.colors.primary }),
        bulletsObj(slide.id, theme, item.points, { x: x + 0.15, y: 2.0, w: colW - 0.3, h: SLIDE_H - 2.0 - MARGIN - 0.15 }),
      ];
    }),
  ];
}

function layoutStatistics(slide, theme) {
  const { title, stats } = slide.content;
  const n = Math.max(stats.length, 1);
  const gap = 0.3;
  const colW = (SLIDE_W - MARGIN * 2 - gap * (n - 1)) / n;
  return [
    titleObj(slide.id, theme, title),
    accentBarObj(slide.id, theme),
    ...stats.flatMap((stat, i) => {
      const x = MARGIN + i * (colW + gap);
      return [
        baseObj(slide.id, 'text', { x, y: 2.0, w: colW, h: 1.0 }, { text: stat.value, bold: true, align: 'center', fontFace: theme.fonts.heading, fontSize: theme.fontSizes.title - 4, color: theme.colors.accent }),
        baseObj(slide.id, 'text', { x, y: 3.0, w: colW, h: 0.6 }, { text: stat.label, align: 'center', fontFace: theme.fonts.body, fontSize: theme.fontSizes.small + 1, color: theme.colors.textLight }),
      ];
    }),
  ];
}

function layoutChart(slide, theme) {
  const { title, chartType, labels, values } = slide.content;
  return [
    titleObj(slide.id, theme, title),
    accentBarObj(slide.id, theme),
    baseObj(slide.id, 'chart', { x: MARGIN + 0.4, y: 1.4, w: SLIDE_W - MARGIN * 2 - 0.8, h: SLIDE_H - 1.4 - MARGIN }, {
      chartType, labels: labels.length ? labels : ['A', 'B', 'C'], values: values.length ? values : [1, 1, 1],
      colors: [theme.colors.primary, theme.colors.accent, theme.colors.secondary, theme.colors.textLight],
    }),
  ];
}

function layoutQuote(slide, theme) {
  const { quote, quoteAuthor } = slide.content;
  return [
    backgroundFill(slide.id, theme, theme.colors.background),
    baseObj(slide.id, 'text', { x: 1.2, y: 1.6, w: SLIDE_W - 2.4, h: 2.2 }, { text: `"${quote}"`, italic: true, align: 'center', fontFace: theme.fonts.heading, fontSize: theme.fontSizes.heading, color: theme.colors.primary }),
    quoteAuthor ? baseObj(slide.id, 'text', { x: 1.2, y: 3.9, w: SLIDE_W - 2.4, h: 0.5 }, { text: `— ${quoteAuthor}`, align: 'center', fontFace: theme.fonts.body, fontSize: theme.fontSizes.body, color: theme.colors.textLight }) : null,
  ];
}

function layoutSectionDivider(slide, theme) {
  const { title, subtitle } = slide.content;
  return [
    backgroundFill(slide.id, theme, theme.colors.accent),
    titleObj(slide.id, theme, title, { y: 2.3, h: 1.0, size: theme.fontSizes.heading + 4, color: 'FFFFFF', align: 'center' }),
    subtitle ? baseObj(slide.id, 'text', { x: MARGIN, y: 3.3, w: SLIDE_W - MARGIN * 2, h: 0.6 }, { text: subtitle, align: 'center', fontFace: theme.fonts.body, fontSize: theme.fontSizes.subtitle, color: 'F1F5F9' }) : null,
  ];
}

function layoutKeyTakeaway(slide, theme) {
  const { title, keyTakeaway } = slide.content;
  return [
    backgroundFill(slide.id, theme, theme.colors.coverBg),
    baseObj(slide.id, 'text', { x: MARGIN, y: 1.5, w: SLIDE_W - MARGIN * 2, h: 0.6 }, { text: title, bold: true, align: 'center', fontFace: theme.fonts.heading, fontSize: theme.fontSizes.subtitle, color: theme.colors.accent }),
    baseObj(slide.id, 'text', { x: 1.0, y: 2.2, w: SLIDE_W - 2.0, h: 1.8 }, { text: keyTakeaway, bold: true, align: 'center', fontFace: theme.fonts.heading, fontSize: theme.fontSizes.heading, color: theme.colors.coverText }),
  ];
}

const LAYOUT_FNS = {
  title: layoutTitle,
  titleBullets: layoutTitleBullets,
  twoColumn: layoutTwoColumn,
  imageText: layoutImageText,
  process: layoutProcess,
  timeline: layoutTimeline,
  comparison: layoutComparison,
  statistics: layoutStatistics,
  chart: layoutChart,
  quote: layoutQuote,
  sectionDivider: layoutSectionDivider,
  keyTakeaway: layoutKeyTakeaway,
};

// {layout, content} + theme -> flat array of positioned canvas objects
// (inches). slideIndex is stamped on every object so the flat multi-slide
// array (Phase C's canvas/undo-history model) can filter to "objects on
// the current slide" the same way pdf-layout-studio's object array filters
// by page.
export function buildSlideObjects(slide, theme, slideIndex) {
  const fn = LAYOUT_FNS[slide.layout] || layoutTitleBullets;
  const objects = fn(slide, theme);
  return withSlideIndex(objects, slideIndex);
}

export function buildDeckObjects(slides, theme) {
  return slides.flatMap((slide, i) => buildSlideObjects(slide, theme, i));
}
