// Compact, search-intent-focused content shown below a tool's workspace —
// distinct from lib/toolGuides.js (which covers "how to use this tool" in
// depth). This file answers the questions someone typing "merge pdf online"
// or "compress pdf for free" into Google actually has, plus a few quick
// scan-facts (formats, best-for, common uses). Only tools with an entry here
// render the ToolExtrasSection block — every other tool renders exactly as
// it did before. Batch 1: the highest-traffic PDF tools. Batch 2: the
// remaining Document Conversion, PDF Utilities, and PDF Editor tools.
//
// From Batch 3 onward: every field here is checked against that tool's
// lib/toolGuides.js entry (what/whenToUse/tips/mistakes/quickFaqs/fullFaqs)
// before being written, and dropped if it would just restate that content
// in different words. `bestFor` is retired as a field from Batch 3 on —
// in practice it kept converging on the same ground as the guide's
// `whenToUse`. A tool entry below may have fewer fields, or a shorter
// questionsPeopleAsk list, than the Batch 1/2 shape — that's intentional:
// a short, non-redundant entry beats a padded one.

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

  // ---------------------------------------------------------------------
  // Batch 2 — remaining Document Conversion, PDF Utilities, PDF Editor
  // ---------------------------------------------------------------------

  'pdf-to-excel': {
    supportedFormats: 'PDF in, Excel (.xlsx) out.',
    bestFor: 'Pulling numbers trapped inside a PDF — bank statements, financial reports, price lists — into a real, editable spreadsheet.',
    commonUses: [
      'Turning a bank statement PDF into a spreadsheet for budgeting',
      'Extracting a price list or inventory table from a supplier PDF',
      'Pulling financial report tables into Excel for further analysis',
      'Converting a scanned invoice’s line items into editable rows (after OCR)',
    ],
    proTip: 'PDFs with visible grid lines and ruled table borders extract the most accurately — a loosely spaced, unruled table is harder for any extractor to map into clean rows and columns.',
    questionsPeopleAsk: [
      { q: 'Can I convert a PDF table to Excel for free?', a: 'PDF to Excel is a low-cost paid conversion (from ₦500 / about $1), since it uses a dedicated table-extraction engine rather than running in your browser.' },
      { q: "Why didn't my scanned PDF's tables convert?", a: "A scan is an image, not real text, so there's nothing for the tool to detect as a table. Run it through OCR PDF first, then convert the result." },
      { q: 'Will formulas or calculations be included?', a: "No — only the table's raw values convert to cells; any calculations need to be rebuilt in Excel using those values." },
    ],
  },

  'excel-to-pdf': {
    supportedFormats: 'Excel (.xls, .xlsx) in, PDF out.',
    bestFor: 'Sharing or printing a finished spreadsheet without the recipient needing Excel, or risking them editing your numbers.',
    commonUses: [
      'Sending a finished budget or financial report that shouldn’t be edited',
      'Printing a price list or invoice built in Excel',
      'Submitting a spreadsheet through a portal that requires PDF',
      'Archiving a snapshot of a spreadsheet at a point in time',
    ],
    proTip: 'Set your print area in Excel (File → Print Area) before converting — the PDF follows whatever print layout the spreadsheet already has, so fixing it in Excel first saves a re-convert.',
    questionsPeopleAsk: [
      { q: 'How do I convert an Excel file to PDF without Excel installed?', a: "Upload your .xls or .xlsx file to Excel to PDF — Convertam handles the conversion, so you don't need Excel or a Microsoft 365 subscription." },
      { q: 'Will all my sheets be included?', a: 'Yes, every sheet in the workbook converts and appears in the output PDF.' },
      { q: 'Can I convert just one sheet instead of the whole workbook?', a: "Not directly — all sheets convert together. Move the sheets you don't want into a separate workbook first if you only need one." },
    ],
  },

  'pdf-to-powerpoint': {
    supportedFormats: 'PDF in, PowerPoint (.pptx) out.',
    bestFor: 'Editing a presentation that was shared or exported as a PDF, when you need the actual slide content back.',
    commonUses: [
      'Getting an editable copy of a deck a colleague only sent as a PDF',
      'Reusing slide content from an old presentation exported to PDF',
      'Updating an outdated slide deck that only survives as a PDF',
      'Pulling slide visuals into a new presentation project',
    ],
    proTip: 'This works best on PDFs that started life as slides — a one-page-per-slide report will convert, but expect to redesign it rather than get a ready-made deck.',
    questionsPeopleAsk: [
      { q: 'Can I edit the text after converting PDF to PowerPoint?', a: "Yes, if the source PDF has real text — it converts to editable text boxes on the slide. Scanned PDFs convert as images instead, since there's no text to extract." },
      { q: 'Is there a free way to convert PDF to PowerPoint?', a: 'PDF to PowerPoint is a low-cost paid conversion (from ₦500 / about $1) because it uses a dedicated conversion engine — no subscription, no login required.' },
      { q: 'Will my slide design be preserved?', a: 'The visual layout of each page carries over closely, though very complex designs may need minor manual adjustment once opened in PowerPoint.' },
    ],
  },

  'powerpoint-to-pdf': {
    supportedFormats: 'PowerPoint (.ppt, .pptx) in, PDF out.',
    bestFor: 'Sending a finished presentation as a fixed file that displays the same on any device, without needing PowerPoint installed.',
    commonUses: [
      'Sending a final pitch deck that shouldn’t be edited by the recipient',
      'Printing handouts from a slide presentation',
      'Submitting a presentation through a portal that requires PDF',
      'Archiving a locked copy of a deck before further edits',
    ],
    proTip: 'If your deck relies on embedded video or animation to make its point, remember a PDF is static — those elements freeze at their final resting state, so add a text summary of anything animation-dependent.',
    questionsPeopleAsk: [
      { q: 'Do slide animations carry over to the PDF?', a: 'No — a PDF is a static document, so every slide appears in its final resting state without any animation or transition.' },
      { q: 'Are my speaker notes included?', a: 'No, only the visible slide content converts; export speaker notes separately from PowerPoint if you need them.' },
      { q: 'Is there a free way to convert PowerPoint to PDF?', a: 'PowerPoint to PDF is a low-cost paid conversion (from ₦500 / about $1), since it uses a dedicated conversion engine — no subscription required.' },
    ],
  },

  'html-to-pdf': {
    supportedFormats: 'HTML code (pasted in) → PDF out.',
    bestFor: 'Developers and marketers turning raw HTML — an email template, a CMS export, generated markup — into a fixed, shareable PDF.',
    commonUses: [
      'Turning an HTML email template into a PDF for approval or archiving',
      'Converting a generated report snippet into a shareable PDF',
      'Producing a PDF from a CMS-exported page fragment',
      'Archiving a static snapshot of dynamically generated HTML',
    ],
    proTip: 'Keep your CSS inline or in a single style block within the pasted markup — externally hosted stylesheets may not load at render time, resulting in an unstyled PDF.',
    questionsPeopleAsk: [
      { q: 'Can I convert a full webpage URL to PDF?', a: "HTML to PDF works from pasted HTML code, not a live URL — copy the page's HTML source and paste it in to render a PDF from that markup." },
      { q: 'Is HTML to PDF free?', a: 'Yes, completely free with no login required.' },
      { q: 'Will interactive elements like forms or buttons work in the PDF?', a: 'No — the output is a static render of the markup at the moment of conversion, not a live, interactive page.' },
    ],
  },

  'rotate-pdf': {
    supportedFormats: 'PDF only.',
    bestFor: 'Fixing a document that was scanned sideways or upside down, page after page.',
    commonUses: [
      'Correcting a stack of scanned pages saved sideways',
      'Fixing a PDF exported from a scanner in the wrong orientation',
      'Straightening a document before printing or sharing',
      'Preparing a rotated document for merging with correctly oriented files',
    ],
    proTip: 'Rotation applies to the entire document at once — if only some pages are sideways, split the PDF first, rotate just the affected pages, then merge everything back together.',
    questionsPeopleAsk: [
      { q: 'How do I rotate just one page in a PDF, not the whole document?', a: 'Rotate PDF applies one rotation to every page. For a single page, use Split PDF to pull it out, rotate that file, then Merge PDF to put the document back together.' },
      { q: 'Is rotating a PDF free?', a: 'Yes, completely free with no login required.' },
      { q: "Will rotating affect the PDF's quality?", a: 'No — pages are rotated as-is, with no re-rendering or compression involved.' },
    ],
  },

  'extract-pdf-pages': {
    supportedFormats: 'PDF only.',
    bestFor: 'Pulling a specific handful of pages — a chapter, a section, a range — out of a longer document into a smaller new PDF.',
    commonUses: [
      'Pulling a relevant chapter out of a long report to share on its own',
      'Extracting a specific date range of pages from a scanned ledger',
      'Creating a shorter version of a document containing only key pages',
      'Preparing a subset of pages to send when the full file is too large or irrelevant',
    ],
    proTip: 'Combine ranges and individual pages in one entry — "1,3,5-8" pulls exactly those pages in that order, so you rarely need more than one pass.',
    questionsPeopleAsk: [
      { q: "What's the difference between Extract PDF Pages and Split PDF?", a: 'Extract keeps your chosen pages together as one new file; Split breaks every page of the source into its own separate file.' },
      { q: 'Is extracting PDF pages free?', a: 'Yes, completely free with no login required.' },
      { q: 'Can I extract non-consecutive pages, like 2 and 9?', a: 'Yes — enter them comma-separated (e.g. "2,9") and both pages will be pulled into the resulting PDF, in that order.' },
    ],
  },

  'remove-pdf-pages': {
    supportedFormats: 'PDF only.',
    bestFor: 'Dropping a few unwanted pages — a blank scan, a duplicate, an outdated cover sheet — without rebuilding the whole document.',
    commonUses: [
      'Deleting a blank page left over from scanning',
      'Removing a duplicate or outdated page from a document',
      'Dropping a cover sheet or table of contents before sharing',
      'Cleaning up a scanned bundle before submitting it',
    ],
    proTip: 'If you actually want to keep a small handful of pages rather than remove a few, Extract PDF Pages by page number is often faster than clicking through and marking pages to delete.',
    questionsPeopleAsk: [
      { q: 'How do I delete a page from a PDF for free?', a: 'Upload your PDF to Remove PDF Pages, click the thumbnails you want gone (they highlight in red), and download the cleaned file — free, no login.' },
      { q: 'Can I remove every page in a document?', a: 'No — at least one page must remain in the final document.' },
      { q: 'Does this work on scanned PDFs?', a: 'Yes — since it works on whole page thumbnails rather than reading text, it works the same on scanned or digitally created PDFs.' },
    ],
  },

  'add-page-numbers': {
    supportedFormats: 'PDF only.',
    bestFor: 'Stamping page numbers onto a multi-page document before printing or distributing it — reports, contracts, manuals.',
    commonUses: [
      'Numbering pages on a contract before it’s printed for signing',
      'Adding "Page X of N" to a long report for easier navigation',
      'Continuing numbering on a document that follows on from another',
      'Preparing a manual or handbook for print with page references',
    ],
    proTip: 'Use the "Page X of N" format on longer documents — it tells readers how far through they are, which plain numbers alone don’t convey.',
    questionsPeopleAsk: [
      { q: 'How do I add page numbers to a PDF for free?', a: 'Add Page Numbers is free with no login — upload your file, choose position, size, and format, then download.' },
      { q: 'Can I start numbering from a number other than 1?', a: 'Yes — set any starting number from 1 to 9999, useful when a document continues from another one.' },
      { q: 'Can I choose where the page number appears?', a: 'Yes, choose from 6 positions (corners, center, top or bottom) and adjust the font size to fit.' },
    ],
  },

  'fill-pdf': {
    supportedFormats: 'PDF only (must contain real fillable form fields).',
    bestFor: 'Completing a genuine digital PDF form — government forms, job applications, bank forms — that already has built-in fields.',
    commonUses: [
      'Filling out a government or tax form distributed as a fillable PDF',
      'Completing a job application form with built-in fields',
      'Filling in a bank or loan application PDF',
      'Completing a digital intake or registration form',
    ],
    proTip: 'If the tool reports no fields were found, your PDF likely only has printed lines rather than real interactive fields — Write on PDF works on any PDF, including that kind.',
    questionsPeopleAsk: [
      { q: 'How do I know if my PDF has fillable fields?', a: "Upload it to Fill PDF Forms — if it doesn't have real interactive fields, you'll get a clear message directing you to Write on PDF instead, which works on any PDF." },
      { q: 'Is Fill PDF Forms free?', a: 'Yes, completely free with no login required.' },
      { q: 'Can I go back and edit my answers after downloading?', a: 'No — your answers are flattened into the PDF once downloaded, becoming a permanent part of the document.' },
    ],
  },

  'reorder-pdf': {
    supportedFormats: 'PDF only.',
    bestFor: 'Fixing a document whose pages are in the wrong order — a scan fed in wrong, or a document needing restructuring — without adding or removing pages.',
    commonUses: [
      'Fixing the page order of a scanned stack fed into the scanner out of sequence',
      'Moving an appendix or table of contents to the correct position',
      'Rearranging a document’s sections before sending it on',
      'Reordering slides-as-pages before combining with another file',
    ],
    proTip: "If you only need to fix a couple of pages rather than the whole sequence, drag just those into place — there's no need to plan the entire new order before you start.",
    questionsPeopleAsk: [
      { q: 'How do I rearrange PDF pages for free?', a: 'Upload your PDF to Reorder PDF Pages, drag the thumbnails into the order you want, and download — free, no login required.' },
      { q: 'Does reordering pages affect quality?', a: 'No — pages are rearranged as-is, with no re-rendering or compression.' },
      { q: 'Can I remove a page while reordering?', a: 'Not in this tool — Reorder PDF Pages only changes page order. Use Remove PDF Pages first if you also need to delete something.' },
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

  // ---------------------------------------------------------------------
  // Batch 3 — Image tools and PDF↔image tools (no-duplicate rule applied:
  // see the file header note above)
  // ---------------------------------------------------------------------

  'jpg-to-pdf': {
    supportedFormats: 'JPG images in, PDF out (one page per image).',
    commonUses: [
      'Submitting a set of photographed receipts for an expense report',
      'Turning phone photos of a signed contract into one PDF to email',
      'Combining photographed ID documents into a single PDF for an application',
      'Creating a simple PDF portfolio from JPG photography samples',
    ],
    questionsPeopleAsk: [
      { q: 'How do I convert multiple JPG photos into one PDF for free?', a: 'Upload your JPGs in the order you want them to appear, click convert, and download — completely free, no login, no limit on how many you combine.' },
      { q: 'Can I turn photos from my phone directly into a PDF?', a: "Yes, upload photos straight from your phone's gallery or camera roll — JPG to PDF works the same in a mobile browser as on desktop." },
      { q: 'Will converting JPG to PDF reduce image quality?', a: 'No, each photo is placed into the PDF at its original resolution, with no recompression.' },
    ],
  },

  'png-to-pdf': {
    supportedFormats: 'PNG images in, PDF out (one page per image).',
    commonUses: [
      'Combining screenshots into one PDF for a bug report or documentation',
      'Turning a set of diagram exports into a single shareable PDF',
      'Creating a PDF handout from PNG infographics or slides',
      'Bundling app UI screenshots into one file for feedback',
    ],
    questionsPeopleAsk: [
      { q: 'How do I combine PNG screenshots into a PDF for free?', a: 'Upload your PNGs to PNG to PDF in the order you want, then download — free, unlimited, no login required.' },
      { q: 'Can I convert a screenshot to PDF on my phone?', a: "Yes, upload directly from your phone's photo library; PNG to PDF works the same in any mobile browser." },
      { q: 'Will image quality stay the same after converting?', a: 'Yes, PNG to PDF places each image at full resolution with no compression, since PNG is already a lossless format.' },
    ],
  },

  'pdf-to-jpg': {
    supportedFormats: 'PDF in, JPG out (one image per page).',
    commonUses: [
      'Pulling a slide out of a PDF deck to post on social media',
      'Turning a PDF certificate or ID page into an image for an online form upload',
      'Creating thumbnail previews of a PDF\'s pages for a gallery or CMS',
      'Sharing a single page of a report as an image in a chat app',
    ],
    proTip: "If you're posting to social media, note each image is generated at the PDF page's full resolution — resize it afterward with Image Resizer & Cropper if the platform has a specific pixel requirement.",
    questionsPeopleAsk: [
      { q: 'How do I convert a PDF page to a JPG image for free?', a: 'Upload your PDF to PDF to JPG and download — every page converts to a JPG automatically, free with no login.' },
      { q: 'Can I convert a PDF to JPG on my phone?', a: 'Yes, PDF to JPG works in any mobile browser — upload your PDF and download the resulting images directly to your phone.' },
      { q: 'Do I need Adobe Acrobat to convert PDF to JPG?', a: 'No, Convertam converts directly in your browser — no Adobe software or account needed.' },
    ],
  },

  'pdf-to-png': {
    supportedFormats: 'PDF in, PNG out (one image per page).',
    commonUses: [
      'Creating transparent-background graphics from a PDF logo or diagram',
      'Extracting high-quality lossless images from a PDF for print',
      'Turning a PDF whiteboard export into individual slide images',
      'Pulling a diagram out of a PDF report for reuse in a presentation',
    ],
    proTip: "If you plan to compress the resulting PNGs afterward, note that Image Compressor's quality slider has limited effect on PNG — converting to JPG or WebP there usually shrinks files more.",
    questionsPeopleAsk: [
      { q: 'How do I convert a PDF to PNG images for free?', a: 'Upload your PDF to PDF to Images (PNG) and download — every page converts automatically, free with no login.' },
      { q: 'Can I convert a PDF to PNG on my phone?', a: 'Yes, it works in any mobile browser — upload your PDF and download the resulting PNGs directly to your phone.' },
      { q: 'Will my PDF page have a transparent background after converting to PNG?', a: "No — a PDF page renders as a solid image, so the background stays whatever color it was on the page (usually white); PNG format enables transparency but doesn't add it retroactively to already-opaque content." },
    ],
  },

  'images-to-pdf': {
    supportedFormats: 'JPG, PNG, WebP in — mixed formats allowed — PDF out.',
    commonUses: [
      'Building a single PDF from a mix of screenshots and photos for a report',
      'Creating a simple photo album PDF from event or vacation pictures',
      'Combining scanned pages saved in different image formats into one document',
      'Assembling a visual portfolio from JPG and PNG samples into one file',
    ],
    questionsPeopleAsk: [
      { q: 'Can I make a photo album PDF from multiple pictures?', a: 'Yes, upload your photos in the order you want them to appear, choose page sizing, and download a single combined PDF — ideal for a simple photo album or picture book.' },
      { q: 'Is there a limit to how many images I can combine?', a: 'No fixed limit on image count — since everything processes in your browser, very large batches may just take a little longer to generate.' },
      { q: 'Do I need to resize my images before combining them into a PDF?', a: 'No — Images to PDF handles that for you: "Match each image" keeps each photo\'s own size, while "Standard A4" fits every image onto a uniform page automatically.' },
    ],
  },

  'extract-pdf-images': {
    supportedFormats: 'PDF in, PNG images out (one file per embedded image, or ZIP).',
    commonUses: [
      "Recovering original product photos embedded in a supplier's PDF catalog",
      'Pulling a chart or graph image out of a report PDF for reuse',
      'Extracting a logo or diagram from a PDF brochure without screenshotting',
      'Getting the original photos back from a PDF that was built from separate images',
    ],
    questionsPeopleAsk: [
      { q: 'How do I get the original images out of a PDF for free?', a: 'Upload your PDF to Extract PDF Images — every embedded picture is found automatically, free with no login, downloadable individually or as a ZIP.' },
      { q: 'Can I extract images from a PDF without Adobe Acrobat?', a: 'Yes, Extract PDF Images works directly in your browser — no Adobe software, account, or login required.' },
    ],
  },

  'compare-pdf': {
    supportedFormats: 'Two PDFs in (original + revised) — text comparison only.',
    commonUses: [
      'Checking what changed in a contract before signing a new draft',
      'Reviewing edits between two versions of a policy document',
      'Spotting wording changes between drafts of an agreement sent back and forth',
      'Verifying a report matches an earlier approved version before publishing',
    ],
    proTip: 'For documents that go through several rounds of edits, compare against the most recently approved version rather than the original draft — comparing against an outdated baseline surfaces changes that were already accepted.',
    questionsPeopleAsk: [
      { q: 'How do I compare two PDF documents for changes online?', a: 'Upload both versions to Compare PDFs — changed words and phrases are highlighted inline so you can see exactly what was added or removed, free with no login.' },
      { q: 'Can I compare a Word document and a PDF?', a: 'No — both files need to be PDFs; convert the Word document to PDF first with Word to PDF, then compare.' },
      { q: 'Does Compare PDFs work on a contract that already has visible tracked-change markup?', a: "It compares each file's final text content, so visible tracked-change markup already baked into a PDF is treated as ordinary text rather than being specially recognized." },
    ],
  },

  'pdf-overlay': {
    supportedFormats: 'Two PDFs in (base + overlay) — PDF out.',
    commonUses: [
      'Stamping a company letterhead onto a plain contract template',
      'Applying a consistent background design across every page of a report',
      'Branding a set of certificates with a template border or seal',
      'Adding a standard cover design to internal documents before distribution',
    ],
    proTip: "Design your overlay file at roughly the same aspect ratio as your base document — since it's centered and scaled to fit, a very differently-shaped overlay leaves more empty margin than a well-matched one.",
    questionsPeopleAsk: [
      { q: 'How do I add a letterhead to every page of a PDF?', a: 'Upload your plain document as the base and your letterhead as the overlay — PDF Overlay stamps it onto every page automatically, free with no login.' },
      { q: 'Can I overlay a logo image instead of a PDF?', a: 'Not directly — both the base and overlay need to be PDFs. Convert your logo image to PDF first with JPG to PDF or PNG to PDF, then use that as your overlay.' },
      { q: 'Does the overlay work on scanned PDFs?', a: 'Yes — since Overlay works with whole rendered pages rather than needing real text, it applies the same way to scanned or photographed PDFs as to digitally created ones.' },
    ],
  },

  'image-compressor': {
    supportedFormats: 'JPG, PNG, WebP in and out — batch supported.',
    commonUses: [
      'Shrinking product photos before uploading them to an online store',
      'Reducing image sizes for a faster-loading website',
      'Compressing a batch of event photos before sharing them online',
      'Getting photos under a file-size cap for an email attachment or form upload',
    ],
    proTip: 'Compress after resizing, not before — a smaller image (fewer pixels) compresses to a smaller file at the same quality setting than compressing a large image alone.',
    questionsPeopleAsk: [
      { q: 'How do I compress an image without losing much quality?', a: 'Use the quality slider and watch the live before/after size — you can usually find a setting well above the minimum that still looks sharp while cutting file size substantially.' },
      { q: 'Can I compress images on my phone?', a: "Yes, Image Compressor works in any mobile browser — upload photos from your phone's gallery and download the smaller versions directly." },
      { q: "What's the smallest file size I can get?", a: "There's no fixed minimum — the quality slider trades size against visual quality freely, down to 10%, though very low settings introduce visible compression artifacts." },
    ],
  },

  'resize-image': {
    supportedFormats: 'JPG, PNG in — download as JPEG or PNG.',
    commonUses: [
      'Resizing a profile photo to fit Instagram, LinkedIn, or WhatsApp exactly',
      'Creating a passport-size photo for a visa or ID application',
      'Cropping a banner image to the right dimensions for a website header',
      'Preparing a YouTube thumbnail at the correct pixel size',
    ],
    proTip: "If you're resizing for print rather than screen use, check the preset's pixel dimensions against your printer's required resolution — social platform presets are sized for screens, not necessarily for high-quality printing.",
    questionsPeopleAsk: [
      { q: 'What size should a LinkedIn profile photo be?', a: "Convertam's LinkedIn preset sizes your photo to LinkedIn's recommended profile picture dimensions automatically — just pick the preset and adjust the crop, no need to look up exact pixel sizes yourself." },
      { q: 'Do I need special software to resize a passport photo correctly?', a: 'No — use the built-in passport photo presets (Nigerian or US sizing) and Convertam applies the exact required pixel dimensions automatically.' },
    ],
  },

  'watermark-image': {
    supportedFormats: 'JPG, PNG, WebP in — download as PNG.',
    commonUses: [
      'Marking photography proofs with a studio name before sending them to clients',
      'Adding a "SAMPLE" watermark to preview images before a paid download',
      'Branding social media graphics with a logo before posting',
      'Protecting product photos from unauthorized reuse before listing them online',
    ],
    proTip: 'For product photos going on a marketplace, keep the watermark small and semi-transparent in a corner — listings sites that reject visibly watermarked photos will usually still accept a subtle one.',
    questionsPeopleAsk: [
      { q: 'Will a watermark stop someone from stealing my photos?', a: "It raises the effort required, especially with the tiled option (a single corner mark can be cropped out), but no watermark makes an image fully theft-proof — determined reuse is still possible with enough editing effort." },
      { q: 'Can I remove a watermark I added by mistake?', a: 'Not with this tool — watermarking permanently alters the downloaded image, so keep your original, unwatermarked file if you might need it again.' },
    ],
  },

  'convert-image-format': {
    supportedFormats: 'JPG, PNG, WebP — convert between any of the three, batch supported.',
    commonUses: [
      'Converting a PNG logo to WebP for a faster-loading website',
      "Turning a WebP image into JPG for software that doesn't support WebP yet",
      'Converting camera JPGs to PNG for lossless editing in design software',
      'Standardizing a batch of mixed-format images to one format before uploading',
    ],
    proTip: "Check whether your destination (a CMS, an ad platform, an older device) actually supports WebP before converting everything to it — it's the smallest of the three formats, but a few older systems still don't recognize it.",
    questionsPeopleAsk: [
      { q: 'How do I convert WebP to JPG or PNG?', a: 'Upload your WebP file, choose JPG or PNG as the output format, and download — Convert Image Format handles WebP in both directions.' },
      { q: 'Can I convert an image format without installing software?', a: 'Yes, Convert Image Format works entirely in your browser — no software install, account, or login required.' },
    ],
  },

  'meme-generator': {
    supportedFormats: 'Any image in — download as PNG.',
    commonUses: [
      'Making a quick reaction meme from a screenshot for a group chat',
      'Adding classic top/bottom captions to a photo for social media',
      'Creating a meme from a moment in a video call screenshot',
      'Turning a funny photo into a shareable meme in seconds',
    ],
    proTip: 'Use a high-contrast image behind your captions — the white text with black outline stays readable on most backgrounds, but a very busy or light image can still make it harder to read at a glance.',
    questionsPeopleAsk: [
      { q: 'How do I make a meme without downloading an app?', a: 'Upload your image, type your top and bottom text, and download — Meme Generator works entirely in your browser, nothing to install.' },
      { q: 'Can I use my own photo to make a meme?', a: "Yes — upload any photo or image you have; it's not limited to pre-made meme templates." },
    ],
  },

  'document-enhancer': {
    supportedFormats: 'Photo (JPG/PNG) in — download as PNG, up to 1800px on the longest side.',
    commonUses: [
      'Cleaning up a phone photo of a receipt before expense reporting',
      'Making a photographed contract page look like a proper scan before emailing',
      'Fixing uneven lighting on a photographed ID document before an upload form',
      'Preparing a photographed whiteboard or notes page for sharing',
    ],
    proTip: 'Use Sharpen conservatively on documents with small print — pushed too high, it can introduce noise around text edges instead of making the text more legible.',
    questionsPeopleAsk: [
      { q: 'How do I make a phone photo look like a scanned document?', a: 'Upload the photo to Document Enhancer, crop to the page, straighten it, reduce shadows, and pick a mode (Color, Grayscale, or Black & White) — or just click Auto-Enhance for a one-click starting point.' },
      { q: 'Can I use this on an old paper document, not just a phone photo?', a: 'Yes — upload a photo of any paper document, old or new; the same crop, straighten, and lighting tools apply regardless of the document\'s age or condition.' },
    ],
  },
};
