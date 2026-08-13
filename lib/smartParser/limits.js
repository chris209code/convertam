// Free-tier limits for Smart Parser — same product-limitation (not
// paywall) framing as lib/documentTranslate/limits.js. Checked client-side
// before ingestion starts, and again before any AI call is made, since the
// AI route is the only part of this tool with a real per-call cost.

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB, matching UploadBox's own default ceiling
export const MAX_PAGES_FOR_AI = 20; // bounds a single "Analyze with AI" call's cost regardless of document size
export const MAX_AI_TEXT_CHARS = 60000; // sent-to-Gemini text ceiling for the deterministic-text-plus-AI-cleanup path

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.csv', '.xlsx', '.xls', '.txt', '.jpg', '.jpeg', '.png', '.webp'];
export const ACCEPT_ATTR = SUPPORTED_EXTENSIONS.join(',');

export function validateFile(file) {
  if (!file) return 'No file selected.';
  if (file.size === 0) return 'This file is empty.';
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `This file is larger than the ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit. Please compress or split it first.`;
  }
  const name = (file.name || '').toLowerCase();
  const ok = SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!ok) {
    return `Unsupported file type. Smart Parser accepts PDF, Word (DOCX), CSV, Excel (XLSX/XLS), TXT, and image files (JPG/PNG/WebP).`;
  }
  return null;
}
