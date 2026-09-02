'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CATEGORY_ACCENTS } from '@/components/categoryVisuals';
import { getArticlesByCategory } from '@/lib/learn';
import { LEARN_CSS } from './learnStyles';
import ArticleCard from './ArticleCard';
import { CATEGORY_ART } from './illustrations/learnArt';
import { ResponsiveAd } from '@/components/ads/AdSlot';

export default function LearnCategoryClient({ category }) {
  const accent = CATEGORY_ACCENTS[category.accentKey];
  const art = CATEGORY_ART[category.accentKey];
  const articles = getArticlesByCategory(category.slug);

  return (
    <main className="lrn-shell">
      <style dangerouslySetInnerHTML={{ __html: LEARN_CSS }} />

      <div className="lrn-cat-header">
        <div className="lrn-inner">
          <Link href="/learn" className="lrn-back" style={{ color: accent.accentText }}>← Back to Learn</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="lrn-cat-header-icon">
              {art && <Image src={art.src} alt="" width={56} height={56} priority />}
            </span>
            <div>
              <h1 className="lrn-cat-header-title">{category.title}</h1>
              <p className="lrn-cat-header-sub">{category.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lrn-inner" style={{ padding: '28px 4% 56px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <ResponsiveAd />
        </div>
        <div className="lrn-grid">
          {articles.map((a) => <ArticleCard key={a.slug} article={a} />)}
        </div>
      </div>
    </main>
  );
}
