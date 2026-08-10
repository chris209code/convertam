// Design-token theme system for the AI Presentation Maker. Extends the
// color-role naming convention already established by
// lib/buildPptxFromOutline.js's PPTX_THEMES (primary/accent/background)
// into the fuller token shape the spec calls for: colors, fonts, font
// sizes, spacing/radius, and a `visualTreatment` tag.
//
// Every one of the 12 layouts in lib/presentation/layoutEngine.js reads
// only these tokens — never a hardcoded color/font — so switching themes
// is a pure local re-render with zero AI calls, and every layout shares
// the same visual language within one theme (the 12 layouts are
// compositions of one design system, not 12 unrelated templates).
//
// `coverBg`/`coverText` are a deliberately separate pair from
// `primary`/`text`: the "title", "sectionDivider", and "keyTakeaway"
// layouts need a bold, full-bleed panel color distinct from body-slide
// text color. For light themes this happens to equal `primary` (a dark
// navy looks right as both the title-slide panel AND regular slide
// titles), but for dark-background themes `primary` is deliberately a
// light color (used as body-slide title text against the dark page
// background) — reusing it as a cover-panel fill would produce a
// near-white "title slide" that doesn't read as part of the same deck.

export const THEMES = {
  modern: {
    key: 'modern', label: 'Modern',
    colors: { primary: '1E3A8A', secondary: '2563EB', accent: 'F59E0B', background: 'FFFFFF', text: '0F172A', textLight: '64748B', coverBg: '1E3A8A', coverText: 'FFFFFF' },
    fonts: { heading: 'Calibri', body: 'Calibri' },
    fontSizes: { title: 36, subtitle: 18, heading: 26, body: 16, small: 11 },
    borderRadius: 8, spacing: 'comfortable', visualTreatment: 'bold-accent-bar',
  },
  corporate: {
    key: 'corporate', label: 'Corporate',
    colors: { primary: '0C2D57', secondary: '0C2D57', accent: '2563EB', background: 'FFFFFF', text: '1F2937', textLight: '64748B', coverBg: '0C2D57', coverText: 'FFFFFF' },
    fonts: { heading: 'Arial', body: 'Arial' },
    fontSizes: { title: 34, subtitle: 17, heading: 24, body: 15, small: 10 },
    borderRadius: 4, spacing: 'compact', visualTreatment: 'boxed',
  },
  minimal: {
    key: 'minimal', label: 'Minimal',
    colors: { primary: '111111', secondary: '4B5563', accent: '111111', background: 'FFFFFF', text: '111827', textLight: '9CA3AF', coverBg: '111111', coverText: 'FFFFFF' },
    fonts: { heading: 'Helvetica', body: 'Helvetica' },
    fontSizes: { title: 32, subtitle: 16, heading: 22, body: 15, small: 10 },
    borderRadius: 0, spacing: 'airy', visualTreatment: 'flat-no-accent',
  },
  academic: {
    key: 'academic', label: 'Academic',
    colors: { primary: '111827', secondary: '4B5563', accent: '7C2D12', background: 'FBF9F6', text: '1F2937', textLight: '6B7280', coverBg: '111827', coverText: 'FFFFFF' },
    fonts: { heading: 'Georgia', body: 'Georgia' },
    fontSizes: { title: 32, subtitle: 16, heading: 22, body: 15, small: 10 },
    borderRadius: 2, spacing: 'compact', visualTreatment: 'serif-underline',
  },
  executive: {
    key: 'executive', label: 'Executive',
    colors: { primary: '14213D', secondary: '1F2937', accent: 'C9A227', background: 'FFFFFF', text: '14213D', textLight: '6B7280', coverBg: '14213D', coverText: 'FFFFFF' },
    fonts: { heading: 'Cambria', body: 'Calibri' },
    fontSizes: { title: 34, subtitle: 17, heading: 24, body: 15, small: 10 },
    borderRadius: 2, spacing: 'comfortable', visualTreatment: 'gold-rule',
  },
  creative: {
    key: 'creative', label: 'Creative',
    colors: { primary: '7C3AED', secondary: 'EC4899', accent: 'F59E0B', background: 'FFFFFF', text: '1F2937', textLight: '6B7280', coverBg: '7C3AED', coverText: 'FFFFFF' },
    fonts: { heading: 'Verdana', body: 'Verdana' },
    fontSizes: { title: 38, subtitle: 19, heading: 27, body: 16, small: 11 },
    borderRadius: 16, spacing: 'comfortable', visualTreatment: 'gradient-blocks',
  },
  dark: {
    key: 'dark', label: 'Dark',
    colors: { primary: 'F8FAFC', secondary: '93C5FD', accent: '38BDF8', background: '0F172A', text: 'F1F5F9', textLight: '94A3B8', coverBg: '1E293B', coverText: 'F8FAFC' },
    fonts: { heading: 'Calibri', body: 'Calibri' },
    fontSizes: { title: 36, subtitle: 18, heading: 26, body: 16, small: 11 },
    borderRadius: 8, spacing: 'comfortable', visualTreatment: 'dark-glow',
  },
  elegant: {
    key: 'elegant', label: 'Elegant',
    colors: { primary: '1F2937', secondary: 'B45309', accent: 'B45309', background: 'FFFDF7', text: '1F2937', textLight: '78716C', coverBg: '1F2937', coverText: 'FFFDF7' },
    fonts: { heading: 'Garamond', body: 'Garamond' },
    fontSizes: { title: 34, subtitle: 17, heading: 24, body: 15, small: 10 },
    borderRadius: 0, spacing: 'airy', visualTreatment: 'thin-rule-serif',
  },
  tech: {
    key: 'tech', label: 'Tech',
    colors: { primary: '0EA5E9', secondary: 'E2E8F0', accent: '22D3EE', background: '0B1220', text: 'E2E8F0', textLight: '93A3B8', coverBg: '111827', coverText: 'E2E8F0' },
    fonts: { heading: 'Consolas', body: 'Segoe UI' },
    fontSizes: { title: 34, subtitle: 17, heading: 24, body: 15, small: 10 },
    borderRadius: 4, spacing: 'compact', visualTreatment: 'grid-mono',
  },
};

export const DEFAULT_THEME_KEY = 'modern';

export function getTheme(key) {
  return THEMES[key] || THEMES[DEFAULT_THEME_KEY];
}
