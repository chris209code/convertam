import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import ToolCard from '@/components/tools/ToolCard';
import AIToolCard from '@/components/tools/AIToolCard';

const categories = [
  { key: 'Smart Converter', label: 'Smart AI Tools', desc: 'AI-powered tools for smart document processing', icon: '🤖', accent: '#10B981', bg: '#ECFDF5', highlight: true },
  { key: 'PDF Editor', label: 'PDF Editor', desc: 'Edit, sign, annotate and manage your PDFs', icon: '✍️', accent: '#2563EB', bg: '#EFF6FF' },
  { key: 'PDF Utilities', label: 'PDF Utilities', desc: 'Organize, edit and optimize your PDF documents', icon: '📄', accent: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'Image Tools', label: 'Image Tools', desc: 'Convert and optimize image files', icon: '🖼️', accent: '#F59E0B', bg: '#FFFBEB' },
  { key: 'Document Conversion', label: 'Document Conversion', desc: 'Convert between documents and formats', icon: '📑', accent: '#2563EB', bg: '#EFF6FF' },
];

const isFreeMode = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder',
   'watermark', 'invoice', 'remove-pages', 'add-page-numbers',
   'protect-pdf', 'html-to-pdf', 'ocr-pdf', 'summarize', 'fill'].includes(mode);

function AdSlot({ id }) {
  const hasAd = false;
  if (!hasAd) return null;
  return <div id={id} style={{ width: '100%', margin: '32px 0' }} />;
}

