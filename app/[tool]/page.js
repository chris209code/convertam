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
  // Temporarily de-listed tools keep their URL resolving (rather than
  // 404ing for anyone who already has the link) but carry noindex and no
  // promotional metadata/structured data — see the `disabled` note in
  // lib/tools-config.js.
  if (tool.disabled) {
    return {
      title: `${tool.title} — Temporarily Unavailable`,
      description: tool.disabledNote || `${tool.title} is temporarily unavailable.`,
      robots: { index: false, follow: false },
    };
  }
  const title = `${tool.title} — Free, No Login`;
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
  if (tool.disabled) return <ToolPageClient tool={tool} />;
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
