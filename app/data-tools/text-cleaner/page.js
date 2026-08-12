import Link from 'next/link';
import TextCleanerStudio from '../../../components/tools/data-tools/TextCleanerStudio';

export const metadata = {
  title: 'Text Cleaner Studio — Free Online Text Editor | Convertam',
  description: 'Clean, format and analyse text instantly — remove blank lines, duplicates and extra spaces, change case, sort lines, find & replace, and more. Free, no login, 100% private.',
  alternates: { canonical: '/data-tools/text-cleaner' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Text Cleaner Studio',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based text cleaning and analysis studio — remove blank lines and duplicates, change case, sort lines, strip punctuation/HTML/URLs, find & replace, and view live text statistics. Entirely client-side.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/text-cleaner',
};

export default function TextCleanerPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>
          <TextCleanerStudio />

          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Related Tools</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/text-case-converter" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>Text Case Converter →</Link>
              <Link href="/data-tools" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>All Data Tools →</Link>
              <Link href="/pdf-tools" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>PDF Tools →</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
