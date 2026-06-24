import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import { ToolIcon } from '@/components/ToolIcons';

const categories = [
  { key: 'Smart Converter', label: 'Smart Converter', icon: '✦' },
  { key: 'PDF Editor', label: 'PDF Editor', icon: '✍️' },
  { key: 'PDF Utilities', label: 'PDF Utilities', icon: '📄' },
  { key: 'Image Tools', label: 'Image Tools', icon: '🖼️' },
  { key: 'Document Conversion', label: 'Document Conversion', icon: '🔄' },
];

const popularTools = [
  'pdf-to-word', 'word-to-pdf', 'merge-pdf', 'compress-pdf', 'jpg-to-pdf', 'invoice-generator'
];

const isFree = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder', 'watermark', 'invoice'].includes(mode);
const isPaid = (mode) => ['office', 'compress'].includes(mode);

function ToolBadge({ mode }) {
  if (isFree(mode)) return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(47,143,91,0.15)', color: '#2f8f5b' }}>FREE</span>
  );
  if (isPaid(mode)) return (
    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: 'rgba(226,150,44,0.15)', color: '#e2962c' }}>PAID</span>
  );
  return null;
}

export default function HomePage() {
  return (
    <main>
      {/* Banner */}
      <div className="w-full overflow-hidden" style={{ maxHeight: '140px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banner.jpg" alt="Convertam — free document toolkit" className="w-full object-cover" style={{ objectPosition: 'center 30%', maxHeight: '140px' }} />
      </div>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 md:px-10 pt-6 pb-2 text-center">
        <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight mb-3">
          Upload. Convert am. <span className="text-stamp-amber">Download.</span>
        </h1>
        <p className="text-ink-soft text-base mb-4">Convert any file. Instantly. No login.</p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[
            { num: '01', icon: '📤', label: 'Upload' },
            { num: '02', icon: '⚙️', label: 'Convert' },
            { num: '03', icon: '📥', label: 'Download' },
          ].map(({ num, icon, label }, i, arr) => (
            <div key={num} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
                <span className="font-mono text-[10px] text-stamp-amber">{num}</span>
                <span>{icon}</span>
                <span className="text-ink">{label}</span>
              </div>
              {i < arr.length - 1 && <span className="text-ink-soft text-xs">→</span>}
            </div>
          ))}
        </div>
      </section>

      {/* Why Convertam */}
      <section className="max-w-4xl mx-auto px-5 md:px-10 py-6">
        <div className="rounded-2xl p-6" style={{ background: '#fffefb', border: '1px solid #e2dcc9' }}>
          <h2 className="font-display text-lg font-bold text-ink mb-4">Why Choose Convertam?</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '⚡', title: 'Fast', desc: 'Conversions in seconds' },
              { icon: '🔒', title: 'Privacy First', desc: 'Files never stored' },
              { icon: '🚫', title: 'No Registration', desc: 'Just upload and go' },
              { icon: '💯', title: 'Mostly Free', desc: 'Most tools cost nothing' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-semibold text-ink text-sm">{title}</div>
                <div className="text-xs text-ink-soft">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Tools */}
      <section className="max-w-4xl mx-auto px-5 md:px-10 py-2">
        <h2 className="font-mono text-xs tracking-widest text-stamp-amber mb-3 flex items-center gap-2">
          <span>🔥</span> POPULAR TOOLS
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {popularTools.map(slug => {
            const t = tools.find(t => t.slug === slug);
            if (!t) return null;
            return (
              <Link key={slug} href={`/${slug}`}
                className="flex items-center gap-3 border rounded-xl px-3 py-3 transition-colors hover:border-stamp-blue"
                style={{ background: '#fffefb', borderColor: '#e2dcc9' }}>
                <ToolIcon slug={slug} size={22} />
                <span className="text-sm font-medium text-ink flex-1 leading-tight">{t.title}</span>
                <ToolBadge mode={t.mode} />
              </Link>
            );
          })}
        </div>
      </section>

      {/* All tool sections */}
      {categories.map(({ key, label, icon }) => {
        const items = tools.filter((t) => t.category === key);
        if (items.length === 0) return null;
        const isSmart = key === 'Smart Converter';
        return (
          <section key={key} className="max-w-4xl mx-auto px-5 md:px-10 py-4">
            <h2 className="font-mono text-xs tracking-widest text-stamp-blue mb-3 flex items-center gap-2">
              <span>{icon}</span><span>{label.toUpperCase()}</span>
            </h2>
            {isSmart ? (
              <div className="flex flex-col gap-2.5">
                {items.map((t) => (
                  <Link key={t.slug} href={`/${t.slug}`}
                    className="flex items-center justify-between border-2 rounded-xl px-5 py-4 transition-colors"
                    style={{ background: '#f0f5ff', borderColor: '#3a63b8' }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#f0f5ff' }}>
                        <ToolIcon slug={t.slug} size={32} />
                      </div>
                      <div>
                        <div className="font-semibold text-ink text-base">{t.title}</div>
                        <div className="text-xs text-ink-soft mt-0.5">{t.description}</div>
                      </div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ml-3" style={{ background: '#3a63b8', color: 'white' }}>✦ AI · FREE</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {items.map((t) => (
                  <Link key={t.slug} href={`/${t.slug}`}
                    className="flex items-center gap-3 border rounded-xl px-3 py-3 transition-colors hover:border-stamp-blue"
                    style={{ background: '#fffefb', borderColor: '#e2dcc9' }}>
                    <ToolIcon slug={t.slug} size={22} />
                    <span className="text-sm font-medium text-ink flex-1 leading-tight">{t.title}</span>
                    <ToolBadge mode={t.mode} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}

      <section className="max-w-4xl mx-auto px-5 md:px-10 pb-8 text-center">
        <p className="text-xs text-ink-soft">
          Files you convert here are processed and then gone — we don&apos;t keep copies.
        </p>
      </section>
    </main>
  );
}
