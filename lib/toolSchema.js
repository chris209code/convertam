// Shared SoftwareApplication + BreadcrumbList + FAQPage JSON-LD builder for
// tool pages — used by both app/[tool]/page.js and
// app/calculators/[tool]/page.js so every tool gets the same schema shape
// regardless of which route file serves it.

import { toolGuides } from './toolGuides';
import { toolExtras } from './toolExtras';
import { toolMetadata } from './toolMetadata';

// Explicit overrides for tools that need a more specific applicationCategory
// than the generic default below (e.g. a security-sensitive workspace).
const CATEGORY_OVERRIDES = {
  'password-generator': 'SecurityApplication',
};

// Maps tools-config.js's free-text `category` field to the real hub page a
// tool actually lives under, for BreadcrumbList's parent entry — these are
// the only category strings tools-config.js uses (verified against it).
const HUB_BY_CATEGORY = {
  'PDF Tools': { name: 'PDF Tools', slug: 'pdf-tools' },
  'PDF Utilities': { name: 'PDF Tools', slug: 'pdf-tools' },
  'PDF Editor': { name: 'PDF Tools', slug: 'pdf-tools' },
  'Document Conversion': { name: 'PDF Tools', slug: 'pdf-tools' },
  'Business Tools': { name: 'Business Tools', slug: 'business' },
  'Smart Converter': { name: 'AI Tools', slug: 'ai-tools' },
  'Image Tools': { name: 'Image Tools', slug: 'image-tools' },
  'Calculators': { name: 'Calculators', slug: 'calculator-hub' },
  'Utilities': { name: 'Utilities', slug: 'utilities' },
};

export function buildToolSchemas(tool) {
  const path = tool.basePath ? `${tool.basePath}/${tool.slug}` : tool.slug;
  const url = `https://convertam.app/${path}`;
  // Structured metadata (lib/toolMetadata.js) is the internal source of
  // truth for real price/audience/category facts — used here to make the
  // schema accurate rather than the previous blanket "$0 for everything."
  // Absent for tools not yet enriched, so every field below stays optional.
  const meta = toolMetadata[tool.slug];
  const price = meta?.freeLimit?.type === 'paid' ? '1' : '0';
  const softwareApplication = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.title,
    description: tool.description,
    applicationCategory: CATEGORY_OVERRIDES[tool.slug] || 'UtilitiesApplication',
    ...(meta?.category ? { applicationSubCategory: meta.category } : {}),
    operatingSystem: 'Any (runs in browser)',
    offers: { '@type': 'Offer', price, priceCurrency: 'USD' },
    ...(meta?.audience?.length ? { audience: { '@type': 'Audience', audienceType: meta.audience.join(', ') } } : {}),
    url,
  };
  const hub = HUB_BY_CATEGORY[tool.category];
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://convertam.app/' },
      ...(hub ? [{ '@type': 'ListItem', position: 2, name: hub.name, item: `https://convertam.app/${hub.slug}` }] : []),
      { '@type': 'ListItem', position: hub ? 3 : 2, name: tool.title, item: url },
    ],
  };
  // FAQPage — combines the Quick Guide's "Frequently Asked Questions"
  // (lib/toolGuides.js fullFaqs) with the search-intent "Questions People
  // Ask" (lib/toolExtras.js), since a page should carry one FAQPage schema
  // rather than two competing ones. null when a tool has neither yet.
  const guideFaqs = toolGuides[tool.slug]?.fullFaqs || [];
  const extraFaqs = toolExtras[tool.slug]?.questionsPeopleAsk || [];
  const allFaqs = [...guideFaqs, ...extraFaqs];
  const faqSchema = allFaqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  } : null;

  return { softwareApplication, breadcrumbList, faqSchema };
}
