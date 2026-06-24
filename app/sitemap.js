import { tools } from '@/lib/tools-config';

const BASE_URL = 'https://www.convertam.app';

export default function sitemap() {
  const toolPages = tools.map((tool) => ({
    url: `${BASE_URL}/${tool.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: tool.mode === 'office' || tool.mode === 'compress' ? 0.9 : 0.8,
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
    ...toolPages,
  ];
}
