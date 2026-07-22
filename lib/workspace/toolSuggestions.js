// "Continue Working" suggestions shown after a session-compatible tool
// finishes — workflow suggestions, not forced actions (the Download choice
// is always available alongside them). Kept rule-based for v1, per the
// product brief (no AI recommendations yet).
//
// Only ever suggests tools that can actually pull the session document
// automatically (see lib/workspace/toolCompatibility.js) — the panel's
// "Continue to X" wording is a promise of continuity, so it never points at
// a destination-only tool (Protect/OCR/Compress/the office conversions),
// even though those are reachable from the sidebar. Those still show up
// there, just without the same continuity promise.
const SUGGESTIONS = {
  'redact-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature to the document', icon: '✒️' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT', icon: '💧' },
  ],
  'sign-pdf': [
    { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Black out or correct anything else', icon: '⬛' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
  ],
  'write-on-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature next', icon: '✒️' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT', icon: '💧' },
  ],
  'fill-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Sign the form you just filled', icon: '✒️' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it before sending', icon: '💧' },
  ],
  'watermark-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature', icon: '✒️' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
  ],
  'merge-pdf': [
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark the combined file', icon: '💧' },
    { slug: 'rotate-pdf', title: 'Rotate PDF', desc: 'Fix any sideways pages', icon: '🔄' },
  ],
  'rotate-pdf': [
    { slug: 'remove-pdf-pages', title: 'Remove Pages', desc: 'Drop anything you don’t need', icon: '🗑️' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
  ],
  'remove-pdf-pages': [
    { slug: 'rotate-pdf', title: 'Rotate PDF', desc: 'Fix any sideways pages', icon: '🔄' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
  ],
  'extract-pdf-pages': [
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark the extracted pages', icon: '💧' },
  ],
  'pdf-overlay': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature', icon: '✒️' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT', icon: '💧' },
  ],
  'images-to-pdf': [
    { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Black out or correct anything', icon: '⬛' },
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature', icon: '✒️' },
  ],
};

export function getToolSuggestions(toolSlug) {
  return SUGGESTIONS[toolSlug] || [];
}
