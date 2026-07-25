import Link from 'next/link';
import { getLearnCategory } from '@/lib/learn/categories';
import { getTableOfContents, getReadingTime } from '@/lib/learn';
import { getTool } from '@/lib/tools-config';
import { HUB_BY_CATEGORY } from '@/lib/toolSchema';
import { CATEGORY_ACCENTS, PdfIcon, BusinessIcon, AiIcon, ImageIcon, CalculatorIcon, UtilitiesIcon, WorkflowIcon } from '@/components/categoryVisuals';
import FullFaqSection from '@/components/tool-guide/FullFaqSection';
import RelatedToolsCard from '@/components/tool-guide/RelatedToolsCard';
import { LEARN_CSS } from './learnStyles';
import ArticleHero from './ArticleHero';
import TableOfContents from './TableOfContents';
import ArticleContent from './ArticleContent';
import CommonMistakes from './CommonMistakes';
import PrimaryCta from './PrimaryCta';
import RelatedArticlesCard from './RelatedArticlesCard';

const CATEGORY_ICONS = { pdf: PdfIcon, business: BusinessIcon, ai: AiIcon, image: ImageIcon, calculator: CalculatorIcon, utilities: UtilitiesIcon, workflow: WorkflowIcon };

// Orchestrates one full article page: Hero -> TOC + body -> Common
// Mistakes -> one primary CTA -> FAQ -> Related Articles -> "Use These
// Tools". No client-side state of its own — the one interactive piece
// (smooth-scroll TOC links) is isolated inside TableOfContents.
export default function ArticleShell({ article }) {
  const category = getLearnCategory(article.category);
  const accent = CATEGORY_ACCENTS[category.accentKey];
  const toc = getTableOfContents(article);
  const readingTime = getReadingTime(article);
  const primaryToolConfig = article.primaryTool && getTool(article.primaryTool.slug);
  const hub = primaryToolConfig && HUB_BY_CATEGORY[primaryToolConfig.category];

  return (
    <main className="lrn-shell">
      <style dangerouslySetInnerHTML={{ __html: LEARN_CSS }} />

      <ArticleHero
        article={article}
        category={category}
        accent={accent}
        categoryIcon={CATEGORY_ICONS[category.accentKey]}
        readingTime={readingTime}
      />

      <div className="lrn-inner lrn-article-layout">
        <div>
          <ArticleContent body={article.body} />
          <CommonMistakes items={article.commonMistakes} />
          {article.primaryTool && <PrimaryCta primaryTool={article.primaryTool} accent={accent} />}
          <FullFaqSection items={article.faqs} />
        </div>
        <TableOfContents items={toc} />
      </div>

      <div className="lrn-inner" style={{ paddingBottom: 56 }}>
        <RelatedArticlesCard slugs={article.relatedArticles} />
        {article.relatedTools && article.relatedTools.length > 0 && (
          <div style={{ maxWidth: 720 }}>
            <RelatedToolsCard tools={article.relatedTools} heading="Use These Tools" />
          </div>
        )}
        {hub && (
          <Link
            href={`/${hub.slug}`}
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium hover:underline"
            style={{ color: accent.accentText }}
          >
            Explore the full {hub.name} →
          </Link>
        )}
      </div>
    </main>
  );
}
