// Platform limits for Document Translator — protect operating cost
// regardless of which engine sits behind lib/documentTranslate/engine.js.
// Shared between the client (reject early, before an upload even starts)
// and the API route (never trust the client-side check alone).

// A dense business-document page runs roughly 2,000 characters — this caps
// worst-case per-request Gemini cost to well under a dollar even after the
// Oct-2026 3.5 Flash repricing (see the cost analysis in conversation), and
// keeps a single request's translation well inside one Gemini call's output
// token ceiling.
export const MAX_CHARACTERS = 100000;
export const MAX_PAGES = 50; // informational (PDF pageCount) — MAX_CHARACTERS is the real enforced ceiling
export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB, matching the ceiling already enforced on Sign PDF / Write on PDF

export function validateFileSize(file) {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `This file is larger than the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit for Document Translator.`;
  }
  return null;
}

export function validateTextLength(text) {
  if (text.length > MAX_CHARACTERS) {
    return `This document has too much text to translate in one go (${text.length.toLocaleString()} characters — the limit is ${MAX_CHARACTERS.toLocaleString()}). Try a shorter document or split it first.`;
  }
  return null;
}
