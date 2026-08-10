// responseSchema objects for the AI Presentation Maker's two base Gemini
// calls (outline, then full slide content). Both are consumed by the shared
// lib/geminiClient.js#callGemini() — no separate AI wrapper.
//
// The outline is deliberately short (title + one-line summary per slide,
// no layout/content yet) so the outline-approval gate stays cheap. The
// slide-content schema is intentionally flat/sparse rather than a
// discriminated union — Gemini's responseSchema has no oneOf support, so
// every layout-specific field is optional and lib/presentation/normalizeSlide.js
// reshapes whatever came back into a clean per-layout content object.

export const SLIDE_TYPES = ['title', 'section', 'content', 'closing'];

export const outlineSchema = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    subtitle: { type: 'STRING' },
    slides: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          slideType: { type: 'STRING' },
          title: { type: 'STRING' },
          summary: { type: 'STRING' },
        },
        required: ['slideType', 'title', 'summary'],
      },
    },
  },
  required: ['title', 'slides'],
};

// The 12 named layouts from the product spec. AI picks one per slide;
// lib/presentation/layoutEngine.js (Phase B) turns {layout, content} into
// positioned canvas objects — the AI never outputs coordinates.
export const LAYOUTS = [
  'title', 'titleBullets', 'twoColumn', 'imageText', 'process', 'timeline',
  'comparison', 'statistics', 'chart', 'quote', 'sectionDivider', 'keyTakeaway',
];

// Sparse/flat per-slide content schema — only layout+title required, every
// other field is optional so any of the 12 layouts can populate just the
// fields it needs without Gemini needing discriminated unions.
export const slideContentSchema = {
  type: 'OBJECT',
  properties: {
    slides: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          layout: { type: 'STRING' },
          title: { type: 'STRING' },
          subtitle: { type: 'STRING' },
          bullets: { type: 'ARRAY', items: { type: 'STRING' } },
          body: { type: 'STRING' },
          columns: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { heading: { type: 'STRING' }, bullets: { type: 'ARRAY', items: { type: 'STRING' } } },
            },
          },
          steps: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { label: { type: 'STRING' }, description: { type: 'STRING' } },
            },
          },
          comparisonItems: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { heading: { type: 'STRING' }, points: { type: 'ARRAY', items: { type: 'STRING' } } },
            },
          },
          stats: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { value: { type: 'STRING' }, label: { type: 'STRING' } },
            },
          },
          chartType: { type: 'STRING' },
          chartLabels: { type: 'ARRAY', items: { type: 'STRING' } },
          chartValues: { type: 'ARRAY', items: { type: 'NUMBER' } },
          quote: { type: 'STRING' },
          quoteAuthor: { type: 'STRING' },
          keyTakeaway: { type: 'STRING' },
          imageQuery: { type: 'STRING' },
          notes: { type: 'STRING' },
        },
        required: ['layout', 'title'],
      },
    },
  },
  required: ['slides'],
};

// Single-slide variant of slideContentSchema, reused by the Phase C slide
// assistant actions — same per-slide shape, no `slides` array wrapper,
// because an assistant action only ever sends/receives one slide.
export const singleSlideSchema = slideContentSchema.properties.slides.items;
