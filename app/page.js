import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import { ToolIcon } from '@/components/ToolIcons';

// ─── Categories ──────────────────────────────────────────────────────────────
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

function AdPlaceholder({ id }) {
  return (
    <div id={id} className="w-full my-8 flex items-center justify-center rounded-2xl text-xs text-gray-400 font-medium"
      style={{ minHeight: 90, background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
      Advertisement
    </div>
  );
}

const stats = [
  { value: '25+', label: 'Tools Available' },
  { value: '100%', label: 'Free Core Tools' },
  { value: '0', label: 'Login Required' },
  { value: '∞', label: 'Files Deleted After Use' },
];

export default function HomePage() {
  const allTools = tools;

  return (
    <main className="bg-white min-h-screen">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100"
        style={{ backdropFilter: 'blur(8px)' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Convertam" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-6">
            <Link href="#tools" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">Tools</Link>
            <Link href="#ai-tools" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">AI Tools</Link>
            <Link href="/about" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors hidden md:block">About</Link>
            <Link href="#tools"
              className="text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pt-16 pb-12 md:pt-20 md:pb-16">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6"
              style={{ background: 'rgba(14,165,233,0.08)', color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.2)' }}>
              🔒 100% Free · No Sign-up Required
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4"
              style={{ letterSpacing: '-0.02em' }}>
              Convert any file.<br />
              <span style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Instantly.
              </span>
            </h1>
            <p className="text-lg text-gray-500 mb-8 leading-relaxed max-w-md">
              Fast, secure PDF and document conversion. No login, no watermarks, no stress. Your files stay private.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link href="#tools"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', boxShadow: '0 4px 14px rgba(14,165,233,0.35)' }}>
                🚀 Explore All Tools
              </Link>
              <Link href="#ai-tools"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-gray-700 transition-all hover:bg-gray-100 border border-gray-200">
                ✦ Try AI Tools
              </Link>
            </div>
            <div className="flex flex-wrap gap-4">
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
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero.png"
              alt="Convertam — convert any file format"
              className="w-full max-w-lg"
              style={{ filter: 'drop-shadow(0 20px 40px rgba(14,165,233,0.15))' }}
            />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y border-gray-100" style={{ background: '#f8fafc' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{value}</div>
                <div className="text-xs text-gray-500 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TOOLS ── */}
      <div id="tools" className="max-w-6xl mx-auto px-5 md:px-10 py-12">
        {categories.map(({ key, label, icon, highlight }, catIdx) => {
          const items = allTools.filter(t => t.category === key);
          if (items.length === 0) return null;
          const isAI = highlight;
          return (
            <section key={key} id={isAI ? 'ai-tools' : undefined} className="mb-12">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-lg">{icon}</span>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">{label}</h2>
                {isAI && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(14,165,233,0.1)', color: '#0ea5e9' }}>NEW</span>
                )}
                <div className="flex-1 h-px" style={{ background: '#f1f5f9' }} />
              </div>
              {isAI ? (
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map(t => (
                    <Link key={t.slug} href={`/${t.slug}`}
                      className="flex items-center gap-4 p-4 rounded-2xl border transition-all hover:-translate-y-0.5 group"
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
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {items.map(t => (
                    <Link key={t.slug} href={`/${t.slug}`}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-100 bg-white transition-all hover:border-blue-200 hover:shadow-sm hover:-translate-y-0.5 group"
                      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <div className="flex-shrink-0">
                        <ToolIcon slug={t.slug} size={20} />
                      </div>
                      <span className="text-sm font-medium text-gray-800 flex-1 leading-tight">{t.title}</span>
                      <ToolBadge mode={t.mode} />
                    </Link>
                  ))}
                </div>
              )}
              {(catIdx === 0 || catIdx === 1) && <AdPlaceholder id={`ad-slot-${catIdx + 1}`} />}
            </section>
          );
        })}
      </div>

      {/* ── WHY CONVERTAM ── */}
      <section style={{ background: '#f8fafc' }} className="border-t border-gray-100">
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-14">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Why Choose Convertam?</h2>
          <p className="text-gray-500 text-sm text-center mb-10">Built for people who just need it done. Fast.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '⚡', title: 'Lightning Fast', desc: 'Conversions in seconds, not minutes.' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files deleted immediately after conversion.' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go. No account needed.' },
              { icon: '📱', title: 'Works Everywhere', desc: 'Any device. Any browser. Any time.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-5 rounded-2xl bg-white border border-gray-100"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="text-3xl mb-3">{icon}</div>
                <div className="font-semibold text-gray-900 text-sm mb-1">{title}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AD SLOT 3 ── */}
      <div className="max-w-6xl mx-auto px-5 md:px-10">
        <AdPlaceholder id="ad-slot-3" />
      </div>

      {/* ── FOUNDER CARD ── */}
      <section className="max-w-6xl mx-auto px-5 md:px-10 pb-12">
        <div className="rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6"
          style={{ background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', border: '1px solid #bae6fd' }}>
          <div className="flex items-center gap-4 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/founder.jpg" alt="Christopher Okeke"
              className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
            <div>
              <div className="text-[10px] font-bold text-blue-500 tracking-widest mb-0.5">FOUNDER</div>
              <div className="font-bold text-gray-900">Christopher Okeke</div>
              <div className="text-xs text-gray-500">Building simple tools for a simpler you.</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-center">
            {[
              { icon: '✅', title: '100% Free', sub: 'Core tools forever' },
              { icon: '🔒', title: 'Secure', sub: 'Files never stored' },
              { icon: '⚡', title: 'Fast', sub: 'Results in seconds' },
            ].map(({ icon, title, sub }) => (
              <div key={title}>
                <div className="text-lg mb-0.5">{icon}</div>
                <div className="text-xs font-semibold text-gray-900">{title}</div>
                <div className="text-[10px] text-gray-500">{sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100" style={{ background: '#f8fafc' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-10 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Convertam" className="h-7 w-auto mb-3" />
              <p className="text-xs text-gray-500 leading-relaxed max-w-xs">
                Fast, secure file conversion for everyone. No sign-up, no limits, no stress.
              </p>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Tools</h3>
              <ul className="space-y-2">
                {['PDF to Word', 'Merge PDF', 'Compress PDF', 'JPG to PDF', 'Sign PDF'].map(name => {
                  const tool = tools.find(t => t.title === name);
                  return tool ? (
                    <li key={name}>
                      <Link href={`/${tool.slug}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                        {name}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">AI Tools</h3>
              <ul className="space-y-2">
                {tools.filter(t => t.category === 'Smart Converter').map(t => (
                  <li key={t.slug}>
                    <Link href={`/${t.slug}`} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                      {t.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-3">Company</h3>
              <ul className="space-y-2">
                {[
                  { label: 'About', href: '/about' },
                  { label: 'Privacy Policy', href: '/privacy-policy' },
                  { label: 'Contact', href: '/contact' },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} Convertam · Files processed and deleted — we don&apos;t keep copies.
            </p>
            <p className="text-xs text-gray-400">
              convertam.app is free to use. If it&apos;s useful to you,{' '}
              <a href="/support" className="underline hover:text-gray-600">support it here</a>.
            </p>
          </div>
        </div>
      </footer>

    </main>
  );
}
