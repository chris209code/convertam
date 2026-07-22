// "Continue Working" suggestions shown after a session-compatible tool
// finishes — workflow suggestions, not forced actions (the Download choice
// is always available alongside them). Kept rule-based for v1, per the
// product brief (no AI recommendations yet).
//
// Every suggestion here resolves to a tool that can at least PULL the
// session document automatically (see lib/workspace/toolCompatibility.js's
// canPullSessionDocument) — "Continue to X" always means no re-upload is
// needed to get started on X, whether or not X can push a result back for
// further chaining afterward. Document Translator's own suggestions
// (PDF to Word, OCR PDF, Compress PDF, Protect PDF) are a deliberate
// example of this: those four are pull-only, not full round-trip, but the
// promise still holds for the step that matters — arriving there with the
// translated document already loaded.
const SUGGESTIONS = {
  'redact-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature to the document' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT' },
  ],
  'sign-pdf': [
    { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Black out or correct anything else' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document' },
    { slug: 'document-translator', title: 'Document Translator', desc: 'Send a translated copy to someone else' },
  ],
  'write-on-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature next' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT' },
  ],
  'fill-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Sign the form you just filled' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it before sending' },
  ],
  'watermark-pdf': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document' },
  ],
  'document-translator': [
    { slug: 'pdf-to-word', title: 'PDF to Word', desc: 'Make the translation editable in Word' },
    { slug: 'ocr-pdf', title: 'OCR PDF', desc: 'Extract the translated text as searchable text' },
    { slug: 'compress-pdf', title: 'Compress PDF', desc: 'Shrink the file size before sending it on' },
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature to the translation' },
    { slug: 'protect-pdf', title: 'Protect PDF', desc: 'Add a password before sending it on' },
  ],
  'merge-pdf': [
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark the combined file' },
    { slug: 'rotate-pdf', title: 'Rotate PDF', desc: 'Fix any sideways pages' },
    { slug: 'document-translator', title: 'Document Translator', desc: 'Translate the combined document' },
  ],
  'rotate-pdf': [
    { slug: 'remove-pdf-pages', title: 'Remove Pages', desc: 'Drop anything you don’t need' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document' },
  ],
  'remove-pdf-pages': [
    { slug: 'rotate-pdf', title: 'Rotate PDF', desc: 'Fix any sideways pages' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document' },
  ],
  'extract-pdf-pages': [
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark the extracted pages' },
  ],
  'pdf-overlay': [
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT' },
  ],
  'images-to-pdf': [
    { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Black out or correct anything' },
    { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Add your signature' },
  ],
};

export function getToolSuggestions(toolSlug) {
  return SUGGESTIONS[toolSlug] || [];
}
