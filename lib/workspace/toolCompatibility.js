// Explicit compatibility rules for the Document Session workspace — which
// tools can pull the active session document in as their input, which can
// push a result back into the session, and how the sidebar should describe
// the ones that can't do one or the other. See the architecture plan at
// /root/.claude/plans/radiant-dazzling-oasis.md, §2 and §5.

// Full round-trip: pulls the session document on load, pushes its result
// back on completion. Grows tool-by-tool as each is wired — see Phase 2's
// rollout (Redact/Sign from Phase 1, plus the 10 tools added in Phase 2).
export const SESSION_COMPATIBLE_TOOLS = [
  'redact-pdf', 'sign-documents', 'write-on-pdf', 'fill-pdf', 'watermark-pdf',
  'merge-pdf', 'reorder-pdf', 'rotate-pdf', 'remove-pdf-pages',
  'extract-pdf-pages', 'pdf-overlay', 'document-translator', 'crop-pdf',
  'unlock-pdf', 'remove-pdf-metadata', 'annotate-pdf',
];

// Can pull the session document as input, but does not feed a result back.
// Split PDF fans one document out into many, so "the document" stops being
// a single thing partway through — terminal for v1 per the product brief.
// protect-pdf/ocr-pdf/compress-pdf/pdf-to-png/the PDF-input office
// conversions all produce something that isn't a plain editable PDF
// (encrypted, extracted text, a different file format, or comes back from
// an async paid job) — but every one of them still just needs "which PDF"
// as its first step, and there was no real reason to force a re-upload for
// that step just because the result can't feed back into the session.
// compare-pdf joins this list needing a second (Revised) file the session
// has no slot for — it pulls the session document into the Original slot
// only, same shape as pdf-overlay's base/overlay split, and its output is a
// view + optional report rather than a new editable PDF, so it can't push.
export const PULL_ONLY_TOOLS = [
  'split-pdf', 'pdf-to-png', 'protect-pdf', 'ocr-pdf', 'compress-pdf',
  'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint', 'compare-pdf',
];

// Can push a result INTO the session but can't pull one out — Images to PDF
// takes photos/images as input, not the current PDF, so there's nothing to
// pull; its output can still become (or replace) the session's document.
// CV Improver takes pasted/uploaded CV text as input (not a PDF to pull),
// but its improved-CV PDF output can be pushed into the session so tools
// like PDF to Word, Compress PDF, OCR PDF, and Merge PDF can pick it up
// without the user having to download and re-upload it.
export const PUSH_ONLY_TOOLS = ['images-to-pdf', 'cv-improver'];

// Reachable from the sidebar as real destinations only — nothing left here
// today. Kept as an explicit (empty) category rather than deleted, since
// it's exactly where a genuinely un-pullable tool (e.g. one that doesn't
// accept a PDF as its primary input at all) would still belong.
export const DESTINATION_ONLY_TOOLS = [];

export function canPullSessionDocument(slug) {
  return SESSION_COMPATIBLE_TOOLS.includes(slug) || PULL_ONLY_TOOLS.includes(slug);
}

export function canPushToSession(slug) {
  return SESSION_COMPATIBLE_TOOLS.includes(slug) || PUSH_ONLY_TOOLS.includes(slug);
}

export function isDestinationOnly(slug) {
  return DESTINATION_ONLY_TOOLS.includes(slug);
}

// Back-compat helper name used by the Phase 1 pilot tools.
export function isSessionCompatibleTool(slug) {
  return canPullSessionDocument(slug);
}
