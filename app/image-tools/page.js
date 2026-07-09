import Link from 'next/link';

export const metadata = {
  title: 'Image Tools — Convertam',
  description: 'Free image tools. Convert, compress, resize and edit images. No login required.',
};

const TOOLS = [
  { slug: 'jpg-to-pdf', title: 'JPG to PDF', desc: 'Combine JPG photos into a single PDF', free: true, available: true },
  { slug: 'png-to-pdf', title: 'PNG to PDF', desc: 'Combine PNG images into a single PDF', free: true, available: true },
  { slug: 'pdf-to-jpg', title: 'PDF to JPG', desc: 'Turn each PDF page into a JPG image', free: true, available: true },
  { slug: 'image-compressor', title: 'Image Compressor', desc: 'Reduce image file size without losing quality', free: true, available: true },
  { slug: 'resize-image', title: 'Image Resizer & Cropper', desc: 'Resize, crop and perfectly fit images for social media, profiles, banners and custom dimensions', free: true, available: true },
  { slug: 'watermark-image', title: 'Watermark Image', desc: 'Add text or logo watermarks to images', free: true, available: true },
  { slug: 'convert-image-format', title: 'Image Format Converter', desc: 'Convert between JPG, PNG, and WebP', free: true, available: true },
  { slug: 'meme-generator', title: 'Meme Generator', desc: 'Add classic bold top/bottom captions to any image', free: true, available: true },
  { slug: 'document-enhancer', title: 'Document Enhancer', desc: 'Remove shadows and enhance scanned documents', free: true, available: true },
];

export default function ImageToolsPage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%)' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
        .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .tool-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px; border-radius: 14px;
          border: 1px solid #FDE68A; border-left: 3px solid #D97706;
          background: #FFFBEB; text-decoration: none;
          transition: all 0.2s ease;
        }
        .tool-card:hover { background: #FEF3C7; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(217,119,6,0.15); }
        .tool-card.coming { opacity: 0.6; cursor: default; pointer-events: none; }
        .tool-title { font-size: 0.88rem; font-weight: 700; color: #92400E; margin-bottom: 2px; }
        .tool-desc { font-size: 0.72rem; color: #475569; line-height: 1.3; }
        .badge { font-size: 0.6rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; white-space: nowrap; }
        .badge-free { background: #D97706; color: white; }
        .badge-soon { background: #94A3B8; color: white; }
        @media (max-width: 768px) {
          .page-inner { padding: 0 5%; }
          .tools-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
        @media (max-width: 480px) {
          .tools-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #FDE68A', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#D97706', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.5rem' }}>🖼️</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>Image Tools</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>Convert, compress, resize and edit images — all free, all in your browser.</p>
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
