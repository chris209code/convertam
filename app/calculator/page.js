'use client';
import Link from 'next/link';

const POPULAR_TOOLS = [
  { slug: 'pdf-to-word', icon: '📄', title: 'PDF to Word' },
  { slug: 'invoice-generator', icon: '🧾', title: 'Invoice Generator' },
  { slug: 'compress-pdf', icon: '🗜️', title: 'Compress PDF' },
  { slug: 'ocr-pdf', icon: '🤖', title: 'OCR PDF' },
  { slug: 'merge-pdf', icon: '🔗', title: 'Merge PDF' },
  { slug: 'sign-pdf', icon: '✍️', title: 'Sign PDF' },
];

const CATEGORIES = [
  {
    slug: 'pdf-tools',
    icon: '📄',
    title: 'PDF Tools',
    desc: 'Convert, edit, merge, split, compress and secure your PDFs',
    color: '#2563EB',
    bg: '#EFF6FF',
    border: '#BFDBFE',
    count: 14,
  },
  {
    slug: 'business',
    icon: '🧾',
    title: 'Business Tools',
    desc: 'Invoices, quotations, receipts, ID cards and more',
    color: '#059669',
    bg: '#ECFDF5',
    border: '#A7F3D0',
    count: 1,
  },
  {
    slug: 'ai-tools',
    icon: '🤖',
    title: 'AI Tools',
    desc: 'AI-powered summarization, OCR, CV improvement and more',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    count: 4,
  },
  {
    slug: 'image-tools',
    icon: '🖼️',
    title: 'Image Tools',
    desc: 'Convert, resize, compress and edit images',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    count: 4,
  },
  {
    slug: 'calculator',
    icon: '🧮',
    title: 'Calculators',
    desc: 'VAT, loan, salary, BMI and more calculators',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
    count: 0,
  },
  {
    slug: 'utilities',
    icon: '⚙️',
    title: 'Utilities',
    desc: 'QR codes, password generator, word counter and more',
    color: '#475569',
    bg: '#F8FAFC',
    border: '#E2E8F0',
    count: 0,
  },
];

