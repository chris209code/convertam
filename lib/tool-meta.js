export const toolMeta = {
  'summarize-pdf': {
    steps: ['Upload PDF', 'Choose Mode', 'Read Summary'],
    tips: [
      'Works best with text-based PDFs — not scanned images',
      'Choose Quick Summary for reports, Key Points for contracts',
      'Use Simplify Language for legal or technical documents',
    ],
    related: ['smart-converter', 'receipt-scanner', 'pdf-to-word'],
  },
  'fill-pdf': {
    steps: ['Upload PDF Form', 'Fill Fields', 'Download Filled PDF'],
    tips: [
      'Works with interactive PDFs that have built-in form fields',
      'Common with government forms, job applications, and bank forms',
      'Processed entirely in your browser — your documents never leave your device',
    ],
    related: ['sign-pdf', 'write-on-pdf', 'watermark-pdf'],
  },
  'write-on-pdf': {
    steps: ['Upload PDF', 'Add Text', 'Download Filled PDF'],
    tips: [
      'Works on any PDF — scanned forms, bank forms, printed documents',
      'Click "+ Add Text" then click exactly where you want to type',
      'Press Enter or Escape when done with each field, then add the next',
      'Use the size selector to match the font size of the form',
      'Processed entirely in your browser — your documents never leave your device',
    ],
    related: ['fill-pdf', 'sign-pdf', 'watermark-pdf'],
  },
  'pdf-to-word': {
    steps: ['Upload PDF', 'Convert', 'Download DOCX'],
    tips: [
      'Best results with text-based PDFs',
      'Tables and headings are preserved where possible',
      'Maximum file size: 100MB',
    ],
    related: ['word-to-pdf', 'pdf-to-excel', 'compress-pdf'],
  },
  'word-to-pdf': {
    steps: ['Upload DOCX', 'Convert', 'Download PDF'],
    tips: [
      'Fonts and formatting are preserved',
      'Works with .doc and .docx files',
      'Maximum file size: 100MB',
    ],
    related: ['pdf-to-word', 'pdf-to-excel', 'merge-pdf'],
  },
  'pdf-to-excel': {
    steps: ['Upload PDF', 'Convert', 'Download XLSX'],
    tips: [
      'Best results with PDFs that have clear table structures',
      'Multiple tables are extracted to separate sheets',
      'Maximum file size: 100MB',
    ],
    related: ['excel-to-pdf', 'pdf-to-word', 'pdf-to-powerpoint'],
  },
  'excel-to-pdf': {
    steps: ['Upload XLSX', 'Convert', 'Download PDF'],
    tips: [
      'All sheets are included in the output PDF',
      'Works with .xls and .xlsx files',
      'Maximum file size: 100MB',
    ],
    related: ['pdf-to-excel', 'word-to-pdf', 'powerpoint-to-pdf'],
  },
  'pdf-to-powerpoint': {
    steps: ['Upload PDF', 'Convert', 'Download PPTX'],
    tips: [
      'Each PDF page becomes a separate slide',
      'Best results with presentation-style PDFs',
      'Maximum file size: 100MB',
    ],
    related: ['powerpoint-to-pdf', 'pdf-to-word', 'pdf-to-excel'],
  },
  'powerpoint-to-pdf': {
    steps: ['Upload PPTX', 'Convert', 'Download PDF'],
    tips: [
      'All slides are included in the output',
      'Works with .ppt and .pptx files',
      'Maximum file size: 100MB',
    ],
    related: ['pdf-to-powerpoint', 'excel-to-pdf', 'word-to-pdf'],
  },
  'merge-pdf': {
    steps: ['Upload PDFs', 'Merge', 'Download PDF'],
    tips: [
      'Upload multiple files and drag to reorder before merging',
      'All pages from every file are combined in order',
      'Processed entirely in your browser',
    ],
    related: ['split-pdf', 'reorder-pdf', 'compress-pdf'],
  },
  'split-pdf': {
    steps: ['Upload PDF', 'Split', 'Download Pages'],
    tips: [
      'Each page is saved as a separate PDF file',
      'Download all pages as a single zip file',
      'Processed entirely in your browser',
    ],
    related: ['merge-pdf', 'extract-pdf-pages', 'reorder-pdf'],
  },
  'compress-pdf': {
    steps: ['Upload PDF', 'Compress', 'Download Smaller PDF'],
    tips: [
      'Larger files achieve higher compression rates',
      'Image-heavy PDFs benefit the most',
      'Original file remains unchanged on your device',
    ],
    related: ['merge-pdf', 'pdf-to-word', 'split-pdf'],
  },
  'rotate-pdf': {
    steps: ['Upload PDF', 'Rotate', 'Download PDF'],
    tips: [
      'Choose 90, 180, or 270 degree rotation',
      'All pages are rotated at once',
      'Processed entirely in your browser',
    ],
    related: ['merge-pdf', 'split-pdf', 'extract-pdf-pages'],
  },
  'extract-pdf-pages': {
    steps: ['Upload PDF', 'Select Pages', 'Download PDF'],
    tips: [
      'Enter page numbers like 1,3,5 or ranges like 2-6',
      'Extracted pages are saved as a new PDF',
      'Processed entirely in your browser',
    ],
    related: ['split-pdf', 'merge-pdf', 'reorder-pdf'],
  },
  'jpg-to-pdf': {
    steps: ['Upload JPG', 'Convert', 'Download PDF'],
    tips: [
      'Upload multiple JPGs to combine into one PDF',
      'Image quality is preserved',
      'Processed entirely in your browser',
    ],
    related: ['png-to-pdf', 'pdf-to-jpg', 'merge-pdf'],
  },
  'png-to-pdf': {
    steps: ['Upload PNG', 'Convert', 'Download PDF'],
    tips: [
      'Upload multiple PNGs to combine into one PDF',
      'Transparency is handled automatically',
      'Processed entirely in your browser',
    ],
    related: ['jpg-to-pdf', 'pdf-to-png', 'merge-pdf'],
  },
  'pdf-to-jpg': {
    steps: ['Upload PDF', 'Convert', 'Download JPGs'],
    tips: [
      'Each page becomes a separate JPG image',
      'High quality output suitable for sharing',
      'Processed entirely in your browser',
    ],
    related: ['pdf-to-png', 'jpg-to-pdf', 'compress-pdf'],
  },
  'pdf-to-png': {
    steps: ['Upload PDF', 'Convert', 'Download PNGs'],
    tips: [
      'Each page becomes a separate PNG image',
      'PNG supports transparent backgrounds',
      'Processed entirely in your browser',
    ],
    related: ['pdf-to-jpg', 'png-to-pdf', 'compress-pdf'],
  },
  'sign-pdf': {
    steps: ['Upload Signature Photo', 'Place on PDF', 'Download Signed PDF'],
    tips: [
      'Sign on plain white paper — the tool automatically removes the white background and keeps only your ink',
      'Use any ink colour that stands out clearly against white paper',
      'Take the photo in bright natural light and avoid shadows',
      'Hold your phone steady and shoot straight down at the paper',
      'Crop tightly around your signature before uploading for the cleanest result',
      'The whiter your background, the cleaner your signature will appear on the PDF',
    ],
    related: ['fill-pdf', 'write-on-pdf', 'watermark-pdf'],
  },
  'reorder-pdf': {
    steps: ['Upload PDF', 'Drag to Reorder', 'Download PDF'],
    tips: [
      'Drag page thumbnails to rearrange them',
      'Works on mobile — swipe to reorder',
      'Processed entirely in your browser',
    ],
    related: ['merge-pdf', 'split-pdf', 'extract-pdf-pages'],
  },
  'watermark-pdf': {
    steps: ['Upload PDF', 'Set Watermark', 'Download PDF'],
    tips: [
      'Choose diagonal placement for the classic watermark look',
      'Adjust opacity so the watermark does not obscure content',
      'Apply to all pages or specific pages only',
    ],
    related: ['sign-pdf', 'compress-pdf', 'merge-pdf'],
  },
  'invoice-generator': {
    steps: ['Fill In Details', 'Generate', 'Download PDF'],
    tips: [
      'Save your business details once — auto-filled every time after',
      'Invoice numbers are generated automatically',
      'Share via WhatsApp or any app after generating',
    ],
    related: ['receipt-scanner', 'sign-pdf', 'watermark-pdf'],
  },
  'smart-converter': {
    steps: ['Upload Document Photo', 'AI Reads It', 'Download Word or Excel'],
    tips: [
      'Take a clear, well-lit photo for best accuracy',
      'Works with printed text, handwriting, and receipts',
      'Tables are automatically detected and structured',
    ],
    related: ['receipt-scanner', 'pdf-to-word', 'pdf-to-excel'],
  },
  'receipt-scanner': {
    steps: ['Upload Receipt Photo', 'AI Extracts Data', 'Download Excel'],
    tips: [
      'Works with receipts, invoices, and bills',
      'AI extracts vendor, items, amounts, and totals',
      'Perfect for expense tracking and bookkeeping',
    ],
    related: ['smart-converter', 'invoice-generator', 'pdf-to-excel'],
  },
  'ocr-pdf': {
    steps: ['Upload PDF or Image', 'AI Extracts Text', 'Copy or Download'],
    tips: [
      'Works on scanned PDFs, photos of documents, and handwritten notes',
      'Clear, well-lit images give the best results',
      'Supports both printed and handwritten text',
      'Use Copy to paste the text directly into another app',
    ],
    related: ['smart-converter', 'pdf-to-word', 'summarize-pdf'],
  },
};
