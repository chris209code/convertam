// Single source of truth for which Gemini model Convertam calls. Every
// route that talks to Gemini imports GEMINI_MODEL_URL from here instead of
// building its own `.../models/<name>:generateContent` string — upgrading
// models (or pinning a dated snapshot after this one is deprecated) is then
// a one-line change here, not a repo-wide search-and-replace.
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
export const GEMINI_MODEL_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
