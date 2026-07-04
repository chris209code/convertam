import Link from 'next/link';

export const metadata = {
  title: 'AI Tools — Convertam',
  description: 'AI-powered document tools. Summarize PDFs, extract text, improve CVs and more. Free, no login required.',
};

const TOOLS = [
  { slug: 'summarize-pdf', title: 'Summarize PDF', desc: 'Upload a PDF and AI summarizes it instantly', free: true, available: true },
  { slug: 'smart-converter', title: 'Smart AI Converter', desc: 'Photograph a document and get back a Word or Excel file', free: true, available: true },
  { slug: 'receipt-scanner', title: 'Receipt & Invoice Scanner', desc: 'Scan a receipt and AI extracts vendor, items, totals', free: true, available: true },
  { slug: 'ocr-pdf', title: 'OCR PDF', desc: 'Extract text from scanned PDFs and images using AI', free: true, available: true },
  { slug: 'cv-improver', title: 'CV Improver', desc: 'Upload your CV and AI rewrites and improves it', free: true, available: false },
  { slug: 'cover-letter', title: 'Cover Letter Writer', desc: 'Generate a professional cover letter with AI', free: true, available: false },
  { slug: 'contract-summarizer', title: 'Contract Summarizer', desc: 'Upload a contract and AI highlights key points', free: true, available: false },
  { slug: 'grammar-fixer', title: 'Grammar Fixer', desc: 'Fix grammar, spelling and style issues in your text', free: true, available: false },
  { slug: 'email-writer', title: 'Email Writer', desc: 'AI writes professional emails from a few bullet points', free: true, available: false },
];

export default function AIToolsPage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 100%)' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
        .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .tool-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px; border-radius: 14px;
          border: 1px solid #DDD6FE; border-left: 3px solid #7C3AED;
          background: #F5F3FF; text-decoration: none;
          transition: all 0.2s ease;
        }
        .tool-card:hover { background: #EDE9FE; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(124,58,237,0.15); }
        .tool-card.coming { opacity: 0.6; cursor: default; pointer-events: none; }
        .tool-title { font-size: 0.88rem; font-weight: 700; color: #4C1D95; margin-bottom: 2px; }
        .tool-desc { font-size: 0.72rem; color: #475569; line-height: 1.3; }
        .badge { font-size: 0.6rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; white-space: nowrap; }
        .badge-free { background: #7C3AED; color: white; }
        .badge-soon { background: #94A3B8; color: white; }
        @media (max-width: 768px) {
          .page-inner { padding: 0 5%; }
          .tools-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
        @media (max-width: 480px) {
          .tools-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #DDD6FE', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#7C3AED', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.5rem' }}>🤖</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>AI Tools</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>Powered by Google Gemini AI — smart tools that read, extract and improve your documents.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-inner" style={{ padding: '48px 4%' }}>
        <div className="tools-grid">
          {TOOLS.map(({ slug, title, desc, free, available }) => (
            <Link key={slug} href={available ? `/${slug}` : '#'} className={`tool-card ${!available ? 'coming' : ''}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tool-title">{title}</div>
                <div className="tool-desc">{desc}</div>
              </div>
              <span className={`badge ${available ? 'badge-free' : 'badge-soon'}`}>
                {available ? 'FREE' : 'SOON'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
