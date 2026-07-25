// Compact, search-intent-focused content shown below a tool's workspace —
// distinct from lib/toolGuides.js (which covers "how to use this tool" in
// depth). This file answers the questions someone typing "merge pdf online"
// or "compress pdf for free" into Google actually has, plus a few quick
// scan-facts (formats, best-for, common uses). Only tools with an entry here
// render the ToolExtrasSection block — every other tool renders exactly as
// it did before. Batch 1: the highest-traffic PDF tools.

export const toolExtras = {
  'merge-pdf': {
    supportedFormats: 'PDF files only — any number of files, up to 100MB each.',
    bestFor: 'Combining scattered PDFs — a resume and cover letter, scanned pages, or several reports — into one file to send or print.',
    commonUses: [
      'Joining a cover letter and resume into one PDF for a job application',
      'Combining scanned receipts or forms saved as separate pages',
      'Bundling multiple reports or chapters into a single document',
      'Merging signed contract pages back into one file',
    ],
    proTip: 'Rename your files with numbers (01-cover.pdf, 02-resume.pdf) before uploading — since files merge in upload order, sequential names make it easy to pick them in the right sequence.',
    questionsPeopleAsk: [
      { q: 'How do I merge PDFs without Adobe?', a: 'Convertam merges PDFs directly in your browser — no Adobe subscription needed. Upload your files in order, click merge, and download the combined PDF for free.' },
      { q: 'Can I merge PDFs on my phone?', a: "Yes. Merge PDF works in any mobile browser — no app to install. Upload from your phone's file storage or a cloud drive link." },
      { q: 'Will merging PDFs reduce the quality?', a: 'No. Pages are combined exactly as they are, with no compression or re-rendering, so text and images stay at their original quality.' },
      { q: 'Is it safe to merge confidential documents online?', a: "Merge PDF processes your files entirely in your browser — they're never uploaded to a server, so confidential documents never leave your device." },
    ],
  },

  'split-pdf': {
    supportedFormats: 'PDF only, up to 100MB.',
    bestFor: 'Breaking one PDF that contains several separate documents into individual, single-page files.',
    commonUses: [
      'Separating a scanned bundle of forms into individual files',
      'Pulling one page out of a long report to share on its own',
      'Breaking a multi-invoice PDF into single invoices for filing',
      'Preparing individual pages to merge back in a different order later',
    ],
    proTip: "If you only need a few pages rather than every page separately, Extract PDF Pages saves you from downloading and sorting through a full zip file.",
    questionsPeopleAsk: [
      { q: 'How do I split a PDF into separate pages for free?', a: "Upload your PDF to Split PDF — no account or payment needed. Every page downloads as its own file, bundled in a zip if there's more than one." },
      { q: 'Can I split a PDF without downloading software?', a: 'Yes, Split PDF runs entirely in your browser. There’s nothing to install and no software to download.' },
      { q: 'Does splitting a PDF keep the original page order?', a: 'Yes. Each output file is numbered to match its position in the source document, so order is always preserved.' },
    ],
  },

  'compress-pdf': {
    supportedFormats: 'PDF only, up to 100MB.',
    bestFor: 'Shrinking a PDF that’s too large to email, upload to a form with a size cap, or is taking up unnecessary storage space.',
    commonUses: [
      'Shrinking a scanned document below an email attachment limit',
      'Reducing a photo-heavy report before uploading to a portal',
      'Making a PDF small enough for a job application upload limit',
      'Freeing up storage on a phone or cloud drive',
    ],
    proTip: "If the PDF is mostly photos, try the Web compression profile first — it gives the biggest size reduction and is usually still sharp enough for on-screen reading.",
    questionsPeopleAsk: [
      { q: 'Can I compress a PDF for free?', a: "Compress PDF costs a small per-file fee (from ₦500 / about $1), since it uses a dedicated compression engine rather than running in your browser. There's no subscription, and you see the price before you pay." },
      { q: 'How do I reduce PDF file size without losing quality?', a: 'Choose the Print compression profile — it trades off less size reduction for a smaller quality loss than Web or Max, which is the better choice for documents you’ll still print.' },
      { q: 'Why is my PDF still large after compressing?', a: "If the PDF is mostly text with few images, there's little to compress — text-based PDFs are usually already small. Compression works best on image-heavy or scanned files." },
    ],
  },

  'sign-documents': {
    supportedFormats: 'PDF and image documents you want to sign; your signature can be uploaded as a photo or drawn.',
    bestFor: 'Signing a contract, form, or agreement without printing it, signing by hand, and scanning it back in.',
    commonUses: [
      'Signing a rental agreement or employment contract sent as a PDF',
      'Adding a signature to a school or government form',
      'Countersigning a document sent by a client or employer',
      'Placing an initialed signature on multiple pages of an agreement',
    ],
    proTip: 'Photograph your signature on plain white paper in good light — a clean, high-contrast image places more crisply than a signature photographed on lined or shadowed paper.',
    questionsPeopleAsk: [
      { q: 'How do I sign a PDF online for free?', a: 'Upload your document to Sign Documents, upload or draw your signature, place it where needed, and download — no account, no cost.' },
      { q: 'Is an online signature legally valid?', a: 'In most jurisdictions, electronic signatures are legally recognized for everyday contracts and forms, though highly regulated documents may have specific requirements — check what applies to your document type.' },
      { q: 'Can I sign a document on my phone?', a: "Yes, Sign Documents works fully in a mobile browser — photograph your signature with your phone's camera and place it directly on the document." },
    ],
  },

  'protect-pdf': {
    supportedFormats: 'PDF only, up to 100MB.',
    bestFor: 'Sending a sensitive PDF — financial records, contracts, personal documents — that should only open with a password.',
    commonUses: [
      'Password-protecting a payslip or bank statement before emailing',
      'Restricting access to a contract before it’s countersigned',
      'Securing a document sent over an unencrypted channel',
      'Adding a password before uploading to shared cloud storage',
    ],
    proTip: 'Share the password through a different channel than the file itself (a text message rather than the same email), so a password doesn’t travel alongside the document it protects.',
    questionsPeopleAsk: [
      { q: 'How do I put a password on a PDF for free?', a: 'Protect PDF adds a password directly in your browser — upload the file, set a password, and download the locked version at no cost.' },
      { q: 'Can I remove a password from a PDF instead?', a: "Protect PDF is for adding a password. If you need to open a PDF that's already password-protected in order to edit it elsewhere, you'll need the existing password first." },
      { q: 'Is the password stored anywhere?', a: "No — the password is applied directly to the file in your browser and isn't saved or transmitted anywhere." },
    ],
  },

  'pdf-to-word': {
    supportedFormats: 'PDF in, Word (.docx) out.',
    bestFor: 'Editing the text of a PDF — updating an old contract, editing a resume, or reusing content from a report.',
    commonUses: [
      'Updating a contract or policy document originally sent as a PDF',
      'Editing an old resume that only exists as a PDF file',
      'Pulling paragraphs from a report into a new Word document',
      'Reformatting a PDF form into an editable template',
    ],
    proTip: 'If your PDF is a photo or scan rather than a digitally created file, run it through OCR PDF first — converting a scan directly to Word has no real text to work with.',
    questionsPeopleAsk: [
      { q: 'How do I convert a PDF to Word without losing formatting?', a: 'Text-based PDFs (created from Word, Google Docs, etc.) convert most reliably. Heavily designed, multi-column PDFs will need some manual cleanup after conversion, since Word and PDF handle layout differently.' },
      { q: 'Is there a free way to convert PDF to Word?', a: 'PDF to Word on Convertam is a low-cost paid conversion (from ₦500 / about $1) because it uses a dedicated conversion engine — there’s no subscription and no login required.' },
      { q: 'Can I convert a scanned PDF to an editable Word document?', a: 'Not directly — a scan is an image, not text. Run it through OCR PDF first to recognize the text, then convert the result to Word.' },
    ],
  },

  'word-to-pdf': {
    supportedFormats: 'Word (.doc, .docx) in, PDF out.',
    bestFor: 'Sending a Word document as a fixed, non-editable file that looks the same on any device.',
    commonUses: [
      'Sending a finished CV or cover letter that won’t shift formatting on the recipient’s computer',
      'Converting a report before submitting it through a portal that requires PDF',
      'Locking a contract’s formatting before signing',
      'Preparing a Word document for printing exactly as designed',
    ],
    proTip: 'Check your Word document’s formatting one last time before converting — fonts, spacing, and page breaks are locked in exactly as they appear once it becomes a PDF.',
    questionsPeopleAsk: [
      { q: 'How do I convert Word to PDF without Microsoft Word?', a: 'Upload your .doc or .docx file to Word to PDF — Convertam handles the conversion, so you don’t need Word installed or a Microsoft 365 subscription.' },
      { q: 'Will my fonts and layout stay the same?', a: 'Yes — standard fonts, spacing, and page layout carry over accurately, since PDF is designed to preserve a document’s exact visual layout.' },
      { q: 'Can I convert multiple Word documents to PDF at once?', a: 'Each conversion handles one document at a time; for multiple files, merge them into a single Word document first, or convert each separately and combine the PDFs with Merge PDF.' },
    ],
  },

  'write-on-pdf': {
    supportedFormats: 'PDF only.',
    bestFor: 'Filling in a printed-style form or scanned document that has no fillable fields.',
    commonUses: [
      'Filling out a scanned government or bank form',
      'Adding a note or comment directly onto a printed-style document',
      'Completing an application form that was distributed as a flat PDF',
      'Typing answers onto a worksheet or questionnaire scan',
    ],
    proTip: 'Zoom in before placing text on small form fields — precise placement is easier when you can see the underlying lines clearly.',
    questionsPeopleAsk: [
      { q: "How do I type on a PDF that isn't a fillable form?", a: 'Write on PDF lets you click anywhere on any PDF — including scans with no real form fields — and type text directly onto that spot.' },
      { q: 'Is this different from Fill PDF Forms?', a: 'Yes. Fill PDF Forms works with digital PDFs that already have built-in fillable fields; Write on PDF works on any PDF, including scanned or flat documents with no fields at all.' },
      { q: 'Can I edit the text after placing it?', a: 'Yes, placed text can be repositioned or edited before you download the final file.' },
    ],
  },

  'watermark-pdf': {
    supportedFormats: 'PDF only.',
    bestFor: 'Marking a document as DRAFT, CONFIDENTIAL, or attributing it to your name or business before sharing.',
    commonUses: [
      'Marking a draft contract before it’s finalized',
      'Stamping CONFIDENTIAL on internal documents before sending externally',
      'Branding a proposal or report with a company name across every page',
      'Discouraging unauthorized reuse of a shared PDF',
    ],
    proTip: 'A lower-opacity, diagonal watermark is legible without obscuring the underlying text — a full-opacity watermark straight across the page can make a document hard to read.',
    questionsPeopleAsk: [
      { q: 'How do I add a watermark to a PDF for free?', a: 'Watermark PDF is free with no login — upload your file, type the watermark text, adjust position and opacity, and download.' },
      { q: 'Can I add my company logo instead of text?', a: 'Watermark PDF currently supports custom text watermarks; for a logo, PDF Overlay can stamp an image (like a letterhead) across every page instead.' },
      { q: 'Does the watermark cover the original text?', a: 'You control the opacity and position, so you can keep it subtle enough not to obscure the document’s original content.' },
    ],
  },

  'redact-pdf': {
    supportedFormats: 'PDF only.',
    bestFor: 'Permanently removing sensitive information before sharing a document, or correcting a small mistake without retyping the whole page.',
    commonUses: [
      'Blacking out account numbers or personal details before sharing a document externally',
      'Redacting names or figures from a report before wider distribution',
      'Whiting out a typo and typing the correction directly on the page',
      'Removing a signature or stamp from an old document before reuse',
    ],
    proTip: 'Redaction here is permanent and removes the underlying content — double-check you’ve covered the right area before downloading, since it can’t be undone after export.',
    questionsPeopleAsk: [
      { q: 'Does redacting a PDF actually remove the text, or just cover it visually?', a: "Redact & Edit PDF permanently removes the covered content — it's not just a black box drawn on top, so the underlying text can't be recovered by copying or extracting the PDF's text." },
      { q: 'Can I fix a typo without retyping the whole document?', a: 'Yes — use the whiteout option to cover the mistake, then type the correction directly on the page in the same spot.' },
      { q: 'Is this safe for legal or financial documents with sensitive data?', a: 'Yes — it genuinely removes sensitive information (account numbers, names, figures) rather than just visually hiding it, which matters before sharing legal or financial documents externally.' },
    ],
  },

  'invoice-generator': {
    supportedFormats: 'Outputs a PDF invoice; no file upload needed — you fill in details directly on the page.',
    bestFor: 'Freelancers and small businesses who need a professional invoice quickly without design software or accounting subscriptions.',
    commonUses: [
      'Billing a client for freelance or contract work',
      'Sending a one-off invoice for a small business sale',
      'Issuing a professional invoice without an accounting software subscription',
      'Creating a quick invoice on the go from a phone',
    ],
    proTip: 'Keep your business details (name, logo, address) consistent across every invoice — it makes your business look more established and helps clients recognize your invoices at a glance.',
    questionsPeopleAsk: [
      { q: 'Is the invoice generator free?', a: 'Yes, Invoice Generator is completely free with no login required — fill in your details and download the PDF.' },
      { q: 'Can I add my logo to the invoice?', a: 'Yes, you can upload your business logo, which appears on the generated PDF alongside your business details.' },
      { q: 'Does Convertam store my invoice or client data?', a: "No — invoices are generated directly in your browser or deleted immediately after creation; nothing is saved on Convertam's servers." },
    ],
  },
};
