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
  };
}

export default function ToolPage({ params }) {
  const tool = getTool(params.tool);
  // A tool with a basePath only exists at its nested URL — this keeps the
  // flat /<slug> from also resolving, so there's one canonical URL per tool.
  if (!tool || tool.basePath) notFound();
  return <ToolPageClient tool={tool} />;
}
