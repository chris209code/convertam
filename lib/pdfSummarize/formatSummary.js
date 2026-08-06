// Converts any summary type's raw structured result into one uniform shape
// — [{ heading, kind: 'paragraph' | 'list', items }] — so every export
// format (plain text, Markdown, PDF, DOCX) and the on-screen result render
// from this same normalized shape instead of each independently knowing
// about all 7 summary schemas.

import { FIELD_LABELS, SUMMARY_TYPES } from './schema';

export function summaryToSections(type, summary) {
  const typeConfig = SUMMARY_TYPES[type] || SUMMARY_TYPES.smart;
  const fields = typeConfig.fieldOrder || Object.keys(summary || {});
  const sections = [];
  for (const field of fields) {
    const value = summary?.[field];
    if (value == null) continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      sections.push({ heading: FIELD_LABELS[field] || field, kind: 'list', items: value });
    } else if (typeof value === 'string' && value.trim()) {
      sections.push({ heading: FIELD_LABELS[field] || field, kind: 'paragraph', items: [value] });
    }
  }
  return sections;
}

// Chapter Summary's shape ({ chapters: [{ title, summary, keyPoints }] })
// doesn't fit the single-result field-order model above — each chapter
// becomes its own heading, with a paragraph followed by its key points.
export function chaptersToSections(chapters) {
  const sections = [];
  for (const chapter of chapters) {
    if (chapter.summary) sections.push({ heading: chapter.title, kind: 'paragraph', items: [chapter.summary] });
    if (chapter.keyPoints?.length) sections.push({ heading: `${chapter.title} — Key Points`, kind: 'list', items: chapter.keyPoints });
  }
  return sections;
}

export function sectionsToPlainText(sections, title) {
  const lines = [];
  if (title) lines.push(title.toUpperCase(), '');
  for (const s of sections) {
    lines.push(s.heading.toUpperCase());
    if (s.kind === 'list') lines.push(...s.items.map((i) => `- ${i}`));
    else lines.push(s.items[0]);
    lines.push('');
  }
  return lines.join('\n').trim();
}

export function sectionsToMarkdown(sections, title) {
  const lines = [`# ${title || 'Summary'}`, ''];
  for (const s of sections) {
    lines.push(`## ${s.heading}`, '');
    if (s.kind === 'list') lines.push(...s.items.map((i) => `- ${i}`));
    else lines.push(s.items[0]);
    lines.push('');
  }
  return lines.join('\n').trim();
}
