import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import { ToolIcon } from '@/components/ToolIcons';

// ─── Categories ───────────────────────────────────────────────────────────────
const categories = [
  { key: 'Smart Converter', label: 'Smart AI Tools', icon: '✦', highlight: true },
  { key: 'PDF Editor', label: 'PDF Editor', icon: '✍️' },
  { key: 'PDF Utilities', label: 'PDF Utilities', icon: '📄' },
  { key: 'Image Tools', label: 'Image Tools', icon: '🖼️' },
  { key: 'Document Conversion', label: 'Document Conversion', icon: '🔄' },
];

const isFree = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder',
   'watermark', 'invoice', 'remove-pages', 'add-page-numbers',
   'protect-pdf', 'html-to-pdf', 'ocr-pdf', 'summarize', 'fill'].includes(mode);

function ToolBadge({ mode }) {
  if (isFree(mode)) return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
      style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>FREE</span>
  );
  return null;
}

// Production-ready ad slot — collapses automatically when no ad is served
function AdSlot({ id }) {
  return (
    <div id={id} className="w-full overflow-hidden" style={{ minHeight: 0 }}>
      {/*
        ADSENSE SLOT — replace this comment with your AdSense tag when ready:

        <ins className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
          data-ad-slot="XXXXXXXXXX"
          data-ad-format="auto"
          data-full-width-responsive="true" />

        AdSense collapses this container to zero height automatically
        when no ad is available. Users never see empty space.
      */}
    </div>
  );
}

export default function HomePage() {
  const allTools = tools;

  return (
    <main className="bg-white min-h-screen">

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pt-16 pb-12 md:pt-20 md:pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">

          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
              style={{ background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.2)' }}>
              🔒 100% Free · No Sign-up Required
            </div>

            <h1 className="text-4xl md:text-[3.25rem] font-bold text-gray-900 leading-tight mb-5"
              style={{ letterSpacing: '-0.02em' }}>
              Convert any file.<br />
              <span style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Instantly.
              </span>
            </h1>

            <p className="text-lg text-gray-500 mb-10 leading-relaxed max-w-md">
              Fast, secure PDF and document conversion. No login, no watermarks, no stress. Your files stay private.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link href="#tools"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                  boxShadow: '0 4px 14px rgba(14,165,233,0.4)',
                }}>
                🚀 Start Converting
              </Link>
              <Link href="#ai-tools"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 border border-gray-200">
                ✦ Try AI Tools
              </Link>
            </div>

            <div className="flex flex-wrap gap-5">
              {[
                { icon: '⚡', text: 'Instant conversion' },
                { icon: '🔒', text: 'Files never stored' },
                { icon: '💳', text: 'No account needed' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — hero.png has white background, no checkerboard */}
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero.png"
              alt="Convertam — convert any file format"
              className="w-full"
              style={{ maxWidth: '540px' }}
            />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '25+', label: 'Free Tools Available' },
              { value: '100%', label: 'Free Core Features' },
              { value: 'No Login', label: 'Ever Required' },
              { value: 'Auto', label: 'Files Deleted After Use' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{value}</div>
                <div className="text-xs text-gray-500 font-medium leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS ── */}
      <div id="tools" className="max-w-6xl mx-auto px-5 md:px-10 py-14">
        {categories.map(({ key, label, icon, highlight }, catIdx) => {
          const items = allTools.filter(t => t.category === key);
          if (items.length === 0) return null;
          const isAI = highlight;

          return (
            <section key={key} id={isAI ? 'ai-tools' : undefined} className="mb-14">

              <div className="flex items-center gap-3 mb-6">
                <span className="text-lg">{icon}</span>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">{label}</h2>
                {isAI && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>NEW</span>
                )}
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {isAI ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map(t => (
                    <Link key={t.slug} href={`/${t.slug}`}
                      className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
                      style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', borderColor: '#bae6fd' }}>
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'white', boxShadow: '0 2px 8px rgba(14,165,233,0.15)' }}>
                        <ToolIcon slug={t.slug} size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900 text-sm">{t.title}</div>
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{t.description}</div>
                      </div>
                      <span className="text-[9px] font-bold px-2 py-1 rounded-full flex-shrink-0"
                        style={{ background: 'rgba(14,165,233,0.15)', color: '#0ea5e9' }}>
                        ✦ AI · FREE
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                /* Tool cards with light gray background to stand out from white page */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map(t => (
                    <Link key={t.slug} href={`/${t.slug}`}
                      className="flex items-center gap-3 p-3.5 rounded-xl border transition-all hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5"
                      style={{
                        background: '#f8fafc',
                        borderColor: '#e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}>
                      <div className="flex-shrink-0">
                        <ToolIcon slug={t.slug} size={20} />
                      </div>
                      <span className="text-sm font-medium text-gray-800 flex-1 leading-tight">{t.title}</span>
                      <ToolBadge mode={t.mode} />
                    </Link>
                  ))}
                </div>
              )}

              {/* Ad slot after Smart AI Tools only */}
              {catIdx === 0 && <AdSlot id="ad-slot-1" />}
            </section>
          );
        })}
      </div>

      {/* ── WHY CONVERTAM ── */}
      <section className="bg-white border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3 text-center"
            style={{ letterSpacing: '-0.01em' }}>
            Why Choose Convertam?
          </h2>
          <p className="text-gray-500 text-sm text-center mb-12">
            Built for people who just need it done. Fast.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Conversions complete in seconds, not minutes.' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files deleted immediately after conversion.' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go. No account ever needed.' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Any device. Any browser. Any time.' },
            ].map(({ icon, title, desc }) => (
              <div key={title}
                className="text-center p-6 rounded-2xl border transition-all hover:border-blue-100 hover:shadow-sm"
                style={{ background: '#f8fafc', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-semibold text-gray-900 text-sm mb-2">{title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AD SLOT 2 — above footer ── */}
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <AdSlot id="ad-slot-2" />
      </div>

    </main>
  );
}
