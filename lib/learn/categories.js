// The 7 top-level Convertam Learn categories. `accentKey` points into
// CATEGORY_ACCENTS (components/categoryVisuals.js) so every Learn page
// reuses the exact same color/gradient language as the rest of the site's
// category hub pages — no separate color system to maintain.
export const LEARN_CATEGORIES = [
  {
    slug: 'pdf-guides',
    title: 'PDF Guides',
    accentKey: 'pdf',
    description: 'Merging, compressing, converting and working with PDF files the right way.',
  },
  {
    slug: 'ai-guides',
    title: 'AI Guides',
    accentKey: 'ai',
    description: 'What AI can actually do for your documents — OCR, translation, and writing help — and where it still falls short.',
  },
  {
    slug: 'business-documents',
    title: 'Business Documents',
    accentKey: 'business',
    description: 'Invoices, quotations, signatures and the paperwork that keeps a business running.',
  },
  {
    slug: 'image-guides',
    title: 'Image Guides',
    accentKey: 'image',
    description: 'File formats, compression and getting a clean scan from nothing but your phone.',
  },
  {
    slug: 'calculator-guides',
    title: 'Calculator Guides',
    accentKey: 'calculator',
    description: 'The math behind loans, VAT and profit margins, explained in plain language.',
  },
  {
    slug: 'productivity-guides',
    title: 'Productivity Guides',
    accentKey: 'utilities',
    description: 'Passwords, QR codes and habits that keep your documents organized and secure.',
  },
  {
    slug: 'workflow-guides',
    title: 'Workflow Guides',
    accentKey: 'workflow',
    description: 'How several Convertam tools chain together into one repeatable process, start to finish.',
  },
];

export function getLearnCategory(slug) {
  return LEARN_CATEGORIES.find((c) => c.slug === slug) || null;
}
