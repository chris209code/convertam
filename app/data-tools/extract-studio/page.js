import Link from 'next/link';
import ExtractStudio from '../../../components/tools/data-tools/ExtractStudio';
import { LeaderboardAd, ResponsiveAd } from '@/components/ads/AdSlot';

export const metadata = {
  title: 'Extract Studio — Extract Emails, Phone Numbers, URLs & More | Convertam',
  description: 'A complete text extraction workspace — pull emails, phone numbers, URLs, domains, IPs, numbers, currency, dates, hashtags and more from any text. Chain extractors into a pipeline. Free, no login, 100% private.',
  alternates: { canonical: '/data-tools/extract-studio' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Extract Studio',
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any (runs in browser)',
  description: 'A browser-based text extraction workspace — run multiple extractors (emails, phone numbers, URLs, domains, IP addresses, numbers, currency values, dates, times, postal codes, hashtags, mentions, social links) simultaneously, filter and sort each result set, chain operations into a pipeline, and export to TXT/CSV/JSON. Entirely client-side.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: 'https://www.convertam.app/data-tools/extract-studio',
};

export default function ExtractStudioPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #ECFEFF 0%, #F8FEFF 100%)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 4% 64px' }}>
          <Link href="/data-tools" style={{ fontSize: '0.8rem', color: '#0E7490', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Data Tools</Link>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
            <LeaderboardAd />
          </div>

          <ExtractStudio />

          <div style={{ display: 'flex', justifyContent: 'center', margin: '24px 0' }}>
            <ResponsiveAd />
          </div>

          <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E8F0' }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Related Tools</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/data-tools/json-studio" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>JSON Studio →</Link>
              <Link href="/data-tools/text-cleaner" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>Text Cleaner Studio →</Link>
              <Link href="/data-tools" style={{ fontSize: '0.85rem', fontWeight: 600, padding: '8px 16px', borderRadius: 10, border: '1px solid #E2E8F0', color: '#0F172A', textDecoration: 'none', background: '#fff' }}>All Data Tools →</Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
