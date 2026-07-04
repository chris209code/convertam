import Link from 'next/link';

export const metadata = {
  title: 'Utilities — Convertam',
  description: 'Free utility tools. QR code generator, password generator, word counter and more. No login required.',
};

const TOOLS = [
  { slug: 'qr-generator', title: 'QR Code Generator', desc: 'Generate QR codes for any URL or text', free: true, available: false },
  { slug: 'password-generator', title: 'Password Generator', desc: 'Generate strong secure passwords instantly', free: true, available: false },
  { slug: 'word-counter', title: 'Word Counter', desc: 'Count words, characters and paragraphs', free: true, available: false },
  { slug: 'lorem-ipsum', title: 'Lorem Ipsum Generator', desc: 'Generate placeholder text for designs', free: true, available: false },
  { slug: 'barcode-generator', title: 'Barcode Generator', desc: 'Generate barcodes for products or labels', free: true, available: false },
  { slug: 'base64', title: 'Base64 Encoder/Decoder', desc: 'Encode and decode Base64 strings', free: true, available: false },
  { slug: 'json-formatter', title: 'JSON Formatter', desc: 'Format and validate JSON data', free: true, available: false },
  { slug: 'uuid-generator', title: 'UUID Generator', desc: 'Generate unique identifiers instantly', free: true, available: false },
];

export default function UtilitiesPage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
        .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .tool-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px; border-radius: 14px;
          border: 1px solid #E2E8F0; border-left: 3px solid #475569;
          background: #F8FAFC; text-decoration: none;
          transition: all 0.2s ease; opacity: 0.7;
          cursor: default; pointer-events: none;
        }
        .tool-title { font-size: 0.88rem; font-weight: 700; color: #1E293B; margin-bottom: 2px; }
        .tool-desc { font-size: 0.72rem; color: #475569; line-height: 1.3; }
        .badge { font-size: 0.6rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; white-space: nowrap; background: #94A3B8; color: white; }
        @media (max-width: 768px) {
          .page-inner { padding: 0 5%; }
          .tools-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
        @media (max-width: 480px) {
          .tools-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#475569', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.5rem' }}>⚙️</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>Utilities</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>Handy tools for everyday tasks — QR codes, passwords, text tools and more.</p>
            </div>
          </div>
          <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '12px', background: '#FEF3C7', border: '1px solid #FDE68A', display: 'inline-block' }}>
            <span style={{ fontSize: '0.82rem', color: '#92400E', fontWeight: 600 }}>🚧 Coming Soon — Utilities are in development</span>
          </div>
        </div>
      </div>

      <div className="page-inner" style={{ padding: '48px 4%' }}>
        <div className="tools-grid">
          {TOOLS.map(({ slug, title, desc }) => (
            <div key={slug} className="tool-card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="tool-title">{title}</div>
                <div className="tool-desc">{desc}</div>
              </div>
              <span className="badge">SOON</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