export default function HomePage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        .hero-section {
          width: 100%;
          position: relative;
          min-height: 580px;
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #1E40AF 100%);
        }
        .hero-inner { width: 100%; padding: 80px 4%; position: relative; z-index: 2; text-align: center; }
        .search-bar {
          display: flex; align-items: center; gap: 0;
          max-width: 600px; margin: 0 auto 40px;
          background: white; border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.2);
          overflow: hidden; text-decoration: none;
        }
        .search-input {
          flex: 1; padding: 16px 20px;
          font-size: 1rem; color: #94A3B8;
          display: flex; align-items: center;
          text-decoration: none;
        }
        .search-btn {
          padding: 16px 24px; background: #2563EB;
          color: white; font-size: 0.95rem; font-weight: 600;
          white-space: nowrap; text-decoration: none;
        }
        .search-btn:hover { background: #1D4ED8; }
        .popular-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          max-width: 900px;
          margin: 0 auto;
        }
        .popular-card {
          display: flex; flex-direction: column; align-items: center;
          gap: 8px; padding: 16px 8px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 16px; text-decoration: none;
          transition: all 0.2s ease;
        }
        .popular-card:hover {
          background: rgba(255,255,255,0.15);
          transform: translateY(-2px);
        }
        .popular-icon { font-size: 1.8rem; }
        .popular-title { font-size: 0.72rem; font-weight: 600; color: white; text-align: center; line-height: 1.3; }
        .stats-inner { width: 100%; padding: 0 4%; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
        .categories-inner { width: 100%; padding: 0 4%; }
        .categories-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .category-card {
          display: flex; flex-direction: column;
          padding: 28px; border-radius: 24px;
          text-decoration: none;
          transition: all 0.25s ease;
          border: 1px solid;
        }
        .category-card:hover { transform: translateY(-4px); box-shadow: 0 20px 48px rgba(0,0,0,0.1); }
        .category-icon { font-size: 2.5rem; margin-bottom: 16px; }
        .category-title { font-size: 1.1rem; font-weight: 700; color: #152238; margin-bottom: 8px; }
        .category-desc { font-size: 0.82rem; color: #64748B; line-height: 1.5; flex: 1; }
        .category-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; }
        .category-count { font-size: 0.75rem; font-weight: 600; }
        .category-arrow { font-size: 1rem; }

        @media (max-width: 768px) {
          .hero-inner { padding: 60px 5%; }
          .popular-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .stats-inner { padding: 0 5%; }
          .categories-inner { padding: 0 5%; }
          .categories-grid { grid-template-columns: 1fr; gap: 16px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-grid > div { border-left: none !important; border-top: 1px solid #E5EDF8; padding: 20px 16px; }
          .stats-grid > div:nth-child(2) { border-left: 1px solid #E5EDF8 !important; }
        }

        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr; }
          .stats-grid > div { border-left: none !important; border-top: 1px solid #E5EDF8; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-inner">
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: '99px',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            marginBottom: '24px',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>100% Free Forever</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'white', marginBottom: '16px',
          }}>
            One platform.<br />
            <span style={{ color: '#60A5FA' }}>Endless productivity.</span>
          </h1>

          <p style={{
            fontSize: 'clamp(0.95rem, 2vw, 1.1rem)',
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 1.7,
            maxWidth: '560px', margin: '0 auto 40px',
          }}>
            Powerful tools for PDFs, AI-powered features, images, documents, and business essentials.
          </p>

          {/* Search bar — links to categories */}
          <div className="search-bar">
            <Link href="#categories-section" className="search-input">
              🔍 Search for a tool — try &apos;invoice&apos;, &apos;compress&apos;, &apos;OCR&apos;...
            </Link>
            <Link href="#categories-section" className="search-btn">
              Explore Tools
            </Link>
          </div>

          {/* Popular tools */}
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Popular Tools
          </p>
          <div className="popular-grid">
            {POPULAR_TOOLS.map(({ slug, icon, title }) => (
              <Link key={slug} href={`/${slug}`} className="popular-card">
                <span className="popular-icon">{icon}</span>
                <span className="popular-title">{title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ width: '100%', background: 'linear-gradient(180deg, #F8FBFF 0%, #F3F8FF 100%)', padding: '0 0 48px' }}>
        <div className="stats-inner">
          <div className="stats-grid" style={{
            background: '#FFFFFF', border: '1px solid #E5EDF8',
            borderRadius: '28px', boxShadow: '0 15px 45px rgba(30,64,175,0.06)',
            marginTop: '-30px', position: 'relative', zIndex: 5,
          }}>
            {[
              { value: '25+', label: 'Free Tools Available', icon: '🛠️', bg: '#EFF6FF' },
              { value: '100%', label: 'Free Core Features', icon: '✅', bg: '#ECFDF5' },
              { value: 'No Login', label: 'Ever Required', icon: '👤', bg: '#F5F3FF' },
              { value: 'Auto', label: 'Files Deleted After Use', icon: '🗑️', bg: '#FFFBEB' },
            ].map(({ value, label, icon, bg }, i) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '16px', padding: '24px',
                borderLeft: i > 0 ? '1px solid #E5EDF8' : 'none',
              }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section id="categories-section" style={{ width: '100%', background: 'linear-gradient(180deg, #F3F8FF 0%, #EEF5FF 100%)', padding: '60px 0 80px' }}>
        <div className="categories-inner">
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', fontWeight: 800, textAlign: 'center', color: '#152238', marginBottom: '8px' }}>
            Browse by Category
          </h2>
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.95rem', marginBottom: '48px' }}>
            Everything you need to work smarter — in one place.
          </p>

          <div className="categories-grid">
            {CATEGORIES.map(({ slug, icon, title, desc, color, bg, border, count }) => (
              <Link key={slug} href={`/${slug}`} className="category-card" style={{ background: bg, borderColor: border }}>
                <div className="category-icon">{icon}</div>
                <div className="category-title">{title}</div>
                <div className="category-desc">{desc}</div>
                <div className="category-footer">
                  <span className="category-count" style={{ color }}>
                    {count > 0 ? `${count} tools` : 'Coming soon'}
                  </span>
                  <span className="category-arrow" style={{ color }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY CONVERTAM ── */}
      <section style={{ width: '100%', background: '#FFFFFF', borderTop: '1px solid #E5EDF8', padding: '60px 0' }}>
        <div style={{ width: '100%', padding: '0 4%' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', fontWeight: 800, textAlign: 'center', color: '#152238', marginBottom: '8px' }}>
            Why Choose Convertam?
          </h2>
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.95rem', marginBottom: '40px' }}>
            Built out of frustration. Made for everyone.{' '}
            <Link href="/about" style={{ color: '#2563EB', textDecoration: 'underline' }}>Our story →</Link>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Conversions in seconds, not minutes.', bg: '#FFFBEB' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files deleted immediately after conversion.', bg: '#ECFDF5' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go. No account needed.', bg: '#F5F3FF' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Any device. Any browser. Any time.', bg: '#EFF6FF' },
            ].map(({ icon, title, desc, bg }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 20px', borderRadius: '16px', border: '1px solid #E5EDF8', background: bg }}>
                <div style={{ fontSize: '1.6rem', flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#152238', marginBottom: '2px' }}>{title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', lineHeight: 1.4 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
