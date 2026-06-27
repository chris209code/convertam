import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import { ToolIcon } from '@/components/ToolIcons';

const categories = [
  { key: 'Smart Converter', label: 'Smart AI Tools', desc: 'AI-powered tools for smart document processing', icon: '✦', accent: '#10B981', bg: '#ECFDF5', highlight: true },
  { key: 'PDF Editor', label: 'PDF Editor', desc: 'Edit, sign, annotate and manage your PDFs', icon: '✍️', accent: '#2563EB', bg: '#EFF6FF' },
  { key: 'PDF Utilities', label: 'PDF Utilities', desc: 'Organize, edit and optimize your PDF documents', icon: '📄', accent: '#8B5CF6', bg: '#F5F3FF' },
  { key: 'Image Tools', label: 'Image Tools', desc: 'Convert and optimize image files', icon: '🖼️', accent: '#F59E0B', bg: '#FFFBEB' },
  { key: 'Document Conversion', label: 'Document Conversion', desc: 'Convert between documents and formats', icon: '🔄', accent: '#2563EB', bg: '#EFF6FF' },
];

const isFree = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder',
   'watermark', 'invoice', 'remove-pages', 'add-page-numbers',
   'protect-pdf', 'html-to-pdf', 'ocr-pdf', 'summarize', 'fill'].includes(mode);

function AdSlot({ id }) {
  return (
    <div id={id} className="w-full overflow-hidden" style={{ minHeight: 0 }}>
      {/* AdSense slot — collapses when no ad served */}
    </div>
  );
}

