import Link from 'next/link';
import JsonStudio from '../../../components/tools/data-tools/JsonStudio';
import { LeaderboardAd, ResponsiveAd } from '@/components/ads/AdSlot';

export const metadata = {
  title: 'JSON Studio — Format, Validate & Transform JSON Online | Convertam',
  description: 'A complete JSON workspace — format, validate, view as a tree, search, compare two documents, transform (sort keys, remove nulls, dedupe) and convert to CSV/XML/Text. Free, no login, 100% private.',
  alternates: { canonical: '/data-tools/json-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'JSON Studio',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based JSON workspace — format, validate with precise error locations, view as a tree, search keys/values, compare two documents, transform (sort keys, remove empty/null fields, dedupe) and convert to CSV/XML/Text. Entirely client-side.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/json-studio',
};

export default function JsonStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
            <LeaderboardAd />
          </div>

          <JsonStudio />

          <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
            <ResponsiveAd />
          </div>

          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Related Tools</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/data-tools/text-cleaner" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>Text Cleaner Studio →</Link>
              <Link href="/data-tools" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>All Data Tools →</Link>
              <Link href="/pdf-tools" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>PDF Tools →</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
