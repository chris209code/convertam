// Reshapes whatever sparse fields Gemini populated (per
// lib/presentation/presentationSchema.js's flat slideContentSchema) into a
// clean, per-layout `content` object with safe defaults. Gemini's
// responseSchema has no discriminated-union support, so every layout field
// is optional on the wire — this is the one place that gets sorted out
// before lib/presentation/layoutEngine.js ever sees a slide.

import { LAYOUTS } from './presentationSchema';

function asArray(v) { return Array.isArray(v) ? v : []; }
function asString(v) { return typeof v === 'string' ? v : ''; }

export function normalizeSlide(raw, index) {
  const layout = LAYOUTS.includes(raw?.layout) ? raw.layout : 'titleBullets';
  const id = raw?.id || `slide-${index}`;
  const title = asString(raw?.title) || `Slide ${index + 1}`;
  const notes = asString(raw?.notes);

  const base = { id, layout, title, notes };

  switch (layout) {
    case 'title':
      return { ...base, content: { title, subtitle: asString(raw?.subtitle) } };
    case 'twoColumn': {
      const cols = asArray(raw?.columns).slice(0, 2).map((c) => ({ heading: asString(c?.heading), bullets: asArray(c?.bullets).map(asString).slice(0, 5) }));
      while (cols.length < 2) cols.push({ heading: '', bullets: [] });
      return { ...base, content: { title, columns: cols } };
    }
    case 'imageText':
      return { ...base, content: { title, bullets: asArray(raw?.bullets).map(asString).slice(0, 5), imageQuery: asString(raw?.imageQuery) } };
    case 'process':
    case 'timeline': {
      const steps = asArray(raw?.steps).map((s) => ({ label: asString(s?.label), description: asString(s?.description) })).slice(0, 6);
      return { ...base, content: { title, steps } };
    }
    case 'comparison': {
      const items = asArray(raw?.comparisonItems).map((c) => ({ heading: asString(c?.heading), points: asArray(c?.points).map(asString).slice(0, 5) })).slice(0, 3);
      return { ...base, content: { title, comparisonItems: items } };
    }
    case 'statistics': {
      const stats = asArray(raw?.stats).map((s) => ({ value: asString(s?.value), label: asString(s?.label) })).slice(0, 4);
      return { ...base, content: { title, stats } };
    }
    case 'chart': {
      const labels = asArray(raw?.chartLabels).map(asString);
      const values = asArray(raw?.chartValues).map((v) => (typeof v === 'number' ? v : Number(v) || 0));
      const chartType = ['bar', 'line', 'pie', 'doughnut'].includes(raw?.chartType) ? raw.chartType : 'bar';
      return { ...base, content: { title, chartType, labels, values } };
    }
    case 'quote':
      return { ...base, content: { quote: asString(raw?.quote) || title, quoteAuthor: asString(raw?.quoteAuthor) } };
    case 'sectionDivider':
      return { ...base, content: { title, subtitle: asString(raw?.subtitle) } };
    case 'keyTakeaway':
      return { ...base, content: { title, keyTakeaway: asString(raw?.keyTakeaway) || asString(raw?.body) } };
    case 'titleBullets':
    default:
      return { ...base, content: { title, bullets: asArray(raw?.bullets).map(asString).slice(0, 5) } };
  }
}

export function normalizeSlideContentResponse(parsed) {
  const slides = asArray(parsed?.slides);
  return slides.map((s, i) => normalizeSlide(s, i));
}
