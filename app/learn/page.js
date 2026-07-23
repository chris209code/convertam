import LearnHomepageClient from '@/components/learn/LearnHomepageClient';

export const metadata = {
  title: 'Convertam Learn — Guides for Documents, AI, Business & More',
  description: 'A practical knowledge base covering PDFs, AI tools, business documents, images, calculators, productivity and multi-tool workflows — each guide connected to the Convertam tool that puts it into practice.',
  alternates: { canonical: '/learn' },
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Convertam Learn',
  description: metadata.description,
  url: 'https://convertam.app/learn',
};

export default function LearnPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <LearnHomepageClient />
    </>
  );
}
