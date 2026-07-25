// Shared Open Graph + Twitter Card builder. Next.js does NOT deep-merge the
// `openGraph`/`twitter` objects from the root layout into a page's own
// metadata — a page with no `openGraph` field inherits the layout's entire
// object verbatim (same title/description/url for every page). This helper
// gives every page its own accurate values with one line instead of hand
// duplicating the same 15-line block everywhere.
const BASE_URL = 'https://www.convertam.app';

export function buildOgMeta({ title, description, path, image }) {
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const ogImage = image || `${BASE_URL}/og-image.png`;
  return {
    openGraph: {
      title,
      description,
      url,
      siteName: 'Convertam',
      type: 'website',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      creator: '@chrisndz',
      images: [ogImage],
    },
  };
}
