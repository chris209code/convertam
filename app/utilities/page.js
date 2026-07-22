import Link from 'next/link';
import { CategoryIcon } from '@/components/icons/ToolIconSystem';

export const metadata = {
  title: 'Utilities — Convertam',
  description: 'Free utility tools. QR code generator, Password Studio, word counter and more. No login required.',
};

export default function UtilitiesPage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
      `}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#475569', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <CategoryIcon suite="utilities" size={46} />
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>Utilities</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>Handy tools for everyday tasks.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-inner" style={{ padding: '48px 4%', textAlign: 'center' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 560, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <CategoryIcon suite="utilities" size={56} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Utilities Hub</h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
            QR Code Studio, Password Studio, Word Counter, Text Case Converter — all in one place.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/password-generator" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#2563EB', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              Open Password Studio →
            </Link>
            <Link href="/utilities-hub" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#475569', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
              Open Utilities Hub →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
