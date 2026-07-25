import { notFound } from 'next/navigation';
import { LEARN_CATEGORIES, getLearnCategory } from '@/lib/learn/categories';
import { getArticlesByCategory } from '@/lib/learn';
import { buildOgMeta } from '@/lib/pageMetadata';
import LearnCategoryClient from '@/components/learn/LearnCategoryClient';

export function generateStaticParams() {
  return LEARN_CATEGORIES.map((c) => ({ category: c.slug }));
}

export function generateMetadata({ params }) {
  const category = getLearnCategory(params.category);
  if (!category) return {};
  const title = `${category.title} — Convertam Learn`;
  return {
    title,
    description: category.description,
    alternates: { canonical: `/learn/${category.slug}` },
    ...buildOgMeta({ title, description: category.description, path: `/learn/${category.slug}` }),
  };
}

export default function LearnCategoryPage({ params }) {
  const category = getLearnCategory(params.category);
  if (!category) notFound();

  const articles = getArticlesByCategory(category.slug);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `${category.title} — Convertam Learn`,
    description: category.description,
    url: `https://www.convertam.app/learn/${category.slug}`,
    hasPart: articles.map((a) => ({
      '@type': 'Article',
      headline: a.title,
      url: `https://www.convertam.app/learn/${category.slug}/${a.slug}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <LearnCategoryClient category={category} />
    </>
  );
}
