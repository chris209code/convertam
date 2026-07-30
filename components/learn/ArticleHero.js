import Link from 'next/link';
import Image from 'next/image';
import { ARTICLE_ART } from './illustrations/learnArt';

// Article page hero: the approved hybrid style — a Convertam-branded
// gradient banner (category accent + category icon) with a contextual,
// topic-specific illustration, then a meta row on white below showing
// reading time / last updated / difficulty (category itself is the badge
// link inside the banner, so it isn't repeated in the meta row).
export default function ArticleHero({ article, category, accent, categoryIcon, readingTime }) {
  const art = ARTICLE_ART[article.illustration];
  const displayWidth = 190;
  const updatedLabel = new Date(article.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <div className="lrn-article-hero" style={{ background: accent.gradient }}>
        <div className="lrn-inner lrn-article-hero-inner">
          <div style={{ flex: 1, minWidth: 240 }}>
            <Link href={`/learn/${category.slug}`} className="lrn-article-badge">
              <span aria-hidden="true" style={{ display: 'flex' }}>{categoryIcon}</span>
              {category.title}
            </Link>
            <h1 className="lrn-article-hero-title">{article.title}</h1>
          </div>
          {art && (
            <div className="lrn-article-illustration">
              <Image
                src={art.src}
                alt=""
                width={displayWidth}
                height={Math.round((art.height / art.width) * displayWidth)}
              />
            </div>
          )}
        </div>
      </div>
      <div style={{ background: 'white', borderBottom: '1px solid #EEF0F3' }}>
        <div className="lrn-inner lrn-meta-row">
          <span className="lrn-meta-item">📖 {readingTime} min read</span>
          <span className="lrn-meta-item">🕒 Updated {updatedLabel}</span>
          <span className={`lrn-difficulty lrn-difficulty-${article.difficulty}`}>{article.difficulty}</span>
        </div>
      </div>
    </>
  );
}
