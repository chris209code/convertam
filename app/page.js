import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import { ToolIcon } from '@/components/ToolIcons';
import ToolCard from '@/components/tools/ToolCard';

const categories = [
  { key: 'Smart Converter', label: 'Smart AI Tools', desc: 'AI-powered tools for smart document processing', icon: '✦', accent: '#10B981', bg: '#ECFDF5', sectionBg: '#F8FBFF', highlight: true },
  { key: 'PDF Editor', label: 'PDF Editor', desc: 'Edit, sign, annotate and manage your PDFs', icon: '✍️', accent: '#2563EB', bg: '#EFF6FF', sectionBg: '#FFFFFF' },
  { key: 'PDF Utilities', label: 'PDF Utilities', desc: 'Organize, edit and optimize your PDF documents', icon: '📄', accent: '#8B5CF6', bg: '#F5F3FF', sectionBg: '#FBFCFE' },
  { key: 'Image Tools', label: 'Image Tools', desc: 'Convert and optimize image files', icon: '🖼️', accent: '#F59E0B', bg: '#FFFBEB', sectionBg: '#FFFFFF' },
  { key: 'Document Conversion', label: 'Document Conversion', desc: 'Convert between documents and formats', icon: '🔄', accent: '#2563EB', bg: '#EFF6FF', sectionBg: '#F8FBFF' },
];

const isFreeMode = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder',
   'watermark', 'invoice', 'remove-pages', 'add-page-numbers',
   'protect-pdf', 'html-to-pdf', 'ocr-pdf', 'summarize', 'fill'].includes(mode);

function AdSlot({ id }) {
  return <div id={id} style={{ minHeight: 0, overflow: 'hidden' }} />;
}

export default function HomePage() {
  return (
    <main style={{ background: 'linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 35%, #F8FAFC 100%)' }}>

      {/* ── HERO ── */}
      <section style={{ background: '#F8FBFF', borderBottom: '1px solid #E6EDF5', padding: '72px 0 80px' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center' }}>

            {/* Left */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600,
                background: 'rgba(37,99,235,0.08)', color: '#2563EB',
                border: '1px solid rgba(37,99,235,0.2)', marginBottom: '28px',
              }}>
                🛡️ 100% Free • No Sign-up Required
              </div>

              <h1 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', color: '#0F172A', marginBottom: '20px' }}>
                Convert any file.<br />
                <span style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Instantly.
                </span>
              </h1>

              <p style={{ fontSize: '1.1rem', color: '#64748B', lineHeight: 1.7, maxWidth: '440px', marginBottom: '36px' }}>
                Fast, secure PDF and document conversion. No login, no watermarks, no stress. Your files stay private.
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '32px' }}>
                <Link href="#tools" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '14px 28px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 700,
                  color: 'white', textDecoration: 'none',
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  boxShadow: '0 10px 24px rgba(37,99,235,0.25)',
                }}>🚀 Start Converting</Link>
                <Link href="#ai-tools" style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '14px 28px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 600,
                  color: '#2563EB', textDecoration: 'none',
                  background: 'white', border: '1.5px solid #2563EB',
                  boxShadow: '0 2px 8px rgba(37,99,235,0.1)',
                }}>✦ Try AI Tools</Link>
              </div>

              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {[{ icon: '⚡', text: 'Instant conversion' }, { icon: '🔒', text: 'Files never stored' }, { icon: '👤', text: 'No account needed' }].map(({ icon, text }) => (
                  <span key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 500, color: '#64748B' }}>
                    {icon} {text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — illustration, no border no box */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero.png" alt="Convertam file conversion"
                style={{ width: '100%', maxWidth: '560px', height: 'auto', objectFit: 'contain', display: 'block' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '40px 40px 0' }}>
        <div style={{
          background: 'white', border: '1px solid #E5E7EB',
          borderRadius: '18px', boxShadow: '0 8px 30px rgba(2,6,23,0.05)',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {[
            { value: '25+', label: 'Free Tools Available', icon: '🛠️', bg: '#EFF6FF' },
            { value: '100%', label: 'Free Core Features', icon: '✅', bg: '#ECFDF5' },
            { value: 'No Login', label: 'Ever Required', icon: '👤', bg: '#F5F3FF' },
            { value: 'Auto', label: 'Files Deleted After Use', icon: '🗑️', bg: '#FFFBEB' },
          ].map(({ value, label, icon, bg }, i) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '24px 28px',
              borderLeft: i > 0 ? '1px solid #E5E7EB' : 'none',
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

      {/* ── TOOLS ── */}
      <div id="tools" style={{ maxWidth: '1152px', margin: '0 auto', padding: '48px 40px 64px' }}>
        {categories.map(({ key, label, desc, icon, accent, bg, sectionBg, highlight }, catIdx) => {
          const items = tools.filter(t => t.category === key);
          if (!items.length) return null;
          const isAI = highlight;

          return (
            <section key={key} id={isAI ? 'ai-tools' : undefined} style={{ marginBottom: '40px' }}>

              {/* Section header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', marginBottom: '20px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                  <span style={{ color: accent }}>{icon}</span>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{label}</h2>
                    {isAI && <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#ECFDF5', color: '#10B981' }}>NEW</span>}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>{desc}</p>
                </div>
              </div>

              {/* Cards — alternating section background */}
              <div style={{ background: sectionBg, borderRadius: '16px', padding: '16px', border: '1px solid #E5E7EB' }}>
                {isAI ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {items.map(t => (
                      <Link key={t.slug} href={`/${t.slug}`}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                          borderRadius: '12px', border: '1px solid #A7F3D0',
                          background: 'white', textDecoration: 'none',
                          boxShadow: '0 1px 4px rgba(16,185,129,0.08)',
                          transition: 'all 0.2s',
                        }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <ToolIcon slug={t.slug} size={22} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>{t.title}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</div>
                        </div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '4px 10px', borderRadius: '99px', background: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0', flexShrink: 0 }}>
                          ✦ AI · FREE
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {items.map(t => (
                      <ToolCard key={t.slug} slug={t.slug} title={t.title} mode={t.mode} bg={bg} isFree={isFreeMode(t.mode)} />
                    ))}
                  </div>
                )}
              </div>

              {catIdx === 0 && <AdSlot id="ad-slot-1" />}
            </section>
          );
        })}
      </div>

      {/* ── WHY CONVERTAM ── */}
      <section style={{ background: 'white', borderTop: '1px solid #E2E8F0', padding: '64px 0' }}>
        <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 40px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', color: '#0F172A', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Why Choose Convertam?
          </h2>
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.9rem', marginBottom: '48px' }}>
            Built for people who just need it done. Fast.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Conversions in seconds, not minutes.', bg: '#FFFBEB' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files deleted immediately after conversion.', bg: '#ECFDF5' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go. No account needed.', bg: '#F5F3FF' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Any device. Any browser. Any time.', bg: '#EFF6FF' },
            ].map(({ icon, title, desc, bg }) => (
              <div key={title} style={{ textAlign: 'center', padding: '28px 20px', borderRadius: '16px', background: bg, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A', marginBottom: '6px' }}>{title}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: '1152px', margin: '0 auto', padding: '0 40px' }}>
        <AdSlot id="ad-slot-2" />
      </div>

    </main>
  );
}
