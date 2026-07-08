import { tools } from '@/lib/tools-config';

const BASE_URL = 'https://www.convertam.app';

export default function sitemap() {
  const toolPages = tools.map((tool) => ({
    url: `${BASE_URL}/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: tool.mode === 'office' || tool.mode === 'compress' ? 0.9 : 0.8,
  }));

  // Category listing pages — not individual tools, so not covered by the
  // tools-config map above, but they're real indexable pages the homepage
  // now links to directly and deserve their own sitemap entries.
  const categoryPages = [
    'pdf-tools',
    'business',
    'ai-tools',
    'image-tools',
  ].map((slug) => ({
    url: `${BASE_URL}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
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
    ...categoryPages,
    ...toolPages,
  ];
}