export default function HomePage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>

      <style>{`
        .hero-section {
          width: 100%;
          position: relative;
          min-height: 620px;
          display: flex;
          align-items: center;
          background-image: url(/hero.png);
          background-size: 100% auto;
          background-position: top center;
          background-repeat: no-repeat;
        }
        .hero-mobile-bg { display: none; }
        .hero-overlay { display: none; }
        .inner { max-width: 1600px; margin: 0 auto; padding: 80px 64px; width: 100%; position: relative; z-index: 2; }
        .stats-inner { max-width: 1600px; margin: 0 auto; padding: 0 64px; }
        .tools-inner { max-width: 1600px; margin: 0 auto; padding: 0 64px; }
        .why-inner { max-width: 1600px; margin: 0 auto; padding: 0 64px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
        .tools-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
        .ai-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 16px; }
        .why-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .why-card { text-align: center; padding: 32px 20px; border-radius: 20px; border: 1px solid #E5EDF8; }
        .why-icon { font-size: 2.2rem; margin-bottom: 14px; }
        .why-title { font-weight: 700; font-size: 0.95rem; color: #152238; margin-bottom: 8px; }
        .why-desc { font-size: 0.82rem; color: #64748B; line-height: 1.6; }
        .feature-badges { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 36px; }
        .cta-buttons { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }

        @media (max-width: 768px) {
          .hero-section { min-height: 520px; background-image: none !important; }
          .hero-mobile-bg {
            display: block; position: absolute; inset: 0;
            width: 100%; height: 100%; object-fit: cover;
            object-position: right center; z-index: 0;
          }
          .hero-overlay {
            display: block; position: absolute; inset: 0; z-index: 1;
            background: linear-gradient(90deg, rgba(243,247,255,0.92) 0%, rgba(243,247,255,0.72) 34%, rgba(243,247,255,0.28) 58%, rgba(243,247,255,0.08) 100%);
          }
          .inner { padding: 40px 20px; }
          .stats-inner { padding: 0 16px; }
          .tools-inner { padding: 0 16px; }
          .why-inner { padding: 0 16px; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-grid > div { border-left: none !important; border-top: 1px solid #E5EDF8; padding: 20px 16px; }
          .stats-grid > div:nth-child(2) { border-left: 1px solid #E5EDF8 !important; }
          .tools-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
          .ai-grid { grid-template-columns: minmax(0, 1fr); }
          .why-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .why-card { padding: 16px 12px; border-radius: 14px; }
          .why-icon { font-size: 1.5rem; margin-bottom: 8px; }
          .why-title { font-size: 0.82rem; margin-bottom: 4px; }
          .why-desc { font-size: 0.72rem; }
          .category-container { padding: 20px !important; border-radius: 16px !important; }
          .cta-buttons { flex-direction: column; }
          .cta-buttons a { text-align: center; justify-content: center; }
        }

        @media (max-width: 480px) {
          .tools-grid { grid-template-columns: minmax(0, 1fr); }
          .why-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-grid { grid-template-columns: 1fr; }
          .stats-grid > div { border-left: none !important; border-top: 1px solid #E5EDF8; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="hero-section">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/hero-mobile.png" alt="" className="hero-mobile-bg" aria-hidden="true" />
        <div className="hero-overlay" />
        <div className="inner">
          <div style={{ maxWidth: '520px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '7px 16px', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600,
              background: 'rgba(255,255,255,0.25)', color: '#1e3a6e',
              border: '1px solid rgba(255,255,255,0.4)', marginBottom: '28px',
              backdropFilter: 'blur(8px)',
            }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              100% Free Forever
            </div>
            <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 3.4rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0A1628', marginBottom: '20px' }}>
              Convert{' '}
              <span style={{ color: '#2563EB' }}>any file.</span>
              <br />Instantly. Securely.
            </h1>
            <p style={{ fontSize: 'clamp(0.9rem, 2vw, 1.05rem)', color: '#1e3a6e', lineHeight: 1.7, marginBottom: '32px', maxWidth: '420px' }}>
              Convert PDFs, images, documents, and more in seconds. 100% free, private, and secure.
            </p>
            <div className="feature-badges">
              {[
                { icon: '⚡', title: 'Instant', sub: 'Conversion' },
                { icon: '🔒', title: 'Private', sub: '& Secure' },
                { icon: '🛡️', title: 'No Sign-up', sub: 'Required' },
                { icon: '✦', title: '25+ Tools', sub: 'Free to Use' },
              ].map(({ icon, title, sub }) => (
                <div key={title} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 14px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.7)',
                }}>
                  <span style={{ fontSize: '1rem' }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0A1628', lineHeight: 1.1 }}>{title}</div>
                    <div style={{ fontSize: '0.68rem', color: '#3B5280', lineHeight: 1.1 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="cta-buttons">
              <Link href="#tools" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 28px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700,
                color: 'white', textDecoration: 'none', background: '#2563EB',
                boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
              }}>⬆️ Choose a file</Link>
              <Link href="#tools" style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '14px 28px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600,
                color: '#2563EB', textDecoration: 'none',
                background: 'rgba(255,255,255,0.7)', border: '1.5px solid rgba(37,99,235,0.3)',
                backdropFilter: 'blur(8px)',
              }}>🔍 Search for a tool</Link>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#3B5280' }}>or drag and drop your file here</p>
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
                display: 'flex', alignItems: 'center', gap: '16px', padding: '32px',
                borderLeft: i > 0 ? '1px solid #E5EDF8' : 'none',
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>
                  {icon}
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>{value}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '3px' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS ── */}
      <section id="tools" style={{ width: '100%', background: 'linear-gradient(180deg, #F3F8FF 0%, #EEF5FF 100%)', padding: '48px 0 80px' }}>
        <div className="tools-inner">
          {categories.map(({ key, label, desc, icon, accent, bg, highlight }, catIdx) => {
            const items = tools.filter(t => t.category === key);
            if (!items.length) return null;
            const isAI = highlight;
            return (
              <div key={key} id={isAI ? 'ai-tools' : undefined}
                className="category-container"
                style={{
                  background: '#FFFFFF', border: '1px solid #E5EDF8',
                  borderRadius: '28px', padding: '36px', marginBottom: '32px',
                  boxShadow: '0 15px 45px rgba(30,64,175,0.06)',
                }}>
                <div style={{ borderBottom: '1px solid #E6EEF9', paddingBottom: '16px', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                      <span style={{ color: accent }}>{icon}</span>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#152238', margin: 0 }}>{label}</h2>
                        {isAI && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '3px 10px', borderRadius: '99px', background: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0' }}>NEW</span>}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0' }}>{desc}</p>
                    </div>
                  </div>
                </div>
                {isAI ? (
                  <div className="ai-grid">
                    {items.map(t => (
                      <AIToolCard key={t.slug} slug={t.slug} title={t.title} description={t.description} />
                    ))}
                  </div>
                ) : (
                  <div className="tools-grid">
                    {items.map(t => (
                      <ToolCard key={t.slug} slug={t.slug} title={t.title} mode={t.mode} bg={bg} isFree={isFreeMode(t.mode)} />
                    ))}
                  </div>
                )}
                <AdSlot id={`ad-slot-${catIdx}`} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── WHY CONVERTAM ── */}
      <section style={{ width: '100%', background: '#FFFFFF', borderTop: '1px solid #E5EDF8', padding: '72px 0' }}>
        <div className="why-inner">
          <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.75rem)', fontWeight: 800, textAlign: 'center', color: '#152238', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Why Choose Convertam?
          </h2>
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.95rem', marginBottom: '48px' }}>
            Built for people who just need it done. Fast.
          </p>
          <div className="why-grid">
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Conversions in seconds, not minutes.', bg: '#FFFBEB' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files deleted immediately after conversion.', bg: '#ECFDF5' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go. No account needed.', bg: '#F5F3FF' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Any device. Any browser. Any time.', bg: '#EFF6FF' },
            ].map(({ icon, title, desc, bg }) => (
              <div key={title} className="why-card" style={{ background: bg }}>
                <div className="why-icon">{icon}</div>
                <div className="why-title">{title}</div>
                <div className="why-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
