// Deterministic field extraction — the "Extract Data" mode's local pass,
// run before any AI call. Reuses Extract Studio's regex extractors
// (emails/phones/urls/dates/currency/postal codes) rather than
// reimplementing them, and adds a "Label: Value" line scanner on top —
// the single most useful pattern for invoice/business-document style
// fields ("Invoice Number: INV-2026-0012", "Total: ₦245,000").
//
// Deliberately does NOT attempt free-floating name/company detection
// without a label — distinguishing "John Smith" the customer from any
// other capitalized phrase in running text isn't reliably recoverable from
// regex alone, and guessing wrong would silently mislabel data. Matches
// the same honesty stance components/tools/redact-edit/fontMatch.js
// already commits to: real signal only, everything else deferred to the
// optional AI enhancement layer (schemaMap.js's AI path).

import { extractType } from '@/components/tools/data-tools/extractEngine';

const REGEX_FIELD_TYPES = ['emails', 'phones', 'urls', 'dates', 'currency', 'postal'];

const LABEL_VALUE_RE = /^\s*([A-Za-z][A-Za-z0-9 /&_.-]{1,40}?)\s*:\s*(.+?)\s*$/;

// Maps a label's own text to a canonical field key when it clearly matches
// a common business-document field — used by schemaMap.js to answer "which
// extracted label most likely corresponds to the schema field the user
// asked for" without needing AI for the obvious cases.
const KNOWN_LABEL_PATTERNS = [
  { key: 'invoiceNumber', re: /invoice\s*(no\.?|number|#)|inv\s*#/i },
  { key: 'poNumber', re: /p\.?o\.?\s*(no\.?|number)|purchase\s*order/i },
  { key: 'date', re: /^date$|invoice\s*date|issue\s*date/i },
  { key: 'dueDate', re: /due\s*date/i },
  { key: 'total', re: /\btotal\b|amount\s*due|grand\s*total|balance\s*due/i },
  { key: 'subtotal', re: /sub\s*-?\s*total/i },
  { key: 'tax', re: /\bvat\b|\btax\b|\bgst\b/i },
  { key: 'customer', re: /customer|client|bill\s*to|attn|attention/i },
  { key: 'company', re: /company|vendor|from|business\s*name/i },
  { key: 'phone', re: /phone|tel\.?|mobile|cell/i },
  { key: 'email', re: /e-?mail/i },
  { key: 'address', re: /address/i },
  { key: 'status', re: /^status$/i },
  { key: 'paymentStatus', re: /payment\s*status|paid\?/i },
  { key: 'name', re: /^name$|full\s*name|contact\s*name/i },
  { key: 'reference', re: /reference|ref\.?\s*(no\.?|number)/i },
];

export function matchKnownLabel(label) {
  const match = KNOWN_LABEL_PATTERNS.find((p) => p.re.test(label.trim()));
  return match ? match.key : null;
}

// Scans line-by-line (not the whole text as one regex) so a "Label: Value"
// pair spanning a paragraph of prose containing a stray colon isn't
// misread — a genuine field line is short and colon-led by design in
// virtually every business document template.
export function extractLabeledFields(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const fields = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 120) continue; // a 120+ char "line" is prose that happens to contain a colon, not a field
    const m = trimmed.match(LABEL_VALUE_RE);
    if (!m) continue;
    const [, label, value] = m;
    if (!value.trim()) continue;
    fields.push({ label: label.trim(), value: value.trim(), matchedKey: matchKnownLabel(label), confidence: 'medium' });
  }
  return fields;
}

// Address extraction is intentionally modest: a line containing a postal
// code is flagged as a *possible* address line, not confidently labeled as
// one — full address parsing (street/city/region boundaries) needs real
// NLP that regex can't honestly provide. See the module header note.
export function extractPossibleAddressLines(text) {
  if (!text) return [];
  const postalMatches = extractType('postal', text);
  if (!postalMatches.length) return [];
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const postalSet = new Set(postalMatches);
  return lines.filter((line) => [...postalSet].some((code) => line.includes(code)));
}

// The full deterministic pass — every regex field type plus labeled fields
// plus possible-address lines, all in one call so a single ingestResult
// only needs one round-trip through this module.
export function extractAll(rawText) {
  const byType = {};
  for (const type of REGEX_FIELD_TYPES) byType[type] = extractType(type, rawText);
  return {
    ...byType,
    labeledFields: extractLabeledFields(rawText),
    possibleAddressLines: extractPossibleAddressLines(rawText),
  };
}
