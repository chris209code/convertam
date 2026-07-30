'use client';

import Link from 'next/link';
import Image from 'next/image';
import { LEARN_CATEGORIES } from '@/lib/learn/categories';
import { getFeaturedArticles, getPopularArticles, getLatestArticles, getArticlesByCategory } from '@/lib/learn';
import { LEARN_CSS } from './learnStyles';
import ArticleCard from './ArticleCard';
import LearnSearch from './LearnSearch';
import { LEARN_HERO_ART, CATEGORY_ART } from './illustrations/learnArt';

export default function LearnHomepageClient() {
  const featured = getFeaturedArticles();
  const popular = getPopularArticles();
  const latest = getLatestArticles(6);

  return (
    <main className="lrn-shell">
      <style dangerouslySetInnerHTML={{ __html: LEARN_CSS }} />

      <div className="lrn-hero">
        <div className="lrn-inner lrn-hero-row">
          <div className="lrn-hero-copy">
            <Link href="/" className="lrn-back" style={{ color: '#CBD5E1' }}>← Back to Home</Link>
            <h1 className="lrn-hero-title">Convertam Learn</h1>
            <p className="lrn-hero-sub">
              A knowledge base for documents, AI, business paperwork, images, calculators and getting
              things done — practical guides, not marketing fluff, each one connected to the Convertam
              tool that puts it into practice.
            </p>
            <LearnSearch />
          </div>
          <div className="lrn-hero-art" aria-hidden="true">
            <Image src={LEARN_HERO_ART.src} alt="" width={LEARN_HERO_ART.width} height={LEARN_HERO_ART.height} priority />
          </div>
        </div>
      </div>

      <div className="lrn-inner" style={{ padding: '40px 4% 60px' }}>
        {featured.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <p className="lrn-section-label">Featured Guides</p>
            <div className="lrn-grid">
              {featured.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
          </div>
        )}

        {popular.length > 0 && (
          <div style={{ marginBottom: 40 }}>
            <p className="lrn-section-label">Popular Guides</p>
            <div className="lrn-grid">
              {popular.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
          </div>
        )}

        {latest.length > 0 && (
          <div style={{ marginBottom: 44 }}>
            <p className="lrn-section-label">Latest Guides</p>
            <div className="lrn-grid">
              {latest.map((a) => <ArticleCard key={a.slug} article={a} />)}
            </div>
          </div>
        )}

        <div>
          <p className="lrn-section-label">Browse by Category</p>
          <div className="lrn-cat-grid">
            {LEARN_CATEGORIES.map((cat) => {
              const art = CATEGORY_ART[cat.accentKey];
              const count = getArticlesByCategory(cat.slug).length;
              return (
                <Link key={cat.slug} href={`/learn/${cat.slug}`} className="lrn-cat-card">
                  <span className="lrn-cat-icon">
                    {art && <Image src={art.src} alt="" width={56} height={56} loading="lazy" />}
                  </span>
                  <div>
                    <p className="lrn-cat-title">{cat.title}</p>
                    <p className="lrn-cat-count">{count} guide{count === 1 ? '' : 's'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
