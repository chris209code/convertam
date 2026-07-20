// Reusable, pure-function extraction engine — every extractor here is a
// plain string -> string[] function driven by a bounded, linear-time regex
// (no nested unbounded quantifiers, so none of these can catastrophically
// backtrack on adversarial input). Extract Studio is the first consumer,
// but the registry + filter/pipeline helpers are generic enough for any
// future tool that needs to pull structured values out of free text.

export const EXTRACTOR_TYPES = [
  { id: 'emails', label: 'Email Addresses', icon: '📧' },
  { id: 'phones', label: 'Phone Numbers', icon: '☎️' },
  { id: 'urls', label: 'URLs', icon: '🔗' },
  { id: 'domains', label: 'Domains', icon: '🌐' },
  { id: 'ips', label: 'IP Addresses', icon: '🖥️' },
  { id: 'numbers', label: 'Numbers', icon: '🔢' },
  { id: 'currency', label: 'Currency Values', icon: '💰' },
  { id: 'dates', label: 'Dates', icon: '📅' },
  { id: 'times', label: 'Times', icon: '⏰' },
  { id: 'postal', label: 'Postal Codes', icon: '📮' },
  { id: 'hashtags', label: 'Hashtags', icon: '#️⃣' },
  { id: 'mentions', label: 'Mentions', icon: '👤' },
  { id: 'social', label: 'Social Links', icon: '🔁' },
];

const MONTH = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?';

