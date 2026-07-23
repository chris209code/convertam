import Link from 'next/link';
import { getLearnCategory } from '@/lib/learn/categories';
import { CATEGORY_ACCENTS } from '@/components/categoryVisuals';
import { LEARN_ILLUSTRATIONS } from './illustrations';
import { getReadingTime } from '@/lib/learn';

// The 6 detailed "premium" illustrations (see illustrations/premiumIllustrations.js)
// are self-contained scenes with their own soft internal backdrop, so they
// render directly on the card's pastel background. The rest of the
// illustration library was designed as white shapes meant to sit on a
// solid color banner — on this card's much lighter pastel background
// those white shapes would be nearly invisible, so they're wrapped in a
// small solid-accent badge here instead, matching what they were actually
// drawn against.
const PREMIUM_ILLUSTRATION_KEYS = new Set([
  'mergePdfPremium', 'ocrPremium', 'invoiceQuotationPremium',
  'jpgPngPremium', 'loanAmortizationPremium', 'passwordSecurityPremium',
]);

// One article "card" — the single card markup reused across the homepage's
// Featured/Popular/Latest grids, category pages, and Related Articles, so
// there's exactly one place that defines what an article preview looks like.
export default function ArticleCard({ article }) {
  const category = getLearnCategory(article.category);
  const accent = CATEGORY_ACCENTS[category.accentKey];
  const Illustration = LEARN_ILLUSTRATIONS[article.illustration];
  const isPremium = PREMIUM_ILLUSTRATION_KEYS.has(article.illustration);

  return (
    <Link href={`/learn/${article.category}/${article.slug}`} className="lrn-card" style={{ background: accent.badgeFreeBg }}>
      <div className="lrn-card-content">
        <p className="lrn-card-cat" style={{ color: accent.accentText }}>{category.title}</p>
        <p className="lrn-card-title">{article.title}</p>
        <p className="lrn-card-excerpt">{article.excerpt}</p>
      </div>
      {Illustration && (
        <div className="lrn-card-illustration">
          {isPremium ? (
            <Illustration width={130} />
          ) : (
            <div className="lrn-card-illustration-badge" style={{ background: accent.gradient }}>
              <Illustration size={54} />
            </div>
          )}
        </div>
      )}
      <div className="lrn-card-meta">
        <span>{getReadingTime(article)} min read</span>
        <span>·</span>
        <span>{article.difficulty}</span>
      </div>
    </Link>
  );
}
