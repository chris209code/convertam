// Free-tier limits for Document Translator — protect operating cost
// regardless of which engine sits behind lib/documentTranslate/engine.js.
// Shared between the client (reject early, before an upload even starts, or
// even before a full extraction is done) and the API route (never trust
// the client-side check alone). This is a product limitation, not a
// payment wall — Convertam stays free, so the messaging here never
// mentions pricing, upgrades, or premium tiers, only that this free
// version currently supports documents up to this size.

// Page count is the primary gate for formats that actually have one (PDF,
// PPTX). A dense business-document page runs roughly 2,000 characters, so
// 5 pages at that density is ~10,000 characters — that number is the
// fallback gate for formats with no reliable page count (DOCX, TXT, pasted
// text), kept consistent with the page limit rather than picked separately.
export const MAX_PAGES = 5;
export const MAX_CHARACTERS = 10000;
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB, matching the ceiling already enforced on Sign PDF / Write on PDF

const SPLIT_SUGGESTION = 'Please split it into smaller documents and try again.';

export function validateFileSize(file) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `This file is larger than the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit for Document Translator.`;
  }
  return null;
}

// Only meaningful where a real page/slide count is available (PDF, PPTX) —
// DOCX has no fixed page count without a layout engine, so that format
// relies on validateTextLength alone. Checked as early as possible (right
// after a page/slide count is known, before extracting all the text) so an
// oversized document is rejected before any translation request is ever
// built, not after — never a partial translation of an oversized document.
export function validatePageCount(pageCount) {
  if (pageCount > MAX_PAGES) {
    return `This document is larger than the current free translation limit (${MAX_PAGES} pages). ${SPLIT_SUGGESTION}`;
  }
  return null;
}

// Shared by both the flat-text path (validateTextLength) and the
// structure-preserving path, which sends an array of text blocks rather
// than one string — the combined length of those blocks is what actually
// matters for cost/latency, not any single block.
export function validateTotalLength(length) {
  if (length > MAX_CHARACTERS) {
    return `This document is larger than the current free translation limit (${MAX_CHARACTERS.toLocaleString()} characters). ${SPLIT_SUGGESTION}`;
  }
  return null;
}

export function validateTextLength(text) {
  return validateTotalLength(text.length);
}
