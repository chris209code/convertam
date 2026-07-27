// Smart Workflows is a thin recommendation/orchestration layer on top of
// EXISTING systems — Career Session (lib/careerSession.js) and the Document
// Workspace session already carry data between compatible tools without a
// re-upload. This catalogue only sequences which real tools to visit and in
// what order; it never re-implements what a tool already does.
//
// A step is one of:
//   { toolSlug, label?, reason, optional?, estimatedMinutes? }
//   { options: [{ toolSlug, label }], reason, optional?, estimatedMinutes? }  — user picks one
//   { href, label, reason, optional? }                                       — links to a hub/panel, not a tools-config tool
//   { info: true, label }                                                     — a milestone note, not a navigable step
export const WORKFLOWS = [
  {
    id: 'apply-for-job',
    title: 'Apply for a Job',
    description: 'Import the job posting, prepare your CV and cover letter, and put together your application.',
    goalKeywords: ['apply for a job', 'job application', 'apply to a job', 'job posting', 'new job', 'career application'],
    steps: [
      { href: '/career-studio', label: 'Import Job Posting', reason: 'Paste the job URL or description once — every tool below reuses it automatically.', estimatedMinutes: 2 },
      { options: [{ toolSlug: 'resume-builder', label: 'Start from scratch' }, { toolSlug: 'cv-improver', label: 'Improve an existing CV' }], label: 'Build or Improve Your CV', reason: 'Tailor it to the imported job automatically — no need to re-enter the role or company.', estimatedMinutes: 8 },
      { toolSlug: 'cover-letter', label: 'Generate Cover Letter', reason: 'Written from your CV and the imported job description.', estimatedMinutes: 3 },
      { options: [{ toolSlug: 'merge-pdf', label: 'Merge into one file' }, { toolSlug: 'sign-documents', label: 'Sign a document' }], label: 'Combine or Sign Application Documents', reason: 'Merge your CV, cover letter and any forms, or add a signature.', optional: true, estimatedMinutes: 3 },
    ],
  },
  {
    id: 'prepare-business-document',
    title: 'Prepare a Business Document',
    description: 'Create an invoice, quotation, delivery note or waybill, then sign and share it.',
    goalKeywords: ['business document', 'create an invoice', 'invoice', 'quotation', 'delivery note', 'waybill', 'prepare a business document'],
    steps: [
      { toolSlug: 'business-document-studio', label: 'Create the Document', reason: 'One workspace for invoices, quotations, delivery notes and waybills.', estimatedMinutes: 6 },
      { toolSlug: 'sign-documents', label: 'Sign It', reason: 'Add your signature before sending it out.', optional: true, estimatedMinutes: 2 },
      { toolSlug: 'compress-pdf', label: 'Compress the PDF', reason: 'Keep the file small enough to email easily.', optional: true, estimatedMinutes: 1 },
      { toolSlug: 'screenshot-studio', label: 'Create a Marketing Image', reason: 'Turn the finished document into a social post announcing it.', optional: true, estimatedMinutes: 2 },
    ],
  },
  {
    id: 'contract-review-approval',
    title: 'Compare and Approve a Contract',
    description: 'See what changed between two versions, make any final edits, and sign off.',
    goalKeywords: ['approve a contract', 'compare and approve', 'review a contract', 'contract approval', 'redline'],
    steps: [
      { toolSlug: 'compare-pdf', label: 'Compare the Versions', reason: 'See exactly what was added, removed, or changed.', estimatedMinutes: 4 },
      { toolSlug: 'redact-pdf', label: 'Make Final Edits', reason: 'Redact sensitive text or correct a mistake before signing.', optional: true, estimatedMinutes: 4 },
      { toolSlug: 'sign-documents', label: 'Sign the Contract', reason: 'Add your signature to the approved version.', estimatedMinutes: 2 },
      { toolSlug: 'protect-pdf', label: 'Password-Protect It', reason: 'Restrict who can open the signed contract.', optional: true, estimatedMinutes: 1 },
      { info: true, label: 'Download your finished, signed contract.' },
    ],
  },
  {
    id: 'sign-submit-contract',
    title: 'Sign and Submit a Contract',
    description: 'Add your signature to a contract, lock it down, and send it off.',
    goalKeywords: ['sign a contract', 'sign and submit a contract', 'submit a contract', 'sign an agreement'],
    steps: [
      { toolSlug: 'sign-documents', label: 'Sign the Contract', reason: 'Upload the contract and place your signature.', estimatedMinutes: 3 },
      { toolSlug: 'protect-pdf', label: 'Password-Protect It', reason: 'Add a password before sending it to the other party.', optional: true, estimatedMinutes: 1 },
      { toolSlug: 'compress-pdf', label: 'Compress the PDF', reason: 'Make sure it fits under an email attachment limit.', optional: true, estimatedMinutes: 1 },
      { info: true, label: 'Download and send your signed contract.' },
    ],
  },
  {
    id: 'prepare-scanned-document',
    title: 'Prepare a Scanned Document',
    description: 'Clean up a phone photo of a document, extract the text, translate it if needed, and get it ready to sign or share.',
    goalKeywords: ['scanned document', 'scan a document', 'translate a scanned document', 'photo of a document', 'clean up a scan'],
    steps: [
      { toolSlug: 'document-enhancer', label: 'Clean Up the Scan', reason: 'Straighten, remove shadows, and sharpen an unclear phone photo.', optional: true, estimatedMinutes: 2 },
      { toolSlug: 'ocr-pdf', label: 'Extract the Text', reason: 'Make a scanned document searchable and copyable.', estimatedMinutes: 2 },
      { toolSlug: 'document-translator', label: 'Translate It', reason: 'Get an accurate translation with the layout preserved.', optional: true, estimatedMinutes: 3 },
      { toolSlug: 'pdf-to-word', label: 'Convert to Word', reason: 'Make it editable if you need to change the content.', optional: true, estimatedMinutes: 1 },
      { toolSlug: 'sign-documents', label: 'Sign It', reason: 'Add a signature once the document is ready.', optional: true, estimatedMinutes: 2 },
      { toolSlug: 'compress-pdf', label: 'Compress the PDF', reason: 'Shrink the file size for easy sharing.', estimatedMinutes: 1 },
    ],
  },
  {
    id: 'submit-assignment',
    title: 'Submit an Assignment',
    description: 'Get your document into the right format, combine any files, and keep it under the size limit.',
    goalKeywords: ['submit an assignment', 'submit my assignment', 'homework', 'coursework', 'submit a paper'],
    steps: [
      { options: [{ toolSlug: 'word-to-pdf', label: 'Word to PDF' }, { toolSlug: 'pdf-to-word', label: 'PDF to Word' }], label: 'Convert to the Required Format', reason: 'Most institutions ask for a PDF submission.', estimatedMinutes: 1 },
      { toolSlug: 'merge-pdf', label: 'Combine Files', reason: 'Merge a cover page or appendix with your main document.', optional: true, estimatedMinutes: 2 },
      { toolSlug: 'add-page-numbers', label: 'Add Page Numbers', reason: 'Many assignments require numbered pages.', optional: true, estimatedMinutes: 1 },
      { toolSlug: 'compress-pdf', label: 'Compress the PDF', reason: 'Stay under your school\'s upload size limit.', optional: true, estimatedMinutes: 1 },
    ],
  },
  {
    id: 'compare-versions',
    title: 'Compare Two Document Versions',
    description: 'See exactly what changed between two versions of a document.',
    goalKeywords: ['compare two document versions', 'compare documents', 'compare pdfs', 'what changed', 'diff two pdfs'],
    steps: [
      { toolSlug: 'compare-pdf', label: 'Compare the Documents', reason: 'View differences side by side, overlaid, or in a summary you can export.', estimatedMinutes: 3 },
      { info: true, label: 'Export a difference report if you need a written record (optional).' },
    ],
  },
];

export function getWorkflow(id) {
  return WORKFLOWS.find((w) => w.id === id) || null;
}

export function totalEstimatedMinutes(workflow, { includeOptional = true } = {}) {
  return workflow.steps
    .filter((s) => (includeOptional ? true : !s.optional))
    .reduce((sum, s) => sum + (s.estimatedMinutes || 0), 0);
}

// A step's navigable target(s) — used both for rendering a "Go" link and
// for matching the current page against the active workflow's step.
export function stepToolSlugs(step) {
  if (step.toolSlug) return [step.toolSlug];
  if (step.options) return step.options.map((o) => o.toolSlug);
  return [];
}
