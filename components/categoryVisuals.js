// Shared "engraved paper" icon set + accent tokens, reused across the
// homepage category cards and each category's own hub page so the same
// icon and colour language shows up everywhere a category appears.

export const PdfIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24">
    <rect x="6.5" y="3" width="12.5" height="17" rx="2" fill="#fff" opacity="0.32" />
    <path d="M3 4.8A1.8 1.8 0 0 1 4.8 3H13l4 4v11.2A1.8 1.8 0 0 1 15.2 20H4.8A1.8 1.8 0 0 1 3 18.2z" fill="#fff" />
    <path d="M13 3l4 4h-2.6A1.4 1.4 0 0 1 13 5.6z" fill="#fff" opacity="0.55" />
    <text x="9.4" y="16.2" fontFamily="Arial, sans-serif" fontSize="5.6" fontWeight="800" fill="#DC2626" textAnchor="middle">PDF</text>
  </svg>
);

export const BusinessIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24">
    <rect x="3.5" y="9.5" width="18" height="12" rx="2.5" fill="#fff" opacity="0.3" />
    <path d="M9 8.2V6.6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.6" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="2" y="8" width="20" height="13" rx="2.5" fill="#fff" />
    <rect x="2" y="13.2" width="20" height="1" fill="#000" opacity="0.14" />
    <rect x="10.2" y="12.4" width="3.6" height="2.6" rx="0.6" fill="#059669" />
  </svg>
);

export const AiIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24">
    <ellipse cx="12" cy="12" rx="9.5" ry="4.2" fill="none" stroke="#fff" strokeWidth="1.1" opacity="0.4" transform="rotate(-18 12 12)" />
    <path d="M11.5 4l1.6 4.6L17.5 10l-4.4 1.6L11.5 16l-1.6-4.4L5.5 10l4.4-1.4z" fill="#fff" />
    <path d="M17.2 15.3l0.8 2.1 2.1 0.8-2.1 0.8-0.8 2.1-0.8-2.1-2.1-0.8 2.1-0.8z" fill="#7C3AED" />
  </svg>
);

export const ImageIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24">
    <rect x="6" y="3.2" width="14.5" height="14.5" rx="2" fill="#fff" opacity="0.3" transform="rotate(7 12 12)" />
    <rect x="3" y="5" width="15" height="15" rx="2" fill="#fff" />
    <path d="M4.5 17.5l4-5 3 3.2 2.6-3.6 3.9 5.4z" fill="#000" opacity="0.15" />
    <circle cx="7.3" cy="8.6" r="1.7" fill="#EA580C" />
  </svg>
);

export const CalculatorIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24">
    <rect x="4.5" y="2" width="15" height="20" rx="2.5" fill="#fff" />
    <rect x="6.3" y="4" width="11.4" height="4.4" rx="1" fill="#2563EB" />
    <g fill="#000" opacity="0.16">
      <rect x="6.3" y="10.4" width="3" height="2.4" rx="0.6" /><rect x="10.5" y="10.4" width="3" height="2.4" rx="0.6" /><rect x="14.7" y="10.4" width="3" height="2.4" rx="0.6" />
      <rect x="6.3" y="14" width="3" height="2.4" rx="0.6" /><rect x="10.5" y="14" width="3" height="2.4" rx="0.6" /><rect x="14.7" y="14" width="3" height="2.4" rx="0.6" />
      <rect x="6.3" y="17.6" width="11.4" height="2.4" rx="0.6" />
    </g>
  </svg>
);

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

export const UtilitiesIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24">
    <ellipse cx="12" cy="19.6" rx="8.5" ry="1.5" fill="#fff" opacity="0.2" />
    <path d="M8.5 7.6V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.6" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    <rect x="3" y="7.6" width="18" height="11.4" rx="2" fill="#fff" />
    <rect x="3" y="12.1" width="18" height="1" fill="#000" opacity="0.14" />
    <rect x="10.2" y="11.3" width="3.6" height="2.6" rx="0.6" fill="#334155" />
  </svg>
);

// Three connected nodes — represents a Learn "Workflow Guide": several
// Convertam tools chained together into one repeatable process.
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
};
