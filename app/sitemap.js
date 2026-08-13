import { tools } from '@/lib/tools-config';
import { LEARN_CATEGORIES } from '@/lib/learn/categories';
import { ARTICLES } from '@/lib/learn';

const BASE_URL = 'https://www.convertam.app';

export default function sitemap() {
  const toolPages = tools.map((tool) => ({
    // Tools with a basePath (currently just /calculators/*) live under a
    // nested path instead of the usual flat /<slug> — see
    // app/calculators/[tool]/page.js and the notFound() guard that keeps
    // the flat URL from also resolving for these.
    url: tool.basePath ? `${BASE_URL}/${tool.basePath}/${tool.slug}` : `${BASE_URL}/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: tool.mode === 'office' || tool.mode === 'compress' ? 0.9 : 0.8,
  }));

  // Category listing pages — not individual tools, so not covered by the
  // tools-config map above, but they're real indexable pages the homepage
  // links to directly and deserve their own sitemap entries.
  const categoryPages = [
    'pdf-tools',
    'business',
    'career-studio',
    'ai-tools',
    'image-tools',
    'calculator-hub',
    'utilities',
    'smart-workflows',
    'data-tools',
  ].map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // Individual Data Tools studios — not in tools-config.js (they're not
  // registered there yet, see app/data-tools/page.js), so listed here
  // explicitly like the category pages above.
  const dataToolPages = [
    'data-tools/smart-parser',
    'data-tools/text-cleaner',
    'data-tools/json-studio',
    'data-tools/extract-studio',
  ].map((path) => ({
    url: `${BASE_URL}/${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // Convertam Learn — the knowledge-base section: one homepage, 7 category
  // pages, and one page per article, each carrying its own updatedAt as
  // lastModified so the sitemap reflects real content freshness.
  const learnHomePage = {
    url: `${BASE_URL}/learn`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  };
  const learnCategoryPages = LEARN_CATEGORIES.map((c) => ({
    url: `${BASE_URL}/learn/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.75,
  }));
  const learnArticlePages = ARTICLES.map((a) => ({
    url: `${BASE_URL}/learn/${a.category}/${a.slug}`,
    lastModified: new Date(a.updatedAt),
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    ...['why-convertam', 'security', 'file-deletion-policy', 'ai-transparency', 'contact'].map((slug) => ({
      url: `${BASE_URL}/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    })),
    ...categoryPages,
    ...dataToolPages,
    ...toolPages,
    learnHomePage,
    ...learnCategoryPages,
    ...learnArticlePages,
  ];
}
