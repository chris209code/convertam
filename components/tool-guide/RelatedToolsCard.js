import Link from 'next/link';
import { getTool } from '@/lib/tools-config';
import { ToolIcon, suiteForCategory } from '@/components/icons/ToolIconSystem';

// "Related Tools" card shown below the tool — a compact list of icon + name
// rows, each linking to another tool page. Reusable across any tool that
// provides a `relatedTools` list ([{ slug }]) in lib/toolGuides.js. The icon
// is always derived from the tool's own slug/category via ToolIconSystem, not
// from per-entry data, so it can never drift from the shared icon language.
export default function RelatedToolsCard({ tools }) {
  const resolved = (tools || [])
    .map(({ slug, reason }) => {
      const tool = getTool(slug);
      return tool ? { slug, title: tool.title, category: tool.category, reason } : null;
    })
    .filter(Boolean);

  if (resolved.length === 0) return null;

  return (
    <div className="border border-[#E2E6ED] rounded-2xl p-5 bg-paper">
      <h2 className="font-display text-base font-bold text-ink mb-3.5">Related Tools</h2>
      <div className="flex flex-col gap-2">
        {resolved.map(({ slug, title, category, reason }) => (
          <Link
            key={slug}
            href={`/${slug}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[#E2E6ED] bg-white hover:border-stamp-blue transition-colors no-underline"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center">
              <ToolIcon slug={slug} suite={suiteForCategory(category)} size={32} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-ink">{title}</span>
              {reason && <span className="block text-xs text-ink-soft mt-0.5 leading-snug">{reason}</span>}
            </span>
            <span className="text-stamp-blue text-sm flex-shrink-0">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
