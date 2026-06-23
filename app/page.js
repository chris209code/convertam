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

const isFree = (mode) =>
  ['pdf-lib', 'pdf-to-image', 'smart', 'receipt', 'sign', 'reorder', 'watermark', 'invoice'].includes(mode);
const isPaid = (mode) => ['office', 'compress'].includes(mode);

function ToolBadge({ mode }) {
  if (isFree(mode)) {
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ background: 'rgba(47,143,91,0.15)', color: '#2f8f5b' }}
      >
        FREE
      </span>
    );
  }
  if (isPaid(mode)) {
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
        style={{ background: 'rgba(226,150,44,0.15)', color: '#e2962c' }}
      >
        PAID
      </span>
    );
  }
  return null;
}

export default function HomePage() {
  return (
    <main>
      {/* Banner */}
      <div className="w-full overflow-hidden" style={{ maxHeight: '220px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/banner.jpg"
          alt="File conversion banner"
          className="w-full object-cover"
          style={{ objectPosition: 'center 30%', maxHeight: '220px' }}
        />
      </div>

      {/* Hero text */}
      <section className="max-w-4xl mx-auto px-5 md:px-10 pt-8 pb-4 text-center">
        <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight mb-3">
          Upload. Convert am. <span className="text-stamp-amber">Download.</span>
        </h1>
        <p className="text-ink-soft text-base">
          Free file conversion. No login. No watermark. No stress.
        </p>
      </section>

      {/* Tool sections */}
      {categories.map(({ key, label, icon }) => {
        const items = tools.filter((t) => t.category === key);
        if (items.length === 0) return null;

        const isSmart = key === 'Smart Converter';

        return (
          <section key={key} className="max-w-4xl mx-auto px-5 md:px-10 py-4">
            <h2 className="font-mono text-xs tracking-widest text-stamp-blue mb-3 flex items-center gap-2">
              <span>{icon}</span>
              <span>{label.toUpperCase()}</span>
            </h2>

            {isSmart ? (
              <div className="flex flex-col gap-2.5">
                {items.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/${t.slug}`}
                    className="flex items-center justify-between border-2 rounded-xl px-5 py-4 transition-colors"
                    style={{ background: '#f0f5ff', borderColor: '#3a63b8' }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: '#f0f5ff' }}
                      >
                        <ToolIcon slug={t.slug} size={32} />
                      </div>
                      <div>
                        <div className="font-semibold text-ink text-base">{t.title}</div>
                        <div className="text-xs text-ink-soft mt-0.5">{t.description}</div>
                      </div>
                    </div>
                    <span
                      className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ml-3"
                      style={{ background: '#3a63b8', color: 'white' }}
                    >
                      ✦ AI · FREE
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {items.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/${t.slug}`}
                    className="flex items-center gap-3 border rounded-xl px-3 py-3 transition-colors hover:border-stamp-blue"
                    style={{ background: '#fffefb', borderColor: '#e2dcc9' }}
                  >
                    <ToolIcon slug={t.slug} size={22} />
                    <span className="text-sm font-medium text-ink flex-1 leading-tight">
                      {t.title}
                    </span>
                    <ToolBadge mode={t.mode} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* Founder section */}
      <section className="max-w-4xl mx-auto px-5 md:px-10 py-6 mt-4">
        <div
          className="rounded-2xl px-6 py-5 flex flex-col md:flex-row items-start md:items-center gap-5"
          style={{ background: '#fffefb', border: '0.5px solid #e2dcc9' }}
        >
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/founder.jpg"
              alt="Christopher Okeke, Founder of Convertam"
              className="rounded-full object-cover flex-shrink-0"
              style={{ width: '64px', height: '64px' }}
            />
            <div>
              <div
                className="font-mono text-xs font-bold tracking-widest mb-0.5"
                style={{ color: '#e2962c' }}
              >
                FOUNDER
              </div>
              <div className="font-semibold text-ink text-base">Christopher Okeke</div>
              <div className="text-xs text-ink-soft">Building simple tools for a simpler you.</div>
            </div>
          </div>

          <div className="flex gap-6 md:ml-auto flex-wrap">
            {[
              { icon: '🔒', label: 'Privacy First', sub: 'Files never stored' },
              { icon: '⚡', label: 'Fast', sub: '& Easy' },
              { icon: '📱', label: 'Works on', sub: 'Mobile & Desktop' },
            ].map(({ icon, label, sub }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <div>
                  <div className="text-xs font-semibold text-ink">{label}</div>
                  <div className="text-xs text-ink-soft">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 md:px-10 pb-8 text-center">
        <p className="text-xs text-ink-soft">
          Files you convert here are processed and then gone — we don&apos;t keep copies.
        </p>
      </section>
    </main>
  );
}
