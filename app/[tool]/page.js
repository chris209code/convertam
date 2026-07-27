import { notFound } from 'next/navigation';
import { tools, getTool } from '@/lib/tools-config';
import { buildToolSchemas } from '@/lib/toolSchema';
import { buildOgMeta } from '@/lib/pageMetadata';
import ToolPageClient from '@/components/ToolPageClient';

export function generateStaticParams() {
  // Tools with a basePath (e.g. the /calculators/* pages) live under their
  // own nested route instead — see app/calculators/[tool]/page.js.
  return tools.filter((t) => !t.basePath).map((t) => ({ tool: t.slug }));
}

export function generateMetadata({ params }) {
  const tool = getTool(params.tool);
  if (!tool || tool.basePath) return {};
  // metaTitle lets a tool target broader search terms in the <title> tag
  // (e.g. "Sign PDF, Word & Documents") while the on-page H1 stays the
  // short product name (tool.title) users actually see and click through
  // navigation with — see lib/tools-config.js.
  const title = tool.metaTitle || `${tool.title} — Free, No Login`;
  return {
    title,
    description: tool.description,
    alternates: { canonical: `/${tool.slug}` },
    ...buildOgMeta({ title, description: tool.description, path: `/${tool.slug}` }),
  };
}

export default function ToolPage({ params }) {
  const tool = getTool(params.tool);
  // A tool with a basePath only exists at its nested URL — this keeps the
  // flat /<slug> from also resolving, so there's one canonical URL per tool.
  if (!tool || tool.basePath) notFound();
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
