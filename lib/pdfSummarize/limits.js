// Safety ceiling for Summarize PDF's map-reduce pipeline — not a marketing
// "free tier" wall like documentTranslate/limits.js (whose 5-page cap
// exists because translation output is roughly as long as the input).
// Summarization compresses via chunking, so the real constraint is total
// wall-clock time within this app's serverless function timeout: every API
// route in this app caps at maxDuration = 60 (the platform's actual
// ceiling — see app/api/*/route.js), and each chunk needs its own Gemini
// round trip, so the per-run page count is sized to reliably finish inside
// that window at pipeline.js's chunk concurrency, not picked arbitrarily.
// LARGE_DOC_THRESHOLD_PAGES is the point above which the UI asks the user
// to choose a range before generating, rather than silently truncating.

export const LARGE_DOC_THRESHOLD_PAGES = 40;
export const MAX_PAGES_PER_RUN = 100;
export const MAX_CHARACTERS_PER_RUN = 350000; // ~100 pages at ~3,500 chars/page

const RANGE_SUGGESTION = 'Choose a smaller page range and try again.';

// selection: 'all' | { start, end } (1-indexed, inclusive). Resolves and
// clamps against the real page count so a stale/malicious client value
// can never select outside the document's actual bounds.
export function resolveSelection(pageCount, selection) {
  if (!selection || selection === 'all') return { start: 1, end: pageCount };
  const start = Math.max(1, Math.min(selection.start || 1, pageCount));
  const end = Math.max(start, Math.min(selection.end || pageCount, pageCount));
  return { start, end };
}

// Checked server-side (never trust the client alone) after resolving the
// selection to an actual page range. Returns a user-facing message string,
// or null if the selection is within limits.
export function validateSelection({ pageCount, selection, totalCharacters }) {
  const { start, end } = resolveSelection(pageCount, selection);
  const pagesSelected = end - start + 1;
  if (pagesSelected > MAX_PAGES_PER_RUN) {
    return `That's ${pagesSelected} pages — the current limit per summary is ${MAX_PAGES_PER_RUN} pages. ${RANGE_SUGGESTION}`;
  }
  if (totalCharacters != null && totalCharacters > MAX_CHARACTERS_PER_RUN) {
    return `That selection is larger than the current ${MAX_CHARACTERS_PER_RUN.toLocaleString()}-character limit per summary. ${RANGE_SUGGESTION}`;
  }
  return null;
}