const REGEX = {
  emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Two shapes: a longer international/grouped number (country code and/or
  // area code plus two more digit groups), or a bare 7-digit local number
  // (e.g. "555-1234") that the longer pattern can't match since it always
  // needs three digit groups.
  phones: /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?|\b\d{3}[\s.-]?\d{4}\b/g,
  urls: /https?:\/\/[^\s<>"'\]]+/g,
  domains: /\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}\b/g,
  ips: /\b(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,
  // (?<!\d) keeps a hyphen used as a separator (phone/date, e.g. "555-2671")
  // from being misread as a minus sign — only a hyphen NOT preceded by a
  // digit counts as negative.
  numbers: /(?<!\d)-?\b\d{1,3}(?:,\d{3})+(?:\.\d+)?\b|(?<!\d)-?\b\d+(?:\.\d+)?\b/g,
  currency: /[$€£¥₦₹]\s?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:USD|EUR|GBP|NGN|JPY|CAD|AUD|INR)\b/g,
  dates: new RegExp(
    `\\b\\d{4}-\\d{1,2}-\\d{1,2}\\b|\\b\\d{1,2}\\/\\d{1,2}\\/\\d{2,4}\\b|\\b\\d{1,2}-\\d{1,2}-\\d{2,4}\\b|` +
    `\\b${MONTH}\\s+\\d{1,2},?\\s+\\d{4}\\b|\\b\\d{1,2}\\s+${MONTH}\\,?\\s+\\d{4}\\b`,
    'gi'
  ),
  times: /\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s?[APap][Mm])?\b/g,
  postal: /\b\d{5}(?:-\d{4})?\b|\b[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}\b|\b[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d\b/g,
  hashtags: /#[a-zA-Z0-9_]+/g,
  mentions: /(?<![\w.])@[a-zA-Z0-9_]+/g,
  social: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com|instagram\.com|facebook\.com|fb\.com|linkedin\.com|tiktok\.com|youtube\.com|youtu\.be|github\.com|reddit\.com|pinterest\.com|snapchat\.com|threads\.net)\/[^\s<>"'\]]+/gi,
};

export function extractType(id, text) {
  if (!text) return [];
  const re = REGEX[id];
  if (!re) return [];
  return text.match(re) || [];
}

export function extractorLabel(id) {
  return EXTRACTOR_TYPES.find((t) => t.id === id)?.label || id;
}

// ---------------------------------------------------------------------
// FILTER / SORT — pure list -> list helpers, shared by both the per-card
// quick filters and the chainable pipeline below.
// ---------------------------------------------------------------------

export function uniqueList(list) {
  return Array.from(new Set(list));
}

export function removeEmptyFromList(list) {
  return list.filter((v) => v != null && String(v).trim() !== '');
}

const SORT_MODES = ['alpha-asc', 'alpha-desc', 'numeric-asc', 'numeric-desc'];

export function sortList(list, mode) {
  if (!SORT_MODES.includes(mode)) return list;
  const arr = [...list];
  if (mode === 'alpha-asc') arr.sort((a, b) => a.localeCompare(b));
  else if (mode === 'alpha-desc') arr.sort((a, b) => b.localeCompare(a));
  else if (mode === 'numeric-asc') arr.sort((a, b) => (parseFloat(a.replace(/[^0-9.-]/g, '')) || 0) - (parseFloat(b.replace(/[^0-9.-]/g, '')) || 0));
  else if (mode === 'numeric-desc') arr.sort((a, b) => (parseFloat(b.replace(/[^0-9.-]/g, '')) || 0) - (parseFloat(a.replace(/[^0-9.-]/g, '')) || 0));
  return arr;
}

export function applyListFilters(list, { uniqueOnly, removeEmpty, sortMode } = {}) {
  let out = list;
  if (removeEmpty) out = removeEmptyFromList(out);
  if (uniqueOnly) out = uniqueList(out);
  if (sortMode) out = sortList(out, sortMode);
  return out;
}

// ---------------------------------------------------------------------
// STATS
// ---------------------------------------------------------------------

export function computeExtractStats(text) {
  const characters = text.length;
  const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const lines = text === '' ? 0 : text.split('\n').length;
  return {
    characters,
    words,
    lines,
    emailsFound: extractType('emails', text).length,
    urlsFound: extractType('urls', text).length,
    numbersFound: extractType('numbers', text).length,
    phonesFound: extractType('phones', text).length,
    domainsFound: extractType('domains', text).length,
  };
}

// ---------------------------------------------------------------------
// PIPELINE — like Text Cleaner Studio / JSON Studio's chainable pipeline.
// The working value starts as the raw input text (a string); the first
// "Extract <Type>" step turns it into a list, and every step after that
// operates on the list. Every op below handles both representations so
// steps can be reordered freely without the pipeline ever throwing.
// ---------------------------------------------------------------------

export const PIPELINE_OPERATIONS = [
  { id: 'remove-blank-lines', label: 'Remove Blank Lines', kind: 'transform', category: 'clean' },
  ...EXTRACTOR_TYPES.map((t) => ({ id: `extract-${t.id}`, label: `Extract ${t.label}`, kind: 'extract', extractId: t.id, category: 'extract' })),
  { id: 'remove-duplicates', label: 'Remove Duplicates', kind: 'transform', category: 'clean' },
  { id: 'remove-empty', label: 'Remove Empty', kind: 'transform', category: 'clean' },
  { id: 'sort-alpha-asc', label: 'Sort A → Z', kind: 'transform', category: 'sort' },
  { id: 'sort-alpha-desc', label: 'Sort Z → A', kind: 'transform', category: 'sort' },
  { id: 'sort-numeric-asc', label: 'Sort Numeric ↑', kind: 'transform', category: 'sort' },
  { id: 'sort-numeric-desc', label: 'Sort Numeric ↓', kind: 'transform', category: 'sort' },
];

export function pipelineOperationById(id) {
  return PIPELINE_OPERATIONS.find((o) => o.id === id);
}

function toLines(value) {
  return Array.isArray(value) ? value : (value === '' ? [] : value.split('\n'));
}

function applyPipelineOp(op, value) {
  if (op.kind === 'extract') {
    const text = Array.isArray(value) ? value.join('\n') : value;
    return extractType(op.extractId, text);
  }
  if (op.id === 'remove-blank-lines' || op.id === 'remove-empty') {
    const cleaned = removeEmptyFromList(toLines(value));
    return Array.isArray(value) ? cleaned : cleaned.join('\n');
  }
  if (op.id === 'remove-duplicates') {
    const deduped = uniqueList(toLines(value));
    return Array.isArray(value) ? deduped : deduped.join('\n');
  }
  if (op.id.startsWith('sort-')) {
    const mode = op.id.slice('sort-'.length);
    const sorted = sortList(toLines(value), mode);
    return Array.isArray(value) ? sorted : sorted.join('\n');
  }
  return value;
}

export function applyExtractPipeline(text, pipeline) {
  let value = text;
  for (const step of pipeline) {
    const op = pipelineOperationById(step.opId);
    if (!op) continue;
    value = applyPipelineOp(op, value);
  }
  return value;
}

export function pipelineResultList(value) {
  return Array.isArray(value) ? value : toLines(value);
}

// ---------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------

export function toTXT(list) {
  return list.join('\n');
}

export function toCSV(list) {
  return list.map((v) => `"${String(v).replace(/"/g, '""')}"`).join('\r\n');
}

export function toJSONList(list) {
  return JSON.stringify(list, null, 2);
}
