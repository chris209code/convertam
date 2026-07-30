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
    { slug: 'sign-documents', title: 'Sign Documents', desc: 'Add your signature to the document', icon: '✒️' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT', icon: '💧' },
  ],
  'sign-documents': [
    { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Black out or correct anything else', icon: '⬛' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
    { slug: 'document-translator', title: 'Document Translator', desc: 'Send a translated copy to someone else', icon: '🌐' },
  ],
  'write-on-pdf': [
    { slug: 'sign-documents', title: 'Sign Documents', desc: 'Add your signature next', icon: '✒️' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT', icon: '💧' },
  ],
  'fill-pdf': [
    { slug: 'sign-documents', title: 'Sign Documents', desc: 'Sign the form you just filled', icon: '✒️' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it before sending', icon: '💧' },
  ],
  'watermark-pdf': [
    { slug: 'sign-documents', title: 'Sign Documents', desc: 'Add your signature', icon: '✒️' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
  ],
  'document-translator': [
    { slug: 'pdf-to-word', title: 'PDF to Word', desc: 'Make the translation editable in Word', icon: '📝' },
    { slug: 'ocr-pdf', title: 'OCR PDF', desc: 'Extract the translated text as searchable text', icon: '🔍' },
    { slug: 'compress-pdf', title: 'Compress PDF', desc: 'Shrink the file size before sending it on', icon: '🗜️' },
    { slug: 'sign-documents', title: 'Sign Documents', desc: 'Add your signature to the translation', icon: '✒️' },
    { slug: 'protect-pdf', title: 'Protect PDF', desc: 'Add a password before sending it on', icon: '🔒' },
  ],
  'merge-pdf': [
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark the combined file', icon: '💧' },
    { slug: 'rotate-pdf', title: 'Rotate PDF', desc: 'Fix any sideways pages', icon: '🔄' },
    { slug: 'document-translator', title: 'Document Translator', desc: 'Translate the combined document', icon: '🌐' },
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
    { slug: 'sign-documents', title: 'Sign Documents', desc: 'Add your signature', icon: '✒️' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT', icon: '💧' },
  ],
  'crop-pdf': [
    { slug: 'rotate-pdf', title: 'Rotate PDF', desc: 'Fix any sideways pages', icon: '🔄' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
    { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Mark it CONFIDENTIAL or DRAFT', icon: '💧' },
  ],
  'unlock-pdf': [
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine with another document', icon: '🔗' },
    { slug: 'sign-documents', title: 'Sign Documents', desc: 'Add your signature now that it\'s unlocked', icon: '✒️' },
    { slug: 'protect-pdf', title: 'Protect PDF', desc: 'Set a new password before sending it on', icon: '🔒' },
  ],
  'images-to-pdf': [
    { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Black out or correct anything', icon: '⬛' },
    { slug: 'sign-documents', title: 'Sign Documents', desc: 'Add your signature', icon: '✒️' },
  ],
  'cv-improver': [
    { slug: 'pdf-to-word', title: 'PDF to Word', desc: 'Make your improved CV editable in Word', icon: '📝' },
    { slug: 'compress-pdf', title: 'Compress PDF', desc: 'Shrink the file size before sending it', icon: '🗜️' },
    { slug: 'ocr-pdf', title: 'OCR PDF', desc: 'Extract the CV text as searchable text', icon: '🔍' },
    { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine your CV with a cover letter or portfolio', icon: '🔗' },
  ],
};

export function getToolSuggestions(toolSlug) {
  return SUGGESTIONS[toolSlug] || [];
}
