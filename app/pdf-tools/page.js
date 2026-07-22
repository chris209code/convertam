import CategoryLandingClient from '../../components/CategoryLandingClient';
import { PdfIcon, CATEGORY_ACCENTS } from '../../components/categoryVisuals';

export const metadata = {
  title: 'PDF Tools — Convertam',
  description: 'Complete PDF toolkit. Convert, edit, merge, split, compress, sign, watermark and secure your PDFs. Free, no login required.',
};

const FAQS = [
  {
    q: 'Is Convertam\'s PDF tools really free?',
    a: 'Yes — most PDF tools (merging, splitting, signing, watermarking, redacting, reordering, and more) are completely free with no limits. A small per-use fee applies only to tools that need a paid conversion engine: PDF to Word/Excel/PowerPoint and Compress PDF.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. Every PDF tool works without signing up, logging in, or providing an email address — upload your file and get started immediately.',
  },
  {
    q: 'Are my files secure?',
    a: 'Browser-based tools (Merge PDF, Split PDF, Sign PDF, and most others) process everything locally on your device — your file never leaves your browser. Tools that require server-side processing use encrypted transfer and delete your file immediately after the job completes.',
  },
  {
    q: 'What\'s the maximum file size?',
    a: 'Most PDF tools support files up to 100MB, whether they\'re free or paid.',
  },
  {
    q: 'Can I combine multiple PDF tools for one task?',
    a: 'Yes — many people scan a document, enhance it, run OCR, then convert it to Word, or merge, watermark, and password-protect a document before sending it. Each tool is designed to hand off cleanly into the next.',
  },
  {
    q: 'Which file formats can I convert to and from?',
    a: 'PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), JPG, and PNG, with more formats added over time.',
  },
];

const RELATED_CATEGORIES = [
  { slug: 'business', href: '/business', icon: '🧾', title: 'Business Documents', desc: 'Invoices, quotations, delivery notes and ID cards.', badgeBg: CATEGORY_ACCENTS.business.badgeFreeBg, accentText: CATEGORY_ACCENTS.business.accentText },
  { slug: 'ai-tools', href: '/ai-tools', icon: '🤖', title: 'AI Workspace', desc: 'AI tools that read, extract and improve your documents.', badgeBg: CATEGORY_ACCENTS.ai.badgeFreeBg, accentText: CATEGORY_ACCENTS.ai.accentText },
  { slug: 'image-tools', href: '/image-tools', icon: '🖼️', title: 'Image Studio', desc: 'Convert, compress, resize and edit images.', badgeBg: CATEGORY_ACCENTS.image.badgeFreeBg, accentText: CATEGORY_ACCENTS.image.accentText },
  { slug: 'calculator-hub', href: '/calculator-hub', icon: '🧮', title: 'Calculators', desc: 'VAT, loan, salary, and other business calculators.', badgeBg: CATEGORY_ACCENTS.calculator.badgeFreeBg, accentText: CATEGORY_ACCENTS.calculator.accentText },
  { slug: 'utilities', href: '/utilities', icon: '⚙️', title: 'Utilities', desc: 'QR codes, passwords, word counter and more.', badgeBg: CATEGORY_ACCENTS.utilities.badgeFreeBg, accentText: CATEGORY_ACCENTS.utilities.accentText },
];

const SECTIONS = [
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
      { slug: 'pdf-to-png', title: 'PDF to Images', desc: 'Turn each page of a PDF into a PNG image', icon: '🖼️', badge: 'free' },
      { slug: 'images-to-pdf', title: 'Images to PDF', desc: 'Combine JPG or PNG images into one PDF', icon: '🗂️', badge: 'free' },
    ],
  },
  {
    id: 'editing',
    label: 'Editing',
    icon: '✏️',
    tools: [
      { slug: 'write-on-pdf', title: 'Write on PDF', desc: 'Click anywhere on any PDF and type text on it', icon: '✍️', badge: 'free' },
      { slug: 'fill-pdf', title: 'Fill PDF Forms', desc: 'Fill digital PDF forms with built-in fields', icon: '🗒️', badge: 'free' },
      { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Place your signature anywhere on a PDF', icon: '✒️', badge: 'free' },
      { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Add custom text watermarks to your PDF', icon: '💧', badge: 'free' },
      { slug: 'reorder-pdf', title: 'Reorder Pages', desc: 'Drag and drop pages into any order', icon: '🔀', badge: 'free' },
      { slug: 'redact-pdf', title: 'Redact & Edit PDF', desc: 'Permanently redact sensitive info, or whiteout and correct mistakes', icon: '⬛', badge: 'free' },
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
      { slug: 'extract-pdf-images', title: 'Extract PDF Images', desc: 'Pull the embedded images out of a PDF', icon: '🖼️', badge: 'free' },
      { slug: 'compare-pdf', title: 'Compare PDFs', desc: 'See what changed between two versions of a PDF', icon: '🔍', badge: 'free' },
    ],
  },
  {
    id: 'security',
    label: 'Security',
    icon: '🔒',
    tools: [
      { slug: 'protect-pdf', title: 'Protect PDF', desc: 'Add a password to your PDF', icon: '🔒', badge: 'free' },
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

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

export default function PdfToolsPage() {
  return (
    <CategoryLandingClient
      accent={CATEGORY_ACCENTS.pdf}
      icon={PdfIcon}
      title="PDF Tools"
      subtitle="Convert, edit, organize, secure and optimize PDF files — all free, all in one place."
      sections={SECTIONS_WITH_HREF}
      faqs={FAQS}
      relatedCategories={RELATED_CATEGORIES}
    />
  );
}
