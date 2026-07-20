import { notFound } from 'next/navigation';
import { tools, getTool } from '@/lib/tools-config';
import ToolPageClient from '@/components/ToolPageClient';

export function generateStaticParams() {
  // Tools with a basePath (e.g. the /calculators/* pages) live under their
  // own nested route instead — see app/calculators/[tool]/page.js.
  return tools.filter((t) => !t.basePath).map((t) => ({ tool: t.slug }));
}

export function generateMetadata({ params }) {
  const tool = getTool(params.tool);
  if (!tool || tool.basePath) return {};
  return {
    title: `${tool.title} — Free, No Login`,
    description: tool.description,
    alternates: { canonical: `/${tool.slug}` },
  };
}

// JSON-LD schema, added per-tool as needed (kept scoped rather than built out
// generically for all 50+ tools). Password Studio is a security-sensitive
// workspace, so it gets an explicit SoftwareApplication schema.
const SCHEMAS = {
  'password-generator': {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Password Studio',
    description: 'Generate, customize and analyse secure passwords — Random Password, Smart Word Builder, and Passphrase modes, entirely in your browser.',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'Any (runs in browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    url: 'https://convertam.app/password-generator',
  },
};

export default function ToolPage({ params }) {
  const tool = getTool(params.tool);
  // A tool with a basePath only exists at its nested URL — this keeps the
  // flat /<slug> from also resolving, so there's one canonical URL per tool.
  if (!tool || tool.basePath) notFound();
  const schema = SCHEMAS[tool.slug];
  return (
    <>
      {schema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      )}
      <ToolPageClient tool={tool} />
    </>
  );
}
