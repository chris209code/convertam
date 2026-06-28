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
  return (
    <div id={id} style={{
      width: '100%', height: '120px', margin: '32px 0',
      background: '#F8FAFC', border: '1px dashed #CBD5E1',
      borderRadius: '18px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '0.75rem', color: '#94A3B8',
      fontWeight: 500, letterSpacing: '0.05em',
    }}>
      Advertisement
    </div>
  );
}

export default function HomePage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── HERO — full browser width ── */}
      <section style={{
        width: '100%',
        backgroundImage: 'url(/hero.png)',
        backgroundSize: '100% auto',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        minHeight: '620px',
        display: 'flex',
        alignItems: 'center',
      }}>
        {/* Inner content max-width */}
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 48px', width: '100%' }}>
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
            <h1 style={{ fontSize: 'clamp(2.4rem, 4vw, 3.4rem)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#0A1628', marginBottom: '20px' }}>
              Convert{' '}
              <span style={{ color: '#2563EB' }}>any file.</span>
              <br />Instantly. Securely.
            </h1>
            <p style={{ fontSize: '1.05rem', color: '#1e3a6e', lineHeight: 1.7, marginBottom: '32px', maxWidth: '420px' }}>
              Convert PDFs, images, documents, and more in seconds. 100% free, private, and secure.
            </p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '36px' }}>
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
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
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

      {/* ── STATS — full browser width background ── */}
      <section style={{ width: '100%', background: 'linear-gradient(180deg, #F8FBFF 0%, #F3F8FF 100%)', padding: '0 0 48px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E5EDF8',
            borderRadius: '28px', boxShadow: '0 15px 45px rgba(30,64,175,0.06)',
            marginTop: '-30px', position: 'relative', zIndex: 5,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
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

      {/* ── TOOLS — full browser width background ── */}
      <section id="tools" style={{ width: '100%', background: 'linear-gradient(180deg, #F3F8FF 0%, #EEF5FF 100%)', padding: '48px 0 80px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
          {categories.map(({ key, label, desc, icon, accent, bg, highlight }, catIdx) => {
            const items = tools.filter(t => t.category === key);
            if (!items.length) return null;
            const isAI = highlight;

            return (
              <div key={key} id={isAI ? 'ai-tools' : undefined} style={{
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
                  <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '16px' }}>
                    {items.map(t => (
                      <AIToolCard key={t.slug} slug={t.slug} title={t.title} description={t.description} />
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '12px' }}>
                    {items.map(t => (
                      <ToolCard key={t.slug} slug={t.slug} title={t.title} mode={t.mode} bg={bg} isFree={isFreeMode(t.mode)} />
                    ))}
                  </div>
                )}

                {catIdx === 0 && <AdSlot id="ad-slot-1" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── WHY CONVERTAM — full browser width ── */}
      <section style={{ width: '100%', background: '#FFFFFF', borderTop: '1px solid #E5EDF8', padding: '72px 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, textAlign: 'center', color: '#152238', marginBottom: '8px', letterSpacing: '-0.01em' }}>
            Why Choose Convertam?
          </h2>
          <p style={{ textAlign: 'center', color: '#64748B', fontSize: '0.95rem', marginBottom: '48px' }}>
            Built for people who just need it done. Fast.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Conversions in seconds, not minutes.', bg: '#FFFBEB' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files deleted immediately after conversion.', bg: '#ECFDF5' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go. No account needed.', bg: '#F5F3FF' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Any device. Any browser. Any time.', bg: '#EFF6FF' },
            ].map(({ icon, title, desc, bg }) => (
              <div key={title} style={{ textAlign: 'center', padding: '32px 20px', borderRadius: '20px', background: bg, border: '1px solid #E5EDF8' }}>
                <div style={{ fontSize: '2.2rem', marginBottom: '14px' }}>{icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#152238', marginBottom: '8px' }}>{title}</div>
                <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AD SLOT */}
      <section style={{ width: '100%', background: '#EEF5FF', padding: '32px 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }}>
          <AdSlot id="ad-slot-2" />
        </div>
      </section>

    </main>
  );
}