export default function HomePage() {
  const allTools = tools;

  return (
    <main style={{ background: 'linear-gradient(180deg, #F8FAFF 0%, #FFFFFF 100%)' }} className="min-h-screen">

      {/* ── HERO ── */}
      <section style={{ background: '#EFF6FF', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative background blobs */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px',
          background: 'linear-gradient(180deg, transparent, #F8FAFF)',
          zIndex: 1,
        }} />
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-50px', left: '-50px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
        }} />

        <div className="max-w-6xl mx-auto px-5 md:px-10 pt-14 pb-20 md:pt-16 md:pb-24" style={{ position: 'relative', zIndex: 2 }}>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
                style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)' }}>
                🛡️ 100% Free • No Sign-up Required
              </div>

              <h1 className="font-bold text-gray-900 leading-tight mb-5"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.25rem)', letterSpacing: '-0.02em' }}>
                Convert any file.<br />
                <span style={{
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  Instantly.
                </span>
              </h1>

              <p className="text-lg mb-10 leading-relaxed max-w-md" style={{ color: '#64748B' }}>
                Fast, secure PDF and document conversion. No login, no watermarks, no stress. Your files stay private.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link href="#tools"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}>
                  🚀 Start Converting
                </Link>
                <Link href="#ai-tools"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  style={{ background: 'white', color: '#2563EB', border: '1.5px solid #2563EB', boxShadow: '0 2px 8px rgba(37,99,235,0.1)' }}>
                  ✦ Try AI Tools
                </Link>
              </div>

              <div className="flex flex-wrap gap-6">
                {[
                  { icon: '⚡', text: 'Instant conversion' },
                  { icon: '🔒', text: 'Files never stored' },
                  { icon: '👤', text: 'No account needed' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs font-medium" style={{ color: '#64748B' }}>
                    <span>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero illustration */}
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero.png" alt="Convertam — convert any file format"
                style={{ maxWidth: '540px', width: '100%', height: 'auto', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-10">
        <div className="rounded-2xl p-6 md:p-8"
          style={{ background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 10px 30px rgba(2,6,23,0.06)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-100">
            {[
              { value: '25+', label: 'Free Tools Available', icon: '🛠️', color: '#2563EB', bg: '#EFF6FF' },
              { value: '100%', label: 'Free Core Features', icon: '✅', color: '#10B981', bg: '#ECFDF5' },
              { value: 'No Login', label: 'Ever Required', icon: '👤', color: '#8B5CF6', bg: '#F5F3FF' },
              { value: 'Auto', label: 'Files Deleted After Use', icon: '🗑️', color: '#F59E0B', bg: '#FFFBEB' },
            ].map(({ value, label, icon, color, bg }, i) => (
              <div key={label} className={`text-center px-4 py-2 ${i > 0 ? 'border-l border-gray-100' : ''}`}>
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full mb-3"
                  style={{ background: bg }}>
                  <span style={{ fontSize: '1.1rem' }}>{icon}</span>
                </div>
                <div className="text-2xl font-bold mb-1" style={{ color: '#334155' }}>{value}</div>
                <div className="text-xs font-medium" style={{ color: '#64748B' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOOLS ── */}
      <div id="tools" className="max-w-6xl mx-auto px-5 md:px-10 pb-14">
        {categories.map(({ key, label, desc, icon, accent, bg, highlight }, catIdx) => {
          const items = allTools.filter(t => t.category === key);
          if (items.length === 0) return null;
          const isAI = highlight;

          return (
            <section key={key} id={isAI ? 'ai-tools' : undefined} className="mb-12">

              {/* Category header */}
              <div className="flex items-center gap-3 mb-5 pb-4"
                style={{ borderBottom: '1px solid #E2E8F0' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
                  style={{ background: bg, color: accent }}>
                  {icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold" style={{ color: '#334155' }}>{label}</h2>
                    {isAI && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#ECFDF5', color: '#10B981' }}>NEW</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>{desc}</p>
                </div>
              </div>

              {/* AI tools */}
              {isAI ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map(t => (
                    <Link key={t.slug} href={`/${t.slug}`}
                      className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:-translate-y-1"
                      style={{ background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', borderColor: '#A7F3D0', boxShadow: '0 2px 8px rgba(16,185,129,0.08)' }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'white', boxShadow: '0 2px 8px rgba(16,185,129,0.15)' }}>
                        <ToolIcon slug={t.slug} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: '#334155' }}>{t.title}</div>
                        <div className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>{t.description}</div>
                      </div>
                      <span className="text-[9px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0' }}>
                        ✦ AI · FREE
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                /* Tool cards */
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {items.map(t => {
                    const free = isFree(t.mode);
                    return (
                      <Link key={t.slug} href={`/${t.slug}`}
                        className="flex items-center gap-3 p-3.5 rounded-xl border transition-all group"
                        style={{
                          background: 'white',
                          borderColor: '#E2E8F0',
                          boxShadow: '0 2px 8px rgba(2,6,23,0.05)',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(2,6,23,0.08)';
                          e.currentTarget.style.borderColor = '#CBD5E1';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = '';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(2,6,23,0.05)';
                          e.currentTarget.style.borderColor = '#E2E8F0';
                        }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: bg }}>
                          <ToolIcon slug={t.slug} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium leading-tight" style={{ color: '#334155' }}>{t.title}</div>
                        </div>
                        {free && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: '#ECFDF5', color: '#10B981' }}>FREE</span>
                        )}
                        <span style={{ color: '#CBD5E1', fontSize: '0.75rem' }}>›</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              {catIdx === 0 && <AdSlot id="ad-slot-1" />}
            </section>
          );
        })}
      </div>

      {/* ── WHY CONVERTAM ── */}
      <section style={{ background: 'white', borderTop: '1px solid #E2E8F0' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3"
            style={{ color: '#334155', letterSpacing: '-0.01em' }}>
            Why Choose Convertam?
          </h2>
          <p className="text-sm text-center mb-12" style={{ color: '#64748B' }}>
            Built for people who just need it done. Fast.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Conversions in seconds, not minutes.', color: '#F59E0B', bg: '#FFFBEB' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files deleted immediately after conversion.', color: '#10B981', bg: '#ECFDF5' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go. No account needed.', color: '#8B5CF6', bg: '#F5F3FF' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Any device. Any browser. Any time.', color: '#2563EB', bg: '#EFF6FF' },
            ].map(({ icon, title, desc, color, bg }) => (
              <div key={title} className="text-center p-6 rounded-2xl border transition-all hover:-translate-y-1 hover:shadow-md"
                style={{ background: bg, borderColor: '#E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-semibold text-sm mb-2" style={{ color: '#334155' }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: '#64748B' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AD SLOT 2 */}
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <AdSlot id="ad-slot-2" />
      </div>

    </main>
  );
}
