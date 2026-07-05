import Link from 'next/link';

export const metadata = {
  title: 'Business Tools — Convertam',
  description: 'Free business document tools. Create invoices, quotations, receipts, ID cards and more. No login required.',
};

const TOOLS = [
  { slug: 'invoice-generator', title: 'Invoice Generator', desc: 'Create professional PDF invoices in seconds', available: true },
  { slug: 'quotation-generator', title: 'Quotation Generator', desc: 'Generate professional quotations and proforma invoices', available: true },
  { slug: 'resume-builder', title: 'Resume Builder', desc: 'Build a professional resume from scratch and download as PDF', available: true },
  { slug: 'receipt-generator', title: 'Receipt Generator', desc: 'Create payment receipts instantly', available: false },
  { slug: 'delivery-note-waybill', title: 'Delivery Note & Waybill Generator', desc: 'Confirm delivery or document goods in transit', available: true },
  { slug: 'id-card-generator', title: 'ID Card Generator', desc: 'Design and print professional ID cards', available: true },
  { slug: 'certificate-generator', title: 'Certificate Generator', desc: 'Create certificates of completion or achievement', available: false },
  { slug: 'business-card', title: 'Business Card Generator', desc: 'Design and download professional business cards', available: false },
];

export default function BusinessPage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 100%)' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
        .tools-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .tool-card {
          display: flex; align-items: center; gap: 12px;
          padding: 16px; border-radius: 14px;
          border: 1px solid #A7F3D0; border-left: 3px solid #059669;
          background: #ECFDF5; text-decoration: none;
          transition: all 0.2s ease;
        }
        .tool-card:hover { background: #D1FAE5; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(5,150,105,0.15); }
        .tool-card.coming { opacity: 0.6; cursor: default; pointer-events: none; }
        .tool-title { font-size: 0.88rem; font-weight: 700; color: #065F46; margin-bottom: 2px; }
        .tool-desc { font-size: 0.72rem; color: #475569; line-height: 1.3; }
        .badge { font-size: 0.6rem; font-weight: 700; padding: 2px 7px; border-radius: 99px; white-space: nowrap; }
        .badge-free { background: #059669; color: white; }
        .badge-soon { background: #94A3B8; color: white; }
        @media (max-width: 768px) {
          .page-inner { padding: 0 5%; }
          .tools-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
        }
        @media (max-width: 480px) {
          .tools-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #A7F3D0', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#059669', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <span style={{ fontSize: '2.5rem' }}>🧾</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>Business Tools</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>Professional business documents — invoices, quotations, receipts and more.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-inner" style={{ padding: '48px 4%' }}>
        <div className="tools-grid">
          {TOOLS.map(({ slug, title, desc, available }) => (
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
