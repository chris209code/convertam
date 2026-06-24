import { MetadataRoute } from 'next';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: 'https://www.convertam.app/sitemap.xml',
  };
}
