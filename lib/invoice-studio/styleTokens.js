// Templates are visual skins ONLY. Every value here is styling —
// typography, color, alignment, spacing — never content, never layout
// positions. Both the live editor (React components) and the PDF/HTML
// renderer read from this exact same object, so a template's look can
// never drift between the two: there is only one definition of what
// "Corporate" looks like, not two that have to be kept in sync by hand.

export const TEMPLATE_GALLERY = [
  { id: 'modern', name: 'Modern' },
  { id: 'corporate', name: 'Corporate' },
  { id: 'elegant', name: 'Elegant' },
];

const BASE = {
  headingFont: 'Poppins',
  bodyFont: 'Inter',
  pageBg: '#ffffff',
  textDark: '#0F172A',
  textGray: '#64748B',
  textMuted: '#94A3B8',
  divider: '#E7EAF0',
};

export const STYLE_TOKENS = {
  modern: {
    ...BASE,
    brandPrimary: '#2563EB', brandSecondary: '#0F172A', brandAccent: '#10B981',
    headerLayout: 'left',        // logo/company left-aligned, contact info right-aligned
    tableHeaderStyle: 'solid',   // filled brand-color header row
    footerStyle: 'bar',          // solid color bar footer
    totalsBg: 'tinted',          // light gray background box
  },
  corporate: {
    ...BASE,
    headingFont: 'Poppins', bodyFont: 'Inter',
    brandPrimary: '#0F172A', brandSecondary: '#334155', brandAccent: '#2563EB',
    headerLayout: 'left',
    tableHeaderStyle: 'solid',
    footerStyle: 'bar',
    totalsBg: 'tan',
  },
  elegant: {
    ...BASE,
    headingFont: 'Georgia', bodyFont: 'Inter',
    brandPrimary: '#7C3AED', brandSecondary: '#1E1B4B', brandAccent: '#7C3AED',
    headerLayout: 'centered',    // logo/company centered
    tableHeaderStyle: 'outline', // white header row, colored text + underline
    footerStyle: 'bar',
    totalsBg: 'plain',
  },
};

export function stylesFor(templateId) {
  return STYLE_TOKENS[templateId] || STYLE_TOKENS.modern;
}

export function fontCss(name) {
  if (name === 'Poppins') return "'Poppins', sans-serif";
  if (name === 'Inter') return "'Inter', sans-serif";
  if (name === 'Georgia') return 'Georgia, serif';
  return 'Arial, Helvetica, sans-serif';
}

// Fonts actually used across all templates, loaded once via Google Fonts —
// same list whether rendering in the browser editor (next/font already
// covers this) or in the headless-browser PDF path (needs an explicit link).
export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Caveat:wght@600&display=swap';
