import LearnHomepageClient from '@/components/learn/LearnHomepageClient';
import { buildOgMeta } from '@/lib/pageMetadata';

const TITLE = 'Convertam Learn — Guides for Documents, AI, Business & More';
const DESCRIPTION = 'A practical knowledge base covering PDFs, AI tools, business documents, images, calculators, productivity and multi-tool workflows — each guide connected to the Convertam tool that puts it into practice.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/learn' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/learn' }),
};

const SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Convertam Learn',
  description: metadata.description,
  url: 'https://www.convertam.app/learn',
};

export default function LearnPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SCHEMA) }} />
      <LearnHomepageClient />
    </>
  );
}
