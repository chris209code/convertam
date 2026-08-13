// Local normalization — cleans up raw regex/label-scan matches into a more
// consistent shape without ever inventing a value that wasn't actually in
// the source text. Every function here is total (never throws) and falls
// back to returning the original string when a value can't be confidently
// normalized, since a wrong guess is worse than leaving it as-is.

const CURRENCY_SYMBOL_RE = /^[$€£¥₦₹]/;
const CURRENCY_CODE_RE = /\b(USD|EUR|GBP|NGN|JPY|CAD|AUD|INR)\b/i;

export function normalizeCurrencyValue(raw) {
  const s = String(raw).trim();
  const symbolMatch = s.match(CURRENCY_SYMBOL_RE);
  const codeMatch = s.match(CURRENCY_CODE_RE);
  const numeric = parseFloat(s.replace(/[^0-9.-]/g, ''));
  return {
    raw: s,
    numeric: Number.isFinite(numeric) ? numeric : null,
    currency: symbolMatch?.[0] || codeMatch?.[1]?.toUpperCase() || null,
  };
}

// Best-effort date parsing across the common formats fieldExtract's `dates`
// regex actually matches (ISO, D/M/Y, D-M-Y, "12 Aug 2026", "Aug 12, 2026").
// Returns { raw, iso } — iso is null when the value can't be confidently
// parsed, which the caller displays as-is rather than guessing a date.
export function normalizeDateValue(raw) {
  const s = String(raw).trim();
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime()) && s.length >= 6) {
    return { raw: s, iso: parsed.toISOString().slice(0, 10) };
  }
  return { raw: s, iso: null };
}

export function cleanWhitespace(str) {
  return String(str).replace(/\s+/g, ' ').trim();
}

export function dedupeList(list) {
  return Array.from(new Set(list.map((v) => cleanWhitespace(v))));
}

// Applied to fieldExtract.extractAll()'s output before it reaches the UI —
// dedupes every regex-matched list and cleans labeled-field values, without
// touching matchedKey/confidence, which stay exactly as detected.
export function normalizeExtraction(extraction) {
  const out = { ...extraction };
  for (const key of ['emails', 'phones', 'urls', 'dates', 'currency', 'postal']) {
    if (Array.isArray(out[key])) out[key] = dedupeList(out[key]);
  }
  if (Array.isArray(out.labeledFields)) {
    out.labeledFields = out.labeledFields.map((f) => ({ ...f, value: cleanWhitespace(f.value) }));
  }
  return out;
}
