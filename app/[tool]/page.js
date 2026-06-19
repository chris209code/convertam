import { notFound } from 'next/navigation';
import { tools, getTool } from '@/lib/tools-config';
import ToolPageClient from '@/components/ToolPageClient';

export function generateStaticParams() {
  return tools.map((t) => ({ tool: t.slug }));
}

export function generateMetadata({ params }) {
  const tool = getTool(params.tool);
  if (!tool) return {};
  return {
    title: `${tool.title} — Free, No Login`,
    description: tool.description,
  };
}

export default function ToolPage({ params }) {
  const tool = getTool(params.tool);
  if (!tool) notFound();
  return <ToolPageClient tool={tool} />;
}
