// Tool metadata for the PDF Tools hub page — kept as a standalone data
// module (not inline in app/pdf-tools/page.js) so it can also be read by
// the cross-page favorites registry (lib/allToolCards.js) without pulling
// the whole page module (and its metadata/JSON-LD) into a client bundle.
export const SECTIONS = [
  {
    id: 'conversion',
    label: 'Conversion',
    icon: '🔄',
    tools: [
      { slug: 'pdf-to-word', title: 'PDF to Word', desc: 'Turn a PDF into an editable Word document', icon: '📝', badge: 'paid' },
      { slug: 'word-to-pdf', title: 'Word to PDF', desc: 'Turn a Word document into a clean PDF', icon: '📄', badge: 'paid' },
      { slug: 'pdf-to-excel', title: 'PDF to Excel', desc: 'Pull tables out of a PDF into Excel', icon: '📊', badge: 'paid' },
      { slug: 'excel-to-pdf', title: 'Excel to PDF', desc: 'Turn a spreadsheet into a shareable PDF', icon: '📑', badge: 'paid' },
      { slug: 'pdf-to-powerpoint', title: 'PDF to PowerPoint', desc: 'Turn PDF pages into editable slides', icon: '📽️', badge: 'paid' },
      { slug: 'powerpoint-to-pdf', title: 'PowerPoint to PDF', desc: 'Turn a presentation into a PDF', icon: '🖥️', badge: 'paid' },
      { slug: 'html-to-pdf', title: 'HTML to PDF', desc: 'Convert HTML code into a downloadable PDF', icon: '🌐', badge: 'free' },
      { slug: 'markdown-to-pdf', title: 'Markdown to PDF', desc: 'Turn Markdown into a clean, formatted PDF', icon: '📃', badge: 'free' },
      { slug: 'pdf-to-png', title: 'PDF to Images', desc: 'Turn each page of a PDF into a PNG image', icon: '🖼️', badge: 'free' },
      { slug: 'images-to-pdf', title: 'Images to PDF', desc: 'Combine JPG or PNG images into one PDF', icon: '🗂️', badge: 'free' },
      { slug: 'pdf-to-text', title: 'PDF to Text', desc: 'Pull all the readable text out of a PDF', icon: '📃', badge: 'free' },
    ],
  },
  {
    id: 'editing',
    label: 'Editing',
    icon: '✏️',
    tools: [
      { slug: 'write-on-pdf', title: 'Write on PDF', desc: 'Click anywhere on any PDF and type text on it', icon: '✍️', badge: 'free' },
      { slug: 'fill-pdf', title: 'Fill PDF Forms', desc: 'Fill digital PDF forms with built-in fields', icon: '🗒️', badge: 'free' },
      { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Add custom text watermarks to your PDF', icon: '💧', badge: 'free' },
      { slug: 'reorder-pdf', title: 'Reorder Pages', desc: 'Drag and drop pages into any order', icon: '🔀', badge: 'free' },
      { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Permanently redact sensitive info, or whiteout and correct mistakes', icon: '⬛', badge: 'free' },
      { slug: 'annotate-pdf', title: 'Annotate PDF', desc: 'Highlight, draw, and add sticky notes right on the page', icon: '🖍️', badge: 'free' },
      { slug: 'pdf-overlay', title: 'PDF Overlay', desc: 'Stamp one PDF (like a letterhead) on top of another', icon: '🪄', badge: 'free' },
    ],
  },
  {
    id: 'organize',
    label: 'Organize',
    icon: '📂',
    tools: [
      { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine multiple PDFs into one file', icon: '🔗', badge: 'free' },
      { slug: 'split-pdf', title: 'Split PDF', desc: 'Break a PDF into individual pages', icon: '✂️', badge: 'free' },
      { slug: 'rotate-pdf', title: 'Rotate PDF', desc: 'Rotate every page in a PDF', icon: '🔄', badge: 'free' },
      { slug: 'remove-pdf-pages', title: 'Remove Pages', desc: 'Delete specific pages from a PDF', icon: '🗑️', badge: 'free' },
      { slug: 'extract-pdf-pages', title: 'Extract Pages', desc: 'Pull specific pages into a new PDF', icon: '📤', badge: 'free' },
      { slug: 'add-page-numbers', title: 'Add Page Numbers', desc: 'Stamp page numbers onto every page', icon: '#️⃣', badge: 'free' },
      { slug: 'crop-pdf', title: 'Crop PDF', desc: 'Trim the margins off every page', icon: '✂️', badge: 'free' },
      { slug: 'extract-pdf-images', title: 'Extract PDF Images', desc: 'Pull the embedded images out of a PDF', icon: '🖼️', badge: 'free' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: '🔒',
    tools: [
      { slug: 'protect-pdf', title: 'Protect PDF', desc: 'Add a password to your PDF', icon: '🔒', badge: 'free' },
      { slug: 'unlock-pdf', title: 'Unlock PDF', desc: 'Remove a password you already know', icon: '🔓', badge: 'free' },
      { slug: 'remove-pdf-metadata', title: 'Remove PDF Metadata', desc: 'Strip hidden author, software and date details', icon: '🕵️', badge: 'free' },
    ],
  },
  {
    id: 'optimization',
    label: 'Optimization',
    icon: '⚡',
    tools: [
      { slug: 'compress-pdf', title: 'Compress PDF', desc: 'Shrink a PDF file size for easier sharing', icon: '🗜️', badge: 'paid' },
      { slug: 'ocr-pdf', title: 'OCR PDF', desc: 'Extract text from scanned PDFs using AI', icon: '🔎', badge: 'free' },
    ],
  },
];
