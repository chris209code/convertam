import Link from 'next/link';
import { getLearnCategory } from '@/lib/learn/categories';
import { CATEGORY_ACCENTS } from '@/components/categoryVisuals';
import { LEARN_ILLUSTRATIONS } from './illustrations';
import { getReadingTime } from '@/lib/learn';

// One article "card" — the single card markup reused across the homepage's
// Featured/Popular/Latest grids, category pages, and Related Articles, so
// there's exactly one place that defines what an article preview looks like.
export default function ArticleCard({ article }) {
  const category = getLearnCategory(article.category);
  const accent = CATEGORY_ACCENTS[category.accentKey];
  const Illustration = LEARN_ILLUSTRATIONS[article.illustration];

  return (
    <Link href={`/learn/${article.category}/${article.slug}`} className="lrn-card">
      <div className="lrn-card-banner" style={{ background: accent.gradient }}>
        {Illustration && <div style={{ color: 'rgba(255,255,255,0.9)' }}><Illustration size={56} /></div>}
      </div>
      <div className="lrn-card-body">
        <p className="lrn-card-cat" style={{ color: accent.accentText }}>{category.title}</p>
        <p className="lrn-card-title">{article.title}</p>
        <p className="lrn-card-excerpt">{article.excerpt}</p>
        <div className="lrn-card-meta">
          <span>{getReadingTime(article)} min read</span>
          <span>·</span>
          <span>{article.difficulty}</span>
        </div>
      </div>
    </Link>
  );
}
