// "Continue Working" suggestions shown after a session-compatible tool
// finishes — workflow suggestions, not forced actions (the Download choice
// is always available alongside them). Only lists suggestions the workspace
// can currently deliver on end-to-end: both the source and destination tool
// must already be wired into the Document Session (see
// lib/workspace/toolCompatibility.js). Grows as more tools are wired in.
const SUGGESTIONS = {
  'redact-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature to the document', icon: '✒️' },
  ],
  'sign-pdf': [
    { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Black out or correct anything else', icon: '⬛' },
  ],
};

export function getToolSuggestions(toolSlug) {
  return SUGGESTIONS[toolSlug] || [];
}
