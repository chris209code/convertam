import Link from 'next/link';

export const metadata = {
  title: 'PDF Tools — Convertam',
  description: 'Complete PDF toolkit. Convert, edit, merge, split, compress, sign, watermark and secure your PDFs. Free, no login required.',
};

const SECTIONS = [
  {
    title: 'Conversion',
    icon: '🔄',
    tools: [
      { slug: 'pdf-to-word', title: 'PDF to Word', desc: 'Turn a PDF into an editable Word document', free: false },
      { slug: 'word-to-pdf', title: 'Word to PDF', desc: 'Turn a Word document into a clean PDF', free: false },
      { slug: 'pdf-to-excel', title: 'PDF to Excel', desc: 'Pull tables out of a PDF into Excel', free: false },
      { slug: 'excel-to-pdf', title: 'Excel to PDF', desc: 'Turn a spreadsheet into a shareable PDF', free: false },
      { slug: 'pdf-to-powerpoint', title: 'PDF to PowerPoint', desc: 'Turn PDF pages into editable slides', free: false },
      { slug: 'powerpoint-to-pdf', title: 'PowerPoint to PDF', desc: 'Turn a presentation into a PDF', free: false },
      { slug: 'html-to-pdf', title: 'HTML to PDF', desc: 'Convert HTML code into a downloadable PDF', free: true },
    ],
  },
  {
    title: 'Editing',
    icon: '✏️',
    tools: [
      { slug: 'write-on-pdf', title: 'Write on PDF', desc: 'Click anywhere on any PDF and type text on it', free: true },
      { slug: 'fill-pdf', title: 'Fill PDF Forms', desc: 'Fill digital PDF forms with built-in fields', free: true },
      { slug: 'sign-pdf', title: 'Sign PDF', desc: 'Place your signature anywhere on a PDF', free: true },
      { slug: 'watermark-pdf', title: 'Watermark PDF', desc: 'Add custom text watermarks to your PDF', free: true },
      { slug: 'reorder-pdf', title: 'Reorder Pages', desc: 'Drag and drop pages into any order', free: true },
    ],
  },
  {
    title: 'Organize',
    icon: '📂',
    tools: [
      { slug: 'merge-pdf', title: 'Merge PDF', desc: 'Combine multiple PDFs into one file', free: true },
      { slug: 'split-pdf', title: 'Split PDF', desc: 'Break a PDF into individual pages', free: true },
      { slug: 'rotate-pdf', title: 'Rotate PDF', desc: 'Rotate every page in a PDF', free: true },
      { slug: 'remove-pdf-pages', title: 'Remove Pages', desc: 'Delete specific pages from a PDF', free: true },
      { slug: 'extract-pdf-pages', title: 'Extract Pages', desc: 'Pull specific pages into a new PDF', free: true },
      { slug: 'add-page-numbers', title: 'Add Page Numbers', desc: 'Stamp page numbers onto every page', free: true },
    ],
  },
  {
    title: 'Security',
    icon: '🔒',
    tools: [
      { slug: 'protect-pdf', title: 'Protect PDF', desc: 'Add a password to your PDF', free: true },
    ],
  },
  {
    title: 'Optimization',
    icon: '⚡',
    tools: [
      { slug: 'compress-pdf', title: 'Compress PDF', desc: 'Shrink a PDF file size for easier sharing', free: false },
      { slug: 'ocr-pdf', title: 'OCR PDF', desc: 'Extract text from scanned PDFs using AI', free: true },
    ],
  },
];

export default function PdfToolsPage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #F3F8FF 0%, #EEF5FF 100%)' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
        .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .tool-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px; border-radius: 14px;
          border: 1px solid #BFDBFE; border-left: 3px solid #2563EB;
          background: #EBF3FF; text-decoration: none;
          transition: all 0.2s ease;
        }
        .tool-card:hover { background: #DBEAFE; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(37,99,235,0.15); }
        .tool-title { font-size: 0.88rem; font-weight: 700; color: #1E3A5F; margin-bottom: 2px; }
        .tool-desc { font-size: 0.72rem; color: #475569; line-height: 1.3; }
        .badge { font-size: 0.6rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; white-space: nowrap; }
        .badge-free { background: #2563EB; color: white; }
        .badge-paid { background: #F59E0B; color: white; }
        @media (max-width: 768px) {
          .page-inner { padding: 0 5%; }
          .tools-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
        @media (max-width: 480px) {
          .tools-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5EDF8', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#2563EB', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.5rem' }}>📄</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>PDF Tools</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>Everything you need to work with PDFs — all in one place.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="page-inner" style={{ padding: '48px 4%' }}>
        {SECTIONS.map(({ title, icon, tools }) => (
          <div key={title} style={{ marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.3rem' }}>{icon}</span>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#152238', margin: 0 }}>{title}</h2>
            </div>
            <div className="tools-grid">
              {tools.map(({ slug, title: toolTitle, desc, free }) => (
                <Link key={slug} href={`/${slug}`} className="tool-card">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="tool-title">{toolTitle}</div>
                    <div className="tool-desc">{desc}</div>
                  </div>
                  <span className={`badge ${free ? 'badge-free' : 'badge-paid'}`}>
                    {free ? 'FREE' : 'PAID'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
