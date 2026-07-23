'use client';

import Link from 'next/link';
import { CATEGORY_ACCENTS, PdfIcon, BusinessIcon, AiIcon, ImageIcon, CalculatorIcon, UtilitiesIcon, WorkflowIcon } from '@/components/categoryVisuals';
import { getArticlesByCategory } from '@/lib/learn';
import { LEARN_CSS } from './learnStyles';
import ArticleCard from './ArticleCard';

const CATEGORY_ICONS = { pdf: PdfIcon, business: BusinessIcon, ai: AiIcon, image: ImageIcon, calculator: CalculatorIcon, utilities: UtilitiesIcon, workflow: WorkflowIcon };

export default function LearnCategoryClient({ category }) {
  const accent = CATEGORY_ACCENTS[category.accentKey];
  const articles = getArticlesByCategory(category.slug);

  return (
    <main className="lrn-shell">
      <style dangerouslySetInnerHTML={{ __html: LEARN_CSS }} />

      <div className="lrn-cat-header">
        <div className="lrn-inner">
          <Link href="/learn" className="lrn-back" style={{ color: accent.accentText }}>← Back to Learn</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="lrn-cat-header-icon" style={{ background: accent.gradient }}>{CATEGORY_ICONS[category.accentKey]}</span>
            <div>
              <h1 className="lrn-cat-header-title">{category.title}</h1>
              <p className="lrn-cat-header-sub">{category.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="lrn-inner" style={{ padding: '28px 4% 56px' }}>
        <div className="lrn-grid">
          {articles.map((a) => <ArticleCard key={a.slug} article={a} />)}
        </div>
      </div>
    </main>
  );
}
