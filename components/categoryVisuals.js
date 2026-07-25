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

export const CATEGORY_ACCENTS = {
  pdf: {
    gradient: 'linear-gradient(120deg, #EF4444 0%, #DC2626 100%)',
    pageBgTop: '#FFF8F7', pageBgBottom: '#FFF1EF',
    borderColor: '#FEE2E2', accentText: '#DC2626',
    focusRing: 'rgba(220,38,38,0.12)', shadowTint: 'rgba(220,38,38,0.15)',
    badgeFreeBg: '#FEE2E2', badgeFreeText: '#B91C1C',
  },
  business: {
    gradient: 'linear-gradient(120deg, #10B981 0%, #059669 100%)',
    pageBgTop: '#F0FDF4', pageBgBottom: '#ECFDF5',
    borderColor: '#A7F3D0', accentText: '#059669',
    focusRing: 'rgba(5,150,105,0.12)', shadowTint: 'rgba(5,150,105,0.15)',
    badgeFreeBg: '#D1FAE5', badgeFreeText: '#065F46',
  },
  ai: {
    gradient: 'linear-gradient(120deg, #8B5CF6 0%, #7C3AED 100%)',
    pageBgTop: '#F5F3FF', pageBgBottom: '#EDE9FE',
    borderColor: '#DDD6FE', accentText: '#7C3AED',
    focusRing: 'rgba(124,58,237,0.12)', shadowTint: 'rgba(124,58,237,0.15)',
    badgeFreeBg: '#EDE9FE', badgeFreeText: '#5B21B6',
  },
  image: {
    gradient: 'linear-gradient(120deg, #F59E0B 0%, #F97316 100%)',
    pageBgTop: '#FFFBEB', pageBgBottom: '#FEF3C7',
    borderColor: '#FDE68A', accentText: '#D97706',
    focusRing: 'rgba(217,119,6,0.12)', shadowTint: 'rgba(217,119,6,0.15)',
    badgeFreeBg: '#FEF3C7', badgeFreeText: '#92400E',
  },
  data: {
    gradient: 'linear-gradient(120deg, #22D3EE 0%, #0891B2 100%)',
    pageBgTop: '#ECFEFF', pageBgBottom: '#CFFAFE',
    borderColor: '#A5F3FC', accentText: '#0E7490',
    focusRing: 'rgba(8,145,178,0.12)', shadowTint: 'rgba(8,145,178,0.15)',
    badgeFreeBg: '#CFFAFE', badgeFreeText: '#155E63',
  },
  calculator: {
    gradient: 'linear-gradient(120deg, #2563EB 0%, #1D4ED8 100%)',
    pageBgTop: '#EFF6FF', pageBgBottom: '#DBEAFE',
    borderColor: '#BFDBFE', accentText: '#1D4ED8',
    focusRing: 'rgba(37,99,235,0.12)', shadowTint: 'rgba(37,99,235,0.25)',
    badgeFreeBg: '#DBEAFE', badgeFreeText: '#1E40AF',
  },
  utilities: {
    gradient: 'linear-gradient(120deg, #64748B 0%, #475569 100%)',
    pageBgTop: '#F8FAFC', pageBgBottom: '#F1F5F9',
    borderColor: '#E2E8F0', accentText: '#475569',
    focusRing: 'rgba(71,85,105,0.12)', shadowTint: 'rgba(71,85,105,0.15)',
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
    gradient: 'linear-gradient(120deg, #0EA5E9 0%, #0284C7 100%)',
    pageBgTop: '#F0F9FF', pageBgBottom: '#E0F2FE',
    borderColor: '#BAE6FD', accentText: '#0284C7',
    focusRing: 'rgba(2,132,199,0.12)', shadowTint: 'rgba(2,132,199,0.15)',
    badgeFreeBg: '#E0F2FE', badgeFreeText: '#075985',
  },
};
