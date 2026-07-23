import Link from 'next/link';
import { getTool } from '@/lib/tools-config';

// The ONE prominent "try this tool" call-to-action per article — CTA
// discipline per product direction: exactly one obvious primary action,
// not competing buttons. "Use These Tools" below (RelatedToolsCard) stays
// available for secondary tools but is deliberately less visually loud.
export default function PrimaryCta({ primaryTool, accent }) {
  const tool = getTool(primaryTool.slug);
  if (!tool) return null;
  // basePath tools (currently just /calculators/*) live at a nested route,
  // not the flat /<slug> — see RelatedToolsCard.js for the same fix.
  const href = tool.basePath ? `/${tool.basePath}/${tool.slug}` : `/${tool.slug}`;

  return (
    <Link href={href} className="lrn-primary-cta" style={{ background: accent.gradient }}>
      <div>
        <p className="lrn-primary-cta-title">{primaryTool.label || `Try ${tool.title}`}</p>
        <p className="lrn-primary-cta-desc">{tool.description}</p>
      </div>
      <span className="lrn-primary-cta-btn" style={{ color: accent.accentText }}>Open {tool.title} →</span>
    </Link>
  );
}
