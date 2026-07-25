// Shared category icon + accent-color tokens, reused across the homepage
// category cards, every hub page, the Header nav, and Learn so the same
// icon and colour language shows up everywhere a category appears.
//
// Icons come from the official Convertam Visual System export
// (public/visuals/icons/category/*.svg) — each one is a self-contained tile
// (its own white card + border + drop shadow baked in), so it renders
// correctly on any background without an extra colored wrapper. The colour
// tokens below match that same package's palette exactly (PDF=blue,
// Business=red, Career=green, AI=purple, Image=orange, Calculators=steel,
// Utilities=slate) — a deliberate reassignment from the site's previous
// category colours (PDF used to be red, Business used to be green), made to
// stay faithful to the supplied design system rather than mixing old and
// new colour identities across pages.

function CategoryIcon({ src, alt = '', size = 30 }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} width={size} height={size} style={{ display: 'block' }} />;
}

export const PdfIcon = <CategoryIcon src="/visuals/icons/category/pdf-suite.svg" />;
export const BusinessIcon = <CategoryIcon src="/visuals/icons/category/business-suite.svg" />;
export const AiIcon = <CategoryIcon src="/visuals/icons/category/ai-workspace.svg" />;
export const ImageIcon = <CategoryIcon src="/visuals/icons/category/image-studio.svg" />;
export const CalculatorIcon = <CategoryIcon src="/visuals/icons/category/calculators.svg" />;
export const UtilitiesIcon = <CategoryIcon src="/visuals/icons/category/utilities.svg" />;
export const CareerIcon = <CategoryIcon src="/visuals/icons/category/career-studio.svg" />;

// No supplied replacement exists for these two (Data Workspace is hidden
// from navigation; Workflow is a Learn-only content grouping, not a product
// category) — kept as the original hand-drawn icons rather than inventing
// new assets outside the supplied package.
export const DataIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24">
    <rect x="6" y="3" width="14" height="15" rx="2" fill="#fff" opacity="0.3" />
    <rect x="3" y="5" width="14" height="15" rx="2" fill="#fff" />
    <g stroke="#000" strokeOpacity="0.15" strokeWidth="1">
      <line x1="3" y1="9.5" x2="17" y2="9.5" />
      <line x1="3" y1="13" x2="17" y2="13" />
      <line x1="3" y1="16.5" x2="17" y2="16.5" />
    </g>
    <circle cx="14.3" cy="9.5" r="1.6" fill="#0891B2" />
  </svg>
);

export const WorkflowIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24">
    <path d="M6 7.5 L12 12 L18 7.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    <path d="M6 16.5 L12 12 L18 16.5" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
    <circle cx="6" cy="7.5" r="3" fill="#fff" />
    <circle cx="18" cy="7.5" r="3" fill="#fff" />
    <circle cx="6" cy="16.5" r="3" fill="#fff" />
    <circle cx="18" cy="16.5" r="3" fill="#fff" />
    <circle cx="12" cy="12" r="3.4" fill="#fff" />
    <circle cx="12" cy="12" r="1.4" fill="#4F46E5" />
  </svg>
);

