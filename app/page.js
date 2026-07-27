import HomePageClient from '@/components/HomePageClient';

// The interactive homepage (search, category grid) lives in
// HomePageClient.js as a client component — this file stays a server
// component purely so it can export real page metadata, which a 'use
// client' page.js cannot do. Previously this route had no metadata export
// at all and silently inherited only the root layout's generic defaults.
export const metadata = {
  title: 'Convertam — Free File Conversion. No Login. No Watermark.',
  description:
    'Free online file conversion — PDF to Word, Word to PDF, Excel, PowerPoint, Merge PDF, Sign Documents, Invoice Generator and more. No login, no watermark, no subscription.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Convertam — Free File Conversion. No Login. No Watermark.',
    description: 'Free online file conversion tools. PDF, Word, Excel, PowerPoint, images and more. No login required.',
    url: 'https://www.convertam.app',
  },
  twitter: {
    title: 'Convertam — Free File Conversion. No Login. No Watermark.',
    description: 'Free online file conversion. No login, no watermark, no stress.',
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
