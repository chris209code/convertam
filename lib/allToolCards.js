// Flat cross-category tool-card registry, used by the Favorites feature so
// a favorited tool can be rendered correctly (title, description, icon,
// href, and its own category's accent colour) regardless of which hub page
// it's actually shown on. Built from the same data each hub page renders
// from (lib/toolSections/*.js), not duplicated content.
import { CATEGORY_ACCENTS } from '../components/categoryVisuals';
import { SECTIONS as PDF_SECTIONS } from './toolSections/pdf';
import { SECTIONS as BUSINESS_SECTIONS } from './toolSections/business';
import { SECTIONS as CAREER_SECTIONS } from './toolSections/careerStudio';
import { SECTIONS as AI_SECTIONS } from './toolSections/ai';
import { SECTIONS as IMAGE_SECTIONS } from './toolSections/image';
import { SECTIONS as CALCULATOR_SECTIONS } from './toolSections/calculator';
import { SECTIONS as UTILITIES_SECTIONS } from './toolSections/utilities';

const GROUPS = [
  { sections: PDF_SECTIONS, accent: CATEGORY_ACCENTS.pdf, category: 'pdf-tools' },
  { sections: BUSINESS_SECTIONS, accent: CATEGORY_ACCENTS.business, category: 'business' },
  { sections: CAREER_SECTIONS, accent: CATEGORY_ACCENTS.career, category: 'career-studio' },
  { sections: AI_SECTIONS, accent: CATEGORY_ACCENTS.ai, category: 'ai-tools' },
  { sections: IMAGE_SECTIONS, accent: CATEGORY_ACCENTS.image, category: 'image-tools' },
  { sections: CALCULATOR_SECTIONS, accent: CATEGORY_ACCENTS.calculator, category: 'calculator-hub' },
  { sections: UTILITIES_SECTIONS, accent: CATEGORY_ACCENTS.utilities, category: 'utilities' },
];

const REGISTRY = new Map();
for (const { sections, accent, category } of GROUPS) {
  for (const section of sections) {
    for (const tool of section.tools) {
      REGISTRY.set(tool.slug, {
        ...tool,
        href: tool.href || `/${tool.slug}`,
        accent,
        category,
      });
    }
  }
}

export function getToolCard(slug) {
  return REGISTRY.get(slug) || null;
}

export function getToolCards(slugs) {
  return slugs.map(getToolCard).filter(Boolean);
}