// Colors below are the exact per-category values from the supplied visual
// system's data/icon-mapping.json (pdf #246BFE, business #F43F3F, career
// #14B875, ai #7C3AED, image #FF7A1A, calculator #58749A, utility #667085)
// — the same accent each category's icon SVG is drawn in — so every page
// that shares this file stays consistent with the package, not just the
// homepage suite cards.
export const CATEGORY_ACCENTS = {
  pdf: {
    gradient: 'linear-gradient(120deg, #246BFE 0%, #1D58D0 100%)',
    pageBgTop: '#F5F8FF', pageBgBottom: '#EAF1FF',
    borderColor: '#CBDCFB', accentText: '#1D58D0',
    focusRing: 'rgba(36,107,254,0.12)', shadowTint: 'rgba(36,107,254,0.15)',
    badgeFreeBg: '#DCE9FF', badgeFreeText: '#173F99',
  },
  business: {
    gradient: 'linear-gradient(120deg, #F43F3F 0%, #CF3636 100%)',
    pageBgTop: '#FFF6F6', pageBgBottom: '#FFE9E9',
    borderColor: '#FBCFCF', accentText: '#CF3636',
    focusRing: 'rgba(244,63,63,0.12)', shadowTint: 'rgba(244,63,63,0.15)',
    badgeFreeBg: '#FCDCDC', badgeFreeText: '#9F2A2A',
  },
  ai: {
    gradient: 'linear-gradient(120deg, #8B5CF6 0%, #7C3AED 100%)',
    pageBgTop: '#F5F3FF', pageBgBottom: '#EDE9FE',
    borderColor: '#DDD6FE', accentText: '#7C3AED',
    focusRing: 'rgba(124,58,237,0.12)', shadowTint: 'rgba(124,58,237,0.15)',
    badgeFreeBg: '#EDE9FE', badgeFreeText: '#5B21B6',
  },
  image: {
    gradient: 'linear-gradient(120deg, #FF7A1A 0%, #D96816 100%)',
    pageBgTop: '#FFF7ED', pageBgBottom: '#FFEDD5',
    borderColor: '#FED7AA', accentText: '#D96816',
    focusRing: 'rgba(255,122,26,0.12)', shadowTint: 'rgba(255,122,26,0.15)',
    badgeFreeBg: '#FFEDD5', badgeFreeText: '#9A3412',
  },
  data: {
    gradient: 'linear-gradient(120deg, #22D3EE 0%, #0891B2 100%)',
    pageBgTop: '#ECFEFF', pageBgBottom: '#CFFAFE',
    borderColor: '#A5F3FC', accentText: '#0E7490',
    focusRing: 'rgba(8,145,178,0.12)', shadowTint: 'rgba(8,145,178,0.15)',
    badgeFreeBg: '#CFFAFE', badgeFreeText: '#155E63',
  },
  calculator: {
    gradient: 'linear-gradient(120deg, #58749A 0%, #4B6383 100%)',
    pageBgTop: '#F7F8FA', pageBgBottom: '#EEF1F5',
    borderColor: '#DDE3EB', accentText: '#4B6383',
    focusRing: 'rgba(88,116,154,0.12)', shadowTint: 'rgba(88,116,154,0.25)',
    badgeFreeBg: '#DDE3EB', badgeFreeText: '#35465C',
  },
  utilities: {
    gradient: 'linear-gradient(120deg, #667085 0%, #575F71 100%)',
    pageBgTop: '#F8FAFC', pageBgBottom: '#F1F5F9',
    borderColor: '#E2E8F0', accentText: '#575F71',
    focusRing: 'rgba(102,112,133,0.12)', shadowTint: 'rgba(102,112,133,0.15)',
    badgeFreeBg: '#E2E8F0', badgeFreeText: '#334155',
  },
  workflow: {
    gradient: 'linear-gradient(120deg, #6366F1 0%, #4F46E5 100%)',
    pageBgTop: '#EEF2FF', pageBgBottom: '#E0E7FF',
    borderColor: '#C7D2FE', accentText: '#4F46E5',
    focusRing: 'rgba(79,70,229,0.12)', shadowTint: 'rgba(79,70,229,0.15)',
    badgeFreeBg: '#E0E7FF', badgeFreeText: '#3730A3',
  },
  career: {
    gradient: 'linear-gradient(120deg, #14B875 0%, #0E9F63 100%)',
    pageBgTop: '#F0FDF7', pageBgBottom: '#DDFBEC',
    borderColor: '#BBF3D8', accentText: '#0E9F63',
    focusRing: 'rgba(20,184,117,0.12)', shadowTint: 'rgba(20,184,117,0.15)',
    badgeFreeBg: '#DDFBEC', badgeFreeText: '#0A6E45',
  },
};
