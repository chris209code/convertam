import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import { ToolIcon } from '@/components/ToolIcons';
import ToolCard from '@/components/tools/ToolCard';

const categories = [
  {
    key: 'Smart Converter', label: 'Smart AI Tools',
    desc: 'AI-powered tools for smart document processing',
    icon: '✦', accent: '#10B981', bg: '#ECFDF5', highlight: true,
  },
  {
    key: 'PDF Editor', label: 'PDF Editor',
    desc: 'Edit, sign, annotate and manage your PDFs',
    icon: '✍️', accent: '#2563EB', bg: '#EFF6FF',
  },
  {
    key: 'PDF Utilities', label: 'PDF Utilities',
    desc: 'Organize, edit and optimize your PDF documents',
    icon: '📄', accent: '#8B5CF6', bg: '#F5F3FF',
  },
  {
    key: 'Image Tools', label: 'Image Tools',
    desc: 'Convert and optimize image files',
    icon: '🖼️', accent: '#F59E0B', bg: '#FFFBEB',
  },
  {
    key: 'Document Conversion', label: 'Document Conversion',
    desc: 'Convert between documents and formats',
    icon: '🔄', accent: '#2563EB', bg: '#EFF6FF',
  },
];

const isFreeMode = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder',
   'watermark', 'invoice', 'remove-pages', 'add-page-numbers',
   'protect-pdf', 'html-to-pdf', 'ocr-pdf', 'summarize', 'fill'].includes(mode);

function AdSlot({ id }) {
  return (
    <div id={id} style={{ minHeight: 0, overflow: 'hidden' }}>
      {/* AdSense — collapses when empty */}
    </div>
  );
}

export default function HomePage() {
  return (
    <main style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #F8FAFF 40%, #ffffff 100%)' }}>

      {/* ── HERO ── */}
      <section style={{ position: 'relative', overflow: 'hidden', paddingBottom: '60px' }}>
        {/* Soft wave blobs */}
        <div style={{
          position: 'absolute', bottom: '-40px', left: '-80px', width: '420px', height: '420px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-60px', right: '-60px', width: '500px', height: '500px',
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="max-w-6xl mx-auto px-5 md:px-10 pt-14 md:pt-20" style={{ position: 'relative', zIndex: 1 }}>
          <div className="grid md:grid-cols-2 gap-10 items-center">

            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-7"
                style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)' }}>
                🛡️ 100% Free • No Sign-up Required
              </div>

              <h1 className="font-bold leading-tight mb-4"
                style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)', letterSpacing: '-0.02em', color: '#0F172A' }}>
                Convert any file.<br />
                <span style={{
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>Instantly.</span>
              </h1>

              <p className="mb-9 leading-relaxed max-w-md" style={{ fontSize: '1.05rem', color: '#64748B' }}>
                Fast, secure PDF and document conversion. No login, no watermarks, no stress. Your files stay private.
              </p>

              <div className="flex flex-wrap gap-3 mb-9">
                <Link href="#tools"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 14px rgba(37,99,235,0.4)' }}>
                  🚀 Start Converting
                </Link>
                <Link href="#ai-tools"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'white', color: '#2563EB', border: '1.5px solid #2563EB', boxShadow: '0 2px 8px rgba(37,99,235,0.12)' }}>
                  ✦ Try AI Tools
                </Link>
              </div>

              <div className="flex flex-wrap gap-6">
                {[
                  { icon: '⚡', text: 'Instant conversion' },
                  { icon: '🔒', text: 'Files never stored' },
                  { icon: '👤', text: 'No account needed' },
                ].map(({ icon, text }) => (
                  <span key={text} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#64748B' }}>
                    {icon} {text}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — illustration, no box */}
            <div className="flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero.png" alt="Convertam file conversion"
                style={{ width: '100%', maxWidth: '560px', height: 'auto', objectFit: 'contain', display: 'block' }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="max-w-6xl mx-auto px-5 md:px-10 py-10">
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'white', border: '1px solid #E2E8F0', boxShadow: '0 8px 30px rgba(2,6,23,0.06)' }}>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { value: '25+', label: 'Free Tools Available', icon: '🛠️', bg: '#EFF6FF' },
              { value: '100%', label: 'Free Core Features', icon: '✅', bg: '#ECFDF5' },
              { value: 'No Login', label: 'Ever Required', icon: '👤', bg: '#F5F3FF' },
              { value: 'Auto', label: 'Files Deleted After Use', icon: '🗑️', bg: '#FFFBEB' },
            ].map(({ value, label, icon, bg }, i) => (
              <div key={label} className="flex items-center gap-4 px-6 py-5"
                style={{ borderLeft: i > 0 ? '1px solid #E2E8F0' : 'none' }}>
                <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: bg }}>
                  {icon}
                </div>
                <div>
                  <div className="text-xl font-bold" style={{ color: '#0F172A' }}>{value}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#64748B' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TOOLS ── */}
      <div id="tools" className="max-w-6xl mx-auto px-5 md:px-10 pb-16">
        {categories.map(({ key, label, desc, icon, accent, bg, highlight }, catIdx) => {
          const items = tools.filter(t => t.category === key);
          if (!items.length) return null;
          const isAI = highlight;

          return (
            <section key={key} id={isAI ? 'ai-tools' : undefined} className="mb-10">

              {/* Category header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: bg }}>
                  <span style={{ color: accent }}>{icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold" style={{ color: '#0F172A' }}>{label}</h2>
                    {isAI && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#ECFDF5', color: '#10B981' }}>NEW</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#64748B' }}>{desc}</p>
                </div>
              </div>

              {/* Cards container */}
              <div className="rounded-2xl overflow-hidden"
                style={{ background: '#F8FAFF', border: '1px solid #E2E8F0', padding: '16px' }}>

                {isAI ? (
                  <div className="grid md:grid-cols-2 gap-3">
                    {items.map(t => (
                      <Link key={t.slug} href={`/${t.slug}`}
                        className="flex items-center gap-4 p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
                        style={{ background: 'white', borderColor: '#A7F3D0', boxShadow: '0 1px 4px rgba(16,185,129,0.08)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: '#ECFDF5' }}>
                          <ToolIcon slug={t.slug} size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm" style={{ color: '#0F172A' }}>{t.title}</div>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {items.map(t => (
                      <ToolCard
                        key={t.slug}
                        slug={t.slug}
                        title={t.title}
                        mode={t.mode}
                        bg={bg}
                        accent={accent}
                        isFree={isFreeMode(t.mode)}
                      />
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
      <section style={{ background: 'white', borderTop: '1px solid #E2E8F0' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-3" style={{ color: '#0F172A', letterSpacing: '-0.01em' }}>
            Why Choose Convertam?
          </h2>
          <p className="text-sm text-center mb-12" style={{ color: '#64748B' }}>
            Built for people who just need it done. Fast.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Conversions in seconds, not minutes.', bg: '#FFFBEB' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files deleted immediately after conversion.', bg: '#ECFDF5' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go. No account needed.', bg: '#F5F3FF' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Any device. Any browser. Any time.', bg: '#EFF6FF' },
            ].map(({ icon, title, desc, bg }) => (
              <div key={title} className="text-center p-6 rounded-2xl border"
                style={{ background: bg, borderColor: '#E2E8F0' }}>
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-semibold text-sm mb-1.5" style={{ color: '#0F172A' }}>{title}</div>
                <div className="text-xs leading-relaxed" style={{ color: '#64748B' }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <AdSlot id="ad-slot-2" />
      </div>

    </main>
  );
}
