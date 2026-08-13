// Custom Schema mode's deterministic pass — given the user's requested
// field list (e.g. "Customer Name", "Invoice Number", "Total Amount") and
// the already-extracted data, produces a best-effort local match for each
// field BEFORE any AI call. This is what lets Custom Schema mode work at
// all without AI, and it's what "Analyze with AI" later improves on for
// fields this pass couldn't confidently resolve.
//
// Matching happens in three tiers, most-confident first:
//  1. Canonical key match — the requested field name and an extracted
//     labeled field both map to the same known business-document key
//     (e.g. "Invoice Number" and "Invoice No:" both -> invoiceNumber).
//  2. Fuzzy word-overlap match against every extracted label — catches
//     field names/labels that don't fit a known pattern but clearly share
//     the same words (e.g. "Client Company" vs "Client:").
//  3. Type inference from the field name itself, falling back to the
//     matching regex-extracted list (e.g. a field named "Email" pulls the
//     first extracted email address) — the weakest tier, since it has no
//     idea which extracted value (if several) is the *right* one.
// A field none of these can resolve is returned with value: null and
// confidence: 'none' rather than guessed at.

import { matchKnownLabel } from './fieldExtract';

function tokenize(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
}

function wordOverlapScore(a, b) {
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared += 1;
  return shared / Math.max(ta.size, tb.size);
}

function inferTypeFromFieldName(name) {
  const n = name.toLowerCase();
  if (/e-?mail/.test(n)) return 'email';
  if (/phone|tel|mobile|cell/.test(n)) return 'phone';
  if (/date/.test(n)) return 'date';
  if (/total|amount|price|cost|\bvat\b|\btax\b|subtotal|balance|\bfee\b/.test(n)) return 'currency';
  if (/url|link|website/.test(n)) return 'url';
  if (/address/.test(n)) return 'address';
  return null;
}

const TYPE_TO_EXTRACTION_KEY = { email: 'emails', phone: 'phones', date: 'dates', currency: 'currency', url: 'urls', address: 'possibleAddressLines' };

function findBestLabelMatch(fieldName, labeledFields) {
  if (!labeledFields?.length) return null;
  const fieldKnownKey = matchKnownLabel(fieldName);
  if (fieldKnownKey) {
    const canonicalMatch = labeledFields.find((f) => f.matchedKey === fieldKnownKey);
    if (canonicalMatch) return { field: canonicalMatch, tier: 1 };
  }
  let best = null;
  let bestScore = 0;
  for (const f of labeledFields) {
    const score = wordOverlapScore(fieldName, f.label);
    if (score > bestScore) { bestScore = score; best = f; }
  }
  return bestScore >= 0.4 ? { field: best, tier: 2 } : null;
}

export function mapToCustomSchema(schemaFields, extraction) {
  return schemaFields.map((fieldName) => {
    const trimmed = String(fieldName).trim();
    if (!trimmed) return null;

    const labelMatch = findBestLabelMatch(trimmed, extraction.labeledFields);
    if (labelMatch) {
      return {
        field: trimmed,
        value: labelMatch.field.value,
        confidence: labelMatch.tier === 1 ? 'high' : 'medium',
        source: 'labeled-field',
      };
    }

    const type = inferTypeFromFieldName(trimmed);
    const extractionKey = type ? TYPE_TO_EXTRACTION_KEY[type] : null;
    const candidates = extractionKey ? extraction[extractionKey] : null;
    if (candidates?.length) {
      return { field: trimmed, value: candidates[0], confidence: 'low', source: 'inferred-type' };
    }

    return { field: trimmed, value: null, confidence: 'none', source: 'not-found' };
  }).filter(Boolean);
}
