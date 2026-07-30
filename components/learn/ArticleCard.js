import Link from 'next/link';
import Image from 'next/image';
import { getLearnCategory } from '@/lib/learn/categories';
import { CATEGORY_ACCENTS } from '@/components/categoryVisuals';
import { ARTICLE_ART } from './illustrations/learnArt';
import { getReadingTime } from '@/lib/learn';

// One article "card" — the single card markup reused across the homepage's
// Featured/Popular/Latest grids, category pages, and Related Articles, so
// there's exactly one place that defines what an article preview looks like.
export default function ArticleCard({ article }) {
  const category = getLearnCategory(article.category);
  const accent = CATEGORY_ACCENTS[category.accentKey];
  const art = ARTICLE_ART[article.illustration];
  const displayWidth = 128;

  return (
    <Link href={`/learn/${article.category}/${article.slug}`} className="lrn-card" style={{ background: accent.badgeFreeBg }}>
      <div className="lrn-card-content">
        <p className="lrn-card-cat" style={{ color: accent.accentText }}>{category.title}</p>
        <p className="lrn-card-title">{article.title}</p>
        <p className="lrn-card-excerpt">{article.excerpt}</p>
      </div>
      {art && (
        <div className="lrn-card-illustration">
          <Image
            src={art.src}
            alt=""
            width={displayWidth}
            height={Math.round((art.height / art.width) * displayWidth)}
            loading="lazy"
          />
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
