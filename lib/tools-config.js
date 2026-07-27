export const tools = [
  // ---------- Document Conversion ----------
  { slug: 'pdf-to-word', title: 'PDF to Word', category: 'Document Conversion', description: 'Turn a PDF into an editable Word document (.docx), formatting included.', mode: 'office', accept: 'application/pdf', toFormat: 'docx', toLabel: 'Word', workspaceGroup: ['export'] },
  { slug: 'word-to-pdf', title: 'Word to PDF', category: 'Document Conversion', description: 'Turn a Word document into a clean, shareable PDF.', mode: 'office', accept: '.doc,.docx', toFormat: 'pdf', toLabel: 'PDF' },
  { slug: 'pdf-to-excel', title: 'PDF to Excel', category: 'Document Conversion', description: 'Pull tables out of a PDF into an editable Excel spreadsheet (.xlsx).', mode: 'office', accept: 'application/pdf', toFormat: 'xlsx', toLabel: 'Excel', workspaceGroup: ['export'] },
  { slug: 'excel-to-pdf', title: 'Excel to PDF', category: 'Document Conversion', description: 'Turn a spreadsheet into a PDF that prints and shares cleanly.', mode: 'office', accept: '.xls,.xlsx', toFormat: 'pdf', toLabel: 'PDF' },
  { slug: 'pdf-to-powerpoint', title: 'PDF to PowerPoint', category: 'Document Conversion', description: 'Turn PDF pages into an editable PowerPoint presentation.', mode: 'office', accept: 'application/pdf', toFormat: 'pptx', toLabel: 'PowerPoint', workspaceGroup: ['export'] },
  { slug: 'powerpoint-to-pdf', title: 'PowerPoint to PDF', category: 'Document Conversion', description: 'Turn a presentation into a PDF ready to share or print.', mode: 'office', accept: '.ppt,.pptx', toFormat: 'pdf', toLabel: 'PDF' },
  { slug: 'html-to-pdf', title: 'HTML to PDF', category: 'Document Conversion', description: 'Paste HTML code and convert it to a downloadable PDF.', mode: 'html-to-pdf' },

  // ---------- PDF Utilities ----------
  { slug: 'merge-pdf', title: 'Merge PDF', category: 'PDF Utilities', description: 'Combine multiple PDFs into a single file, in the order you choose.', mode: 'pdf-lib', pdfLibMode: 'merge', workspaceGroup: ['organize'] },
  { slug: 'split-pdf', title: 'Split PDF', category: 'PDF Utilities', description: 'Break a PDF into individual pages, downloaded as a zip.', mode: 'pdf-lib', pdfLibMode: 'split', workspaceGroup: ['organize'] },
  { slug: 'compress-pdf', title: 'Compress PDF', category: 'PDF Utilities', description: "Shrink a PDF's file size for easier sharing.", mode: 'compress', workspaceGroup: ['optimize'] },
  { slug: 'rotate-pdf', title: 'Rotate PDF', category: 'PDF Utilities', description: 'Rotate every page in a PDF by 90°, 180°, or 270°.', mode: 'pdf-lib', pdfLibMode: 'rotate', workspaceGroup: ['organize'] },
  { slug: 'extract-pdf-pages', title: 'Extract PDF Pages', category: 'PDF Utilities', description: 'Pull specific pages out of a PDF into a new, smaller PDF.', mode: 'pdf-lib', pdfLibMode: 'extract', workspaceGroup: ['organize'] },
  { slug: 'remove-pdf-pages', title: 'Remove PDF Pages', category: 'PDF Utilities', description: 'Click pages to mark them for deletion, then download the cleaned PDF.', mode: 'remove-pages', workspaceGroup: ['organize'] },
  { slug: 'add-page-numbers', title: 'Add Page Numbers', category: 'PDF Utilities', description: 'Stamp page numbers onto every page — choose position, size, and format.', mode: 'add-page-numbers' },
  { slug: 'protect-pdf', title: 'Protect PDF', category: 'PDF Utilities', description: 'Add a password to your PDF so only the right people can open it.', mode: 'protect-pdf', workspaceGroup: ['security'] },

  // ---------- Image Tools ----------
  { slug: 'jpg-to-pdf', title: 'JPG to PDF', category: 'Image Tools', description: 'Combine one or more JPG photos into a single PDF.', mode: 'pdf-lib', pdfLibMode: 'image-to-pdf', accept: 'image/jpeg' },
  { slug: 'png-to-pdf', title: 'PNG to PDF', category: 'Image Tools', description: 'Combine one or more PNG images into a single PDF.', mode: 'pdf-lib', pdfLibMode: 'image-to-pdf', accept: 'image/png' },
  { slug: 'pdf-to-jpg', title: 'PDF to JPG', category: 'Image Tools', description: 'Turn each page of a PDF into a JPG image.', mode: 'pdf-to-image', imageFormat: 'jpeg' },
  { slug: 'pdf-to-png', title: 'PDF to Images', category: 'PDF Tools', description: 'Turn each page of a PDF into a PNG image.', mode: 'pdf-to-image', imageFormat: 'png', workspaceGroup: ['export'] },
  { slug: 'images-to-pdf', title: 'Images to PDF', category: 'PDF Tools', description: 'Combine multiple JPG or PNG images into one PDF, in any order.', mode: 'images-to-pdf', workspaceGroup: ['organize'] },
  { slug: 'extract-pdf-images', title: 'Extract PDF Images', category: 'PDF Tools', description: 'Pull the embedded images out of a PDF and download them individually or as a ZIP.', mode: 'extract-pdf-images' },
  { slug: 'redact-pdf', title: 'Redact & Edit PDF', category: 'PDF Tools', description: 'Permanently black out sensitive information, or whiteout a mistake and type the correction right on the page.', mode: 'redact-pdf', workspaceGroup: ['edit'] },
  { slug: 'pdf-overlay', title: 'PDF Overlay', category: 'PDF Tools', description: 'Stamp one PDF (like a letterhead or template) onto every page of another.', mode: 'pdf-overlay', workspaceGroup: ['organize'] },
  { slug: 'image-compressor', title: 'Image Compressor', category: 'Image Tools', description: 'Reduce image file size without losing quality — JPG, PNG, WebP, with batch support.', mode: 'image-compressor' },
  { slug: 'resize-image', title: 'Image Resizer & Cropper', category: 'Image Tools', description: 'Resize, crop and perfectly fit images for social media, profiles, banners and custom dimensions.', mode: 'resize-image' },
  { slug: 'watermark-image', title: 'Watermark Image', category: 'Image Tools', description: 'Add text or logo watermarks to images — opacity, rotation, position or tiled, with batch support.', mode: 'watermark-image' },
  { slug: 'convert-image-format', title: 'Image Format Converter', category: 'Image Tools', description: 'Convert between JPG, PNG, and WebP, with batch support.', mode: 'convert-image-format' },
  { slug: 'meme-generator', title: 'Meme Generator', category: 'Image Tools', description: 'Add classic bold top/bottom captions to any image.', mode: 'meme-generator' },
  { slug: 'document-enhancer', title: 'Document Enhancer', category: 'Image Tools', description: 'Clean up a photo of a document — crop, straighten, remove shadows, and sharpen for a proper scan look.', mode: 'document-enhancer' },

  // ---------- PDF Editor ----------
  { slug: 'write-on-pdf', title: 'Write on PDF', category: 'PDF Editor', description: 'Click anywhere on any PDF — scanned forms, bank forms, printed documents — and type text directly onto it.', mode: 'write-on-pdf', workspaceGroup: ['edit'] },
  { slug: 'fill-pdf', title: 'Fill PDF Forms', category: 'PDF Editor', description: 'Upload a digital PDF form with built-in fields, fill them in on screen, and download the completed document.', mode: 'fill', workspaceGroup: ['edit'] },
  { slug: 'reorder-pdf', title: 'Reorder PDF Pages', category: 'PDF Editor', description: 'Drag and drop PDF pages into any order, then download the rearranged file.', mode: 'reorder', workspaceGroup: ['organize'] },
  { slug: 'watermark-pdf', title: 'Watermark PDF', category: 'PDF Editor', description: 'Add custom text watermarks to every page of a PDF — CONFIDENTIAL, DRAFT, your name, anything.', mode: 'watermark', workspaceGroup: ['edit', 'security'] },
  { slug: 'invoice-generator', title: 'Invoice Generator', category: 'PDF Editor', description: 'Create a professional PDF invoice in seconds. Fill in your details, add items, download.', mode: 'invoice' },

  // ---------- Business Tools ----------
  // Business Document Studio is the flagship: one shared workspace for
  // Invoice, Quotation, Delivery Note, and Waybill. The three routes below
  // it are compatibility slugs — old links keep working, preselecting the
  // matching document type (see ToolPageClient.js) instead of breaking.
  { slug: 'business-document-studio', title: 'Business Document Studio', category: 'Business Tools', description: 'Create invoices, quotations, delivery notes and waybills from one professional workspace.', mode: 'business-document-studio' },
  { slug: 'quotation-generator', title: 'Quotation Generator', category: 'Business Tools', description: 'Create professional quotations and proforma invoices. Fill in your details, add items, download PDF.', mode: 'quotation' },
  { slug: 'id-card-generator', title: 'ID Card Generator', category: 'Business Tools', description: 'Design and print a professional ID card — front and back, photo included, ready to laminate.', mode: 'id-card-generator' },
  { slug: 'delivery-note-waybill', title: 'Delivery Note & Waybill Generator', category: 'Business Tools', description: 'Confirm what was delivered or document goods in transit — switch between Delivery Note and Waybill formats.', mode: 'delivery-note-waybill' },
  // Sign Documents and Compare Documents moved here from PDF Suite: signing
  // and comparing are things people do to a contract or agreement, not
  // things they do to a PDF specifically — the file being a PDF is
  // incidental. Slugs are unchanged (sign-documents already redirects from
  // the old /sign-pdf; compare-pdf keeps its existing indexed URL rather
  // than forcing an unnecessary redirect) so no inbound link or bookmark
  // breaks — only the category, title, and metadata moved.
  { slug: 'sign-documents', title: 'Sign Documents', category: 'Business Tools', metaTitle: 'Sign PDF, Word & Documents Online', description: 'Sign PDF, Word documents, and photos of printed pages securely online — upload or draw your signature, place it anywhere, and download. Free, no login required.', mode: 'sign', workspaceGroup: ['edit', 'security'] },
  { slug: 'compare-pdf', title: 'Compare Documents', category: 'Business Tools', metaTitle: 'Compare PDF, Word & Documents Online', description: 'Compare two versions of a PDF page by page — see added, removed and modified content side by side, overlaid, or in a difference summary you can export. Have Word or Excel files? Convert to PDF first, then compare.', mode: 'compare-pdf', workspaceGroup: ['organize'] },

  // ---------- Smart Converter (AI) ----------
  { slug: 'summarize-pdf', title: 'Summarize PDF', category: 'Smart Converter', description: 'Upload a PDF and let AI summarize it, extract key points, or simplify the language.', mode: 'summarize' },
  { slug: 'smart-converter', title: 'Smart AI Converter', category: 'Smart Converter', description: 'Photograph a document and get back a clean Word file or Excel table.', mode: 'smart' },
  { slug: 'receipt-scanner', title: 'Receipt & Invoice Scanner', category: 'Smart Converter', description: 'Photograph a receipt or invoice — AI extracts vendor, items, totals and exports to Excel.', mode: 'receipt' },
  { slug: 'ocr-pdf', title: 'OCR PDF', category: 'Smart Converter', description: 'Extract text from scanned PDFs and images using AI. Works on handwriting too.', mode: 'ocr-pdf', workspaceGroup: ['optimize'] },
  { slug: 'cv-improver', title: 'CV Improver', category: 'Career Studio', description: 'Paste or upload your CV and tell us the role you want — AI tailors it into a stronger, ATS-friendly, completely truthful CV.', mode: 'cv-improver' },
  { slug: 'qr-code-generator', title: 'QR Code Studio', category: 'Utilities', description: 'Create fully customizable QR codes — gradients, logos, custom shapes, and instant scan validation.', mode: 'qr-code-studio' },
  { slug: 'ask-solve-ai', title: 'Ask & Solve AI', category: 'Smart Converter', description: 'Scan, type or upload a question and get clear answers instantly — Math and General modes.', mode: 'ask-solve-ai' },
  { slug: 'document-translator', title: 'Document Translator', category: 'Smart Converter', description: 'Upload a PDF, Word, PowerPoint or text file — or paste text — and get an accurate, side-by-side translation with layout preserved.', mode: 'document-translator', accept: '.pdf,.doc,.docx,.ppt,.pptx,.txt', workspaceGroup: ['export'] },
  { slug: 'resume-builder', title: 'Resume Builder', category: 'Career Studio', description: 'A guided, AI-assisted CV builder — answer simple questions and AI helps you write strong, honest content, even if you don\'t know where to start.', mode: 'resume-builder' },
  { slug: 'cover-letter', title: 'Cover Letter Writer', category: 'Career Studio', description: 'Generate a tailored, professional cover letter with AI — from your background and the job description.', mode: 'cover-letter' },
  { slug: 'linkedin-optimizer', title: 'LinkedIn Optimizer', category: 'Career Studio', description: 'Paste your LinkedIn profile sections and target role — AI strengthens your headline, About, experience and skills with keyword optimization, never invented facts.', mode: 'linkedin-optimizer' },
  { slug: 'contract-summarizer', title: 'Contract Summarizer', category: 'Smart Converter', description: 'Upload a contract and AI highlights the key parties, terms, obligations, and anything worth reviewing closely.', mode: 'contract-summarizer' },
  { slug: 'presentation-generator', title: 'AI Presentation Generator', category: 'Smart Converter', description: 'Upload documents — PDF, Word, TXT, or photos — and AI turns them into a structured, editable PowerPoint presentation.', mode: 'presentation-generator' },
  { slug: 'data-analyst', title: 'AI Data Analyst', category: 'Smart Converter', description: 'Upload spreadsheets or a photo of a table and get automatic charts, insights, and an executive report.', mode: 'data-analyst' },

  // ---------- Calculators ----------
  // The hub itself (/calculator-hub) is a standalone category page — see
  // app/calculator-hub/page.js — not a tools-config-driven [tool] page.
  { slug: 'salary-calculator', title: 'Salary Calculator', category: 'Calculators', description: 'Calculate your take-home pay with a live breakdown of tax, pension, and other deductions — converted across every pay period instantly.', mode: 'salary-calculator' },
  // basePath: 'calculators' routes these under /calculators/<slug> instead
  // of the usual flat /<slug> — see app/calculators/[tool]/page.js, and the
  // notFound() guard in app/[tool]/page.js that keeps the flat URL 404ing
  // for these specific slugs so there's only ever one canonical URL each.
  { slug: 'loan-calculator', title: 'Loan Calculator', category: 'Calculators', description: 'Work out monthly repayments, total interest, and total repayment on any loan.', mode: 'loan-calculator', basePath: 'calculators' },
  { slug: 'vat-calculator', title: 'VAT Calculator', category: 'Calculators', description: 'Add VAT to an amount or extract it from a VAT-inclusive price, instantly.', mode: 'vat-calculator', basePath: 'calculators' },
  { slug: 'profit-margin', title: 'Profit & Loss Calculator', category: 'Calculators', description: 'Analyse revenue, expenses, margins, pricing and business performance.', mode: 'profit-margin', basePath: 'calculators' },
  { slug: 'discount-calculator', title: 'Discount Calculator', category: 'Calculators', description: 'Find the final price and total savings on any discounted item.', mode: 'discount-calculator', basePath: 'calculators' },
  { slug: 'age-calculator', title: 'Age Calculator', category: 'Calculators', description: 'Calculate exact age in years, months, and days from a date of birth.', mode: 'age-calculator', basePath: 'calculators' },
  { slug: 'expense-budget-calculator', title: 'Expense & Budget Calculator', category: 'Calculators', description: 'Track every income source and expense category, see your remaining balance live, and find out where your money actually goes.', mode: 'expense-budget-calculator', basePath: 'calculators' },
  { slug: 'break-even-calculator', title: 'Break-even Calculator', category: 'Calculators', description: 'Find out how many units you need to sell to cover your costs, your margin of safety, and how price or cost changes affect your break-even point.', mode: 'break-even-calculator', basePath: 'calculators' },
  { slug: 'savings-goal-calculator', title: 'Savings Goal Calculator', category: 'Calculators', description: 'Work out how much to save regularly to hit a target, or how long it will take at your current pace, interest included.', mode: 'savings-goal-calculator', basePath: 'calculators' },

  // ---------- Utilities ----------
  // Password Studio used to live as a tab inside Utilities Hub (mode:
  // 'utilities-hub') alongside Word Counter/Text Case Converter. It's now a
  // full flagship workspace with its own route, matching the QR Code Studio
  // precedent (slug kept simple/stable, title upgraded, dedicated mode).
  { slug: 'password-generator', title: 'Password Studio', category: 'Utilities', description: 'Generate, customize and analyse secure passwords with intelligent controls.', mode: 'password-studio' },
  // Word Counter was removed (already built into every major word
  // processor, so it added no real value) — this tool is now just the
  // Text Case Converter. Renamed from 'Utilities Hub' to match what it
  // actually does; /utilities-hub redirects here (see next.config.js) so
  // no existing link breaks. `mode` is left as 'utilities-hub' since it's
  // an internal identifier only, not user-facing.
  { slug: 'text-case-converter', title: 'Text Case Converter', category: 'Utilities', description: 'Instantly convert text into UPPERCASE, lowercase, Title Case, camelCase, snake_case and more.', mode: 'utilities-hub' },

  // ---------- Resume / CV ----------
];

export function getTool(slug) {
  return tools.find((t) => t.slug === slug);
}
