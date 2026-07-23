import { notFound } from 'next/navigation';
import { ARTICLES, getArticle, getReadingTime } from '@/lib/learn';
import { getLearnCategory } from '@/lib/learn/categories';
import ArticleShell from '@/components/learn/ArticleShell';

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ category: a.category, slug: a.slug }));
}

export function generateMetadata({ params }) {
  const article = getArticle(params.slug);
  if (!article || article.category !== params.category) return {};
  return {
    title: `${article.title} — Convertam Learn`,
    description: article.excerpt,
    alternates: { canonical: `/learn/${article.category}/${article.slug}` },
  };
}

export default function LearnArticlePage({ params }) {
  const article = getArticle(params.slug);
  if (!article || article.category !== params.category) notFound();

  const category = getLearnCategory(article.category);
  const url = `https://convertam.app/learn/${article.category}/${article.slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.excerpt,
    datePublished: article.updatedAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: 'Convertam' },
    publisher: { '@type': 'Organization', name: 'Convertam' },
    mainEntityOfPage: url,
    articleSection: category?.title,
    timeRequired: `PT${getReadingTime(article)}M`,
  };

  const faqSchema = article.faqs && article.faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: article.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <ArticleShell article={article} />
    </>
  );
}
