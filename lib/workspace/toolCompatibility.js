// Explicit compatibility rules for the Document Session workspace — which
// tools can pull the active session document in as their input, which can
// push a result back into the session, and how the sidebar should describe
// the ones that can't do one or the other. See the architecture plan at
// /root/.claude/plans/radiant-dazzling-oasis.md, §2 and §5.

// Full round-trip: pulls the session document on load, pushes its result
// back on completion. Grows tool-by-tool as each is wired — see Phase 2's
// rollout (Redact/Sign from Phase 1, plus the 10 tools added in Phase 2).
export const SESSION_COMPATIBLE_TOOLS = [
  'redact-pdf', 'sign-pdf', 'write-on-pdf', 'fill-pdf', 'watermark-pdf',
  'merge-pdf', 'reorder-pdf', 'rotate-pdf', 'remove-pdf-pages',
  'extract-pdf-pages', 'pdf-overlay',
];

// Can pull the session document as input, but does not feed a result back —
// Split PDF fans one document out into many, so "the document" stops being
// a single thing partway through. Terminal for v1 per the product brief;
// a later "continue with page N" chooser is a nice-to-have, not required.
export const PULL_ONLY_TOOLS = ['split-pdf', 'pdf-to-png'];

// Can push a result INTO the session but can't pull one out — Images to PDF
// takes photos/images as input, not the current PDF, so there's nothing to
// pull; its output can still become (or replace) the session's document.
export const PUSH_ONLY_TOOLS = ['images-to-pdf'];

// Reachable from the sidebar as real destinations — the user can navigate
// there and manually work with the current document — but not wired for an
// automatic hand-off in v1: protect-pdf/ocr-pdf/compress-pdf are async or
// payment-gated server jobs, and the office conversions run through
// CloudConvert. pdf-to-png moved to PULL_ONLY_TOOLS above — it's a pure
// client-side render, so there was no real reason to force a re-upload.
export const DESTINATION_ONLY_TOOLS = [
  'protect-pdf', 'ocr-pdf', 'compress-pdf',
  'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint',
];

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
