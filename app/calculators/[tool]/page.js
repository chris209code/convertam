import { notFound } from 'next/navigation';
import { tools, getTool } from '@/lib/tools-config';
import { buildToolSchemas } from '@/lib/toolSchema';
import { buildOgMeta } from '@/lib/pageMetadata';
import ToolPageClient from '@/components/ToolPageClient';

// Mirrors app/[tool]/page.js's pattern, scoped to just the calculators that
// live under /calculators/<slug> (tools-config entries with basePath:
// 'calculators') — kept as its own small route file rather than folding
// into the shared one, since that one deliberately excludes these slugs
// (see the notFound() guard there) to keep one canonical URL per tool.

export function generateStaticParams() {
  return tools.filter((t) => t.basePath === 'calculators').map((t) => ({ tool: t.slug }));
}

export function generateMetadata({ params }) {
  const tool = getTool(params.tool);
  if (!tool || tool.basePath !== 'calculators') return {};
  const title = `${tool.title} — Free, No Login`;
  return {
    title,
    description: tool.description,
    alternates: { canonical: `/calculators/${tool.slug}` },
    ...buildOgMeta({ title, description: tool.description, path: `/calculators/${tool.slug}` }),
  };
}

export default function CalculatorToolPage({ params }) {
  const tool = getTool(params.tool);
  if (!tool || tool.basePath !== 'calculators') notFound();
  const { softwareApplication, breadcrumbList, faqSchema } = buildToolSchemas(tool);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplication) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <ToolPageClient tool={tool} />
    </>
  );
}
