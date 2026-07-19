export const tools = [
  // ---------- Document Conversion ----------
  { slug: 'pdf-to-word', title: 'PDF to Word', category: 'Document Conversion', description: 'Turn a PDF into an editable Word document (.docx), formatting included.', mode: 'office', accept: 'application/pdf', toFormat: 'docx', toLabel: 'Word' },
  { slug: 'word-to-pdf', title: 'Word to PDF', category: 'Document Conversion', description: 'Turn a Word document into a clean, shareable PDF.', mode: 'office', accept: '.doc,.docx', toFormat: 'pdf', toLabel: 'PDF' },
  { slug: 'pdf-to-excel', title: 'PDF to Excel', category: 'Document Conversion', description: 'Pull tables out of a PDF into an editable Excel spreadsheet (.xlsx).', mode: 'office', accept: 'application/pdf', toFormat: 'xlsx', toLabel: 'Excel' },
  { slug: 'excel-to-pdf', title: 'Excel to PDF', category: 'Document Conversion', description: 'Turn a spreadsheet into a PDF that prints and shares cleanly.', mode: 'office', accept: '.xls,.xlsx', toFormat: 'pdf', toLabel: 'PDF' },
  { slug: 'pdf-to-powerpoint', title: 'PDF to PowerPoint', category: 'Document Conversion', description: 'Turn PDF pages into an editable PowerPoint presentation.', mode: 'office', accept: 'application/pdf', toFormat: 'pptx', toLabel: 'PowerPoint' },
  { slug: 'powerpoint-to-pdf', title: 'PowerPoint to PDF', category: 'Document Conversion', description: 'Turn a presentation into a PDF ready to share or print.', mode: 'office', accept: '.ppt,.pptx', toFormat: 'pdf', toLabel: 'PDF' },
  { slug: 'html-to-pdf', title: 'HTML to PDF', category: 'Document Conversion', description: 'Paste HTML code and convert it to a downloadable PDF.', mode: 'html-to-pdf' },

  // ---------- PDF Utilities ----------
  { slug: 'merge-pdf', title: 'Merge PDF', category: 'PDF Utilities', description: 'Combine multiple PDFs into a single file, in the order you choose.', mode: 'pdf-lib', pdfLibMode: 'merge' },
  { slug: 'split-pdf', title: 'Split PDF', category: 'PDF Utilities', description: 'Break a PDF into individual pages, downloaded as a zip.', mode: 'pdf-lib', pdfLibMode: 'split' },
  { slug: 'compress-pdf', title: 'Compress PDF', category: 'PDF Utilities', description: "Shrink a PDF's file size for easier sharing.", mode: 'compress' },
  { slug: 'rotate-pdf', title: 'Rotate PDF', category: 'PDF Utilities', description: 'Rotate every page in a PDF by 90°, 180°, or 270°.', mode: 'pdf-lib', pdfLibMode: 'rotate' },
  { slug: 'extract-pdf-pages', title: 'Extract PDF Pages', category: 'PDF Utilities', description: 'Pull specific pages out of a PDF into a new, smaller PDF.', mode: 'pdf-lib', pdfLibMode: 'extract' },
  { slug: 'remove-pdf-pages', title: 'Remove PDF Pages', category: 'PDF Utilities', description: 'Click pages to mark them for deletion, then download the cleaned PDF.', mode: 'remove-pages' },
  { slug: 'add-page-numbers', title: 'Add Page Numbers', category: 'PDF Utilities', description: 'Stamp page numbers onto every page — choose position, size, and format.', mode: 'add-page-numbers' },
  { slug: 'protect-pdf', title: 'Protect PDF', category: 'PDF Utilities', description: 'Add a password to your PDF so only the right people can open it.', mode: 'protect-pdf' },

  // ---------- Image Tools ----------
  { slug: 'jpg-to-pdf', title: 'JPG to PDF', category: 'Image Tools', description: 'Combine one or more JPG photos into a single PDF.', mode: 'pdf-lib', pdfLibMode: 'image-to-pdf', accept: 'image/jpeg' },
  { slug: 'png-to-pdf', title: 'PNG to PDF', category: 'Image Tools', description: 'Combine one or more PNG images into a single PDF.', mode: 'pdf-lib', pdfLibMode: 'image-to-pdf', accept: 'image/png' },
  { slug: 'pdf-to-jpg', title: 'PDF to JPG', category: 'Image Tools', description: 'Turn each page of a PDF into a JPG image.', mode: 'pdf-to-image', imageFormat: 'jpeg' },
  { slug: 'pdf-to-png', title: 'PDF to Images', category: 'PDF Tools', description: 'Turn each page of a PDF into a PNG image.', mode: 'pdf-to-image', imageFormat: 'png' },
  { slug: 'images-to-pdf', title: 'Images to PDF', category: 'PDF Tools', description: 'Combine multiple JPG or PNG images into one PDF, in any order.', mode: 'images-to-pdf' },
  { slug: 'extract-pdf-images', title: 'Extract PDF Images', category: 'PDF Tools', description: 'Pull the embedded images out of a PDF and download them individually or as a ZIP.', mode: 'extract-pdf-images' },
  { slug: 'compare-pdf', title: 'Compare PDFs', category: 'PDF Tools', description: 'See what text changed between two versions of a PDF, highlighted side by side.', mode: 'compare-pdf' },
  { slug: 'redact-pdf', title: 'Redact & Edit PDF', category: 'PDF Tools', description: 'Permanently black out sensitive information, or whiteout a mistake and type the correction right on the page.', mode: 'redact-pdf' },
  { slug: 'pdf-overlay', title: 'PDF Overlay', category: 'PDF Tools', description: 'Stamp one PDF (like a letterhead or template) onto every page of another.', mode: 'pdf-overlay' },
  { slug: 'image-compressor', title: 'Image Compressor', category: 'Image Tools', description: 'Reduce image file size without losing quality — JPG, PNG, WebP, with batch support.', mode: 'image-compressor' },
  { slug: 'resize-image', title: 'Image Resizer & Cropper', category: 'Image Tools', description: 'Resize, crop and perfectly fit images for social media, profiles, banners and custom dimensions.', mode: 'resize-image' },
  { slug: 'watermark-image', title: 'Watermark Image', category: 'Image Tools', description: 'Add text or logo watermarks to images — opacity, rotation, position or tiled, with batch support.', mode: 'watermark-image' },
  { slug: 'convert-image-format', title: 'Image Format Converter', category: 'Image Tools', description: 'Convert between JPG, PNG, and WebP, with batch support.', mode: 'convert-image-format' },
  { slug: 'meme-generator', title: 'Meme Generator', category: 'Image Tools', description: 'Add classic bold top/bottom captions to any image.', mode: 'meme-generator' },
  { slug: 'document-enhancer', title: 'Document Enhancer', category: 'Image Tools', description: 'Clean up a photo of a document — crop, straighten, remove shadows, and sharpen for a proper scan look.', mode: 'document-enhancer' },

  // ---------- PDF Editor ----------
  { slug: 'write-on-pdf', title: 'Write on PDF', category: 'PDF Editor', description: 'Click anywhere on any PDF — scanned forms, bank forms, printed documents — and type text directly onto it.', mode: 'write-on-pdf' },
  { slug: 'fill-pdf', title: 'Fill PDF Forms', category: 'PDF Editor', description: 'Upload a digital PDF form with built-in fields, fill them in on screen, and download the completed document.', mode: 'fill' },
  { slug: 'sign-pdf', title: 'Sign PDF', category: 'PDF Editor', description: 'Upload a photo of your handwritten signature and place it anywhere on a PDF.', mode: 'sign' },
  { slug: 'reorder-pdf', title: 'Reorder PDF Pages', category: 'PDF Editor', description: 'Drag and drop PDF pages into any order, then download the rearranged file.', mode: 'reorder' },
  { slug: 'watermark-pdf', title: 'Watermark PDF', category: 'PDF Editor', description: 'Add custom text watermarks to every page of a PDF — CONFIDENTIAL, DRAFT, your name, anything.', mode: 'watermark' },
  { slug: 'invoice-generator', title: 'Invoice Generator', category: 'PDF Editor', description: 'Create a professional PDF invoice in seconds. Fill in your details, add items, download.', mode: 'invoice' },

  // ---------- Business Tools ----------
  { slug: 'quotation-generator', title: 'Quotation Generator', category: 'Business Tools', description: 'Create professional quotations and proforma invoices. Fill in your details, add items, download PDF.', mode: 'quotation' },
  { slug: 'id-card-generator', title: 'ID Card Generator', category: 'Business Tools', description: 'Design and print a professional ID card — front and back, photo included, ready to laminate.', mode: 'id-card-generator' },
  { slug: 'delivery-note-waybill', title: 'Delivery Note & Waybill Generator', category: 'Business Tools', description: 'Generate a delivery note or a waybill — toggle the document type and the form adapts. Download as PDF.', mode: 'delivery-note-waybill' },
  { slug: 'delivery-note-waybill', title: 'Delivery Note & Waybill Generator', category: 'Business Tools', description: 'Create a delivery note or waybill — switch document type, fill in details, download PDF.', mode: 'delivery-note-waybill' },
  { slug: 'delivery-note-waybill', title: 'Delivery Note & Waybill Generator', category: 'Business Tools', description: 'Confirm what was delivered or document goods in transit — switch between Delivery Note and Waybill formats.', mode: 'delivery-note-waybill' },

  // ---------- Smart Converter (AI) ----------
  { slug: 'summarize-pdf', title: 'Summarize PDF', category: 'Smart Converter', description: 'Upload a PDF and let AI summarize it, extract key points, or simplify the language.', mode: 'summarize' },
  { slug: 'smart-converter', title: 'Smart AI Converter', category: 'Smart Converter', description: 'Photograph a document and get back a clean Word file or Excel table.', mode: 'smart' },
  { slug: 'receipt-scanner', title: 'Receipt & Invoice Scanner', category: 'Smart Converter', description: 'Photograph a receipt or invoice — AI extracts vendor, items, totals and exports to Excel.', mode: 'receipt' },
  { slug: 'ocr-pdf', title: 'OCR PDF', category: 'Smart Converter', description: 'Extract text from scanned PDFs and images using AI. Works on handwriting too.', mode: 'ocr-pdf' },
  { slug: 'cv-improver', title: 'CV Improver', category: 'Smart Converter', description: 'Paste or upload your CV and tell us the role you want — AI tailors it into a stronger, ATS-friendly, completely truthful CV.', mode: 'cv-improver' },
  { slug: 'qr-code-generator', title: 'QR Code Studio', category: 'Utilities', description: 'Create fully customizable QR codes — gradients, logos, custom shapes, and instant scan validation.', mode: 'qr-code-studio' },
  { slug: 'ask-solve-ai', title: 'Ask & Solve AI', category: 'Smart Converter', description: 'Scan, type or upload a question and get clear answers instantly — Math, General, and Translate modes.', mode: 'ask-solve-ai' },
  { slug: 'resume-builder', title: 'Resume Builder', category: 'Smart Converter', description: 'A guided, AI-assisted CV builder — answer simple questions and AI helps you write strong, honest content, even if you don\'t know where to start.', mode: 'resume-builder' },
  { slug: 'cover-letter', title: 'Cover Letter Writer', category: 'Smart Converter', description: 'Generate a tailored, professional cover letter with AI — from your background and the job description.', mode: 'cover-letter' },
  { slug: 'contract-summarizer', title: 'Contract Summarizer', category: 'Smart Converter', description: 'Upload a contract and AI highlights the key parties, terms, obligations, and anything worth reviewing closely.', mode: 'contract-summarizer' },
  { slug: 'presentation-generator', title: 'AI Presentation Generator', category: 'Smart Converter', description: 'Upload documents — PDF, Word, TXT, or photos — and AI turns them into a structured, editable PowerPoint presentation.', mode: 'presentation-generator' },
  { slug: 'presentation-generator', title: 'AI Presentation Generator', category: 'Smart Converter', description: 'Upload documents and AI turns them into a structured, editable PowerPoint presentation.', mode: 'presentation-generator' },
  { slug: 'data-analyst', title: 'AI Data Analyst', category: 'Smart Converter', description: 'Upload spreadsheets or a photo of a table and get automatic charts, insights, and an executive report.', mode: 'data-analyst' },

  // ---------- Calculators ----------
  { slug: 'calculator-hub', title: 'Calculator Hub', category: 'Calculators', description: 'VAT, Loan, Salary, BMI, Age, Discount, Profit Margin and Tip calculators — all in one place.', mode: 'calculator-hub' },
  { slug: 'salary-calculator', title: 'Salary Calculator', category: 'Calculators', description: 'Calculate your take-home pay with a live breakdown of tax, pension, and other deductions — converted across every pay period instantly.', mode: 'salary-calculator' },

  // ---------- Utilities ----------
  { slug: 'utilities-hub', title: 'Utilities Hub', category: 'Utilities', description: 'Password Generator, Word Counter, Text Case Converter — all in one place.', mode: 'utilities-hub' },

  // ---------- Resume / CV ----------
];

export function getTool(slug) {
  return tools.find((t) => t.slug === slug);
}
