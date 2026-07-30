// Tool metadata for the AI Workspace hub page — see lib/toolSections/pdf.js
// for why this lives as a standalone data module.
export const SECTIONS = [
  {
    id: 'all',
    label: 'All AI Tools',
    icon: '🤖',
    tools: [
      { slug: 'summarize-pdf', title: 'Summarize PDF', desc: 'Get an AI summary, key points, or simplified version of a PDF', icon: '📚', badge: 'free' },
      { slug: 'smart-converter', title: 'Smart AI Converter', desc: 'Photograph a document and get a clean Word file or Excel table', icon: '📸', badge: 'free' },
      { slug: 'receipt-scanner', title: 'Receipt & Invoice Scanner', desc: 'Photograph a receipt and extract vendor, items and totals to Excel', icon: '🧾', badge: 'free' },
      { slug: 'ocr-pdf', title: 'OCR PDF', desc: 'Extract text from scanned PDFs and images, including handwriting', icon: '🔎', badge: 'free' },
      { slug: 'document-translator', title: 'Document Translator', desc: 'Translate a document with a side-by-side preview of the original', icon: '🌐', badge: 'free' },
      { slug: 'contract-summarizer', title: 'Contract Summarizer', desc: 'Get a plain-language breakdown of a contract\'s key terms', icon: '📜', badge: 'free' },
      { slug: 'ask-solve-ai', title: 'Ask & Solve AI', desc: 'Get clear answers to math or general questions, typed or photographed', icon: '💡', badge: 'free' },
      { slug: 'presentation-generator', title: 'AI Presentation Generator', desc: 'Turn documents or notes into an editable PowerPoint deck', icon: '🎞️', badge: 'free' },
      { slug: 'data-analyst', title: 'AI Data Analyst', desc: 'Upload data and get automatic charts, insights and a written report', icon: '📊', badge: 'free' },
    ],
  },
];
