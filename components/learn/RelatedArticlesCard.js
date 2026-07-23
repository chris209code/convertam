import { getArticle } from '@/lib/learn';
import ArticleCard from './ArticleCard';

// "Related articles" grid — resolves relatedArticles slugs via getArticle()
// and renders the shared ArticleCard, so article previews look identical
// everywhere they appear (homepage grids, category pages, here).
export default function RelatedArticlesCard({ slugs }) {
  const resolved = (slugs || []).map(getArticle).filter(Boolean);
  if (resolved.length === 0) return null;

  return (
    <div style={{ marginBottom: 30 }}>
      <p className="lrn-section-label">Related Articles</p>
      <div className="lrn-related-grid">
        {resolved.map((article) => <ArticleCard key={article.slug} article={article} />)}
      </div>
    </div>
  );
}
