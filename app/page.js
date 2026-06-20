import Link from 'next/link';
import { tools } from '@/lib/tools-config';
import HeroIllustration from '@/components/HeroIllustration';

const categories = ['Document Conversion', 'PDF Utilities', 'Image Tools', 'Smart Converter'];

export default function HomePage() {
  return (
    <main>
      <section className="max-w-4xl mx-auto px-5 md:px-10 pt-16 pb-6 text-center">
        <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-4">
          Upload. Convert am. <span className="text-stamp-amber">Download.</span>
        </h1>
        <p className="text-ink-soft max-w-lg mx-auto text-lg">
          Free file conversion. No login. No watermark. No stress.
        </p>
        <div className="mt-10">
          <HeroIllustration />
        </div>
      </section>

      {categories.map((cat) => {
        const items = tools.filter((t) => t.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="max-w-4xl mx-auto px-5 md:px-10 py-8">
            <h2 className="font-mono text-xs tracking-widest text-stamp-blue mb-4">
              {cat.toUpperCase()}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {items.map((t) => (
                <Link key={t.slug} href={`/${t.slug}`} className="tool-card">
                  <span>{t.title}</span>
                  <span className={`tool-card-badge ${t.mode === 'soon' ? 'soon' : 'live'}`}>
                    {t.mode === 'soon' ? 'SOON' : 'LIVE'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="max-w-4xl mx-auto px-5 md:px-10 py-10 text-center">
        <p className="text-sm text-ink-soft">
          Files you convert here are processed and then gone — we don&apos;t keep copies.
        </p>
      </section>
    </main>
  );
}
