import { tools } from '@/lib/tools-config';

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
  // now links to directly and deserve their own sitemap entries.
  //
  // 'data-tools' is deliberately excluded here (and its individual studio
  // pages below are commented out entirely) while the Data Workspace
  // category stays hidden from navigation and the homepage — those pages
  // still exist and still work, they're just not ready to be surfaced to
  // search engines yet. Un-comment / re-add both blocks together with the
  // homepage/nav reveal once that category is production-ready.
  const categoryPages = [
    'pdf-tools',
    'business',
    'ai-tools',
    'image-tools',
    'calculator-hub',
  ].map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  // Individual Data Tools — hidden from the sitemap while the category is
  // hidden from navigation (see note above). These pages also carry a
  // `noindex` meta tag directly (see each page's `metadata` export) so a
  // stray inbound link doesn't get them indexed either.
  //
  // const dataToolPages = [
  //   'data-tools/text-cleaner',
  //   'data-tools/json-studio',
  //   'data-tools/extract-studio',
  // ].map((path) => ({
  //   url: `${BASE_URL}/${path}`,
  //   lastModified: new Date(),
  //   changeFrequency: 'monthly',
  //   priority: 0.8,
  // }));

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
    ...categoryPages,
    ...toolPages,
  ];
}
