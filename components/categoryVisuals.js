// Shared category accent tokens + header icons, reused across the homepage
// category cards and each category's own hub page so the same icon and
// colour language shows up everywhere a category appears. Icons come from
// components/icons/ToolIconSystem.js — the one illustration style used for
// every icon in the app — so a hub page's header chip, its tool cards, and
// its homepage card are always drawn by the same hand.
import { CategoryIcon } from './icons/ToolIconSystem';

export const PdfIcon = <CategoryIcon suite="pdf" size={30} />;
export const BusinessIcon = <CategoryIcon suite="business" size={30} />;
export const AiIcon = <CategoryIcon suite="ai" size={30} />;
export const ImageIcon = <CategoryIcon suite="image" size={30} />;
export const CalculatorIcon = <CategoryIcon suite="calculator" size={30} />;
export const DataIcon = <CategoryIcon suite="data" size={30} />;
export const UtilitiesIcon = <CategoryIcon suite="utilities" size={30} />;

export const CATEGORY_ACCENTS = {
  pdf: {
    key: 'pdf',
    gradient: 'linear-gradient(120deg, #EF4444 0%, #DC2626 100%)',
    pageBgTop: '#FFF8F7', pageBgBottom: '#FFF1EF',
    borderColor: '#FEE2E2', accentText: '#DC2626',
    focusRing: 'rgba(220,38,38,0.12)', shadowTint: 'rgba(220,38,38,0.15)',
    badgeFreeBg: '#FEE2E2', badgeFreeText: '#B91C1C',
  },
  business: {
    key: 'business',
    gradient: 'linear-gradient(120deg, #10B981 0%, #059669 100%)',
    pageBgTop: '#F0FDF4', pageBgBottom: '#ECFDF5',
    borderColor: '#A7F3D0', accentText: '#059669',
    focusRing: 'rgba(5,150,105,0.12)', shadowTint: 'rgba(5,150,105,0.15)',
    badgeFreeBg: '#D1FAE5', badgeFreeText: '#065F46',
  },
  ai: {
    key: 'ai',
    gradient: 'linear-gradient(120deg, #8B5CF6 0%, #7C3AED 100%)',
    pageBgTop: '#F5F3FF', pageBgBottom: '#EDE9FE',
    borderColor: '#DDD6FE', accentText: '#7C3AED',
    focusRing: 'rgba(124,58,237,0.12)', shadowTint: 'rgba(124,58,237,0.15)',
    badgeFreeBg: '#EDE9FE', badgeFreeText: '#5B21B6',
  },
  image: {
    key: 'image',
    gradient: 'linear-gradient(120deg, #F59E0B 0%, #F97316 100%)',
    pageBgTop: '#FFFBEB', pageBgBottom: '#FEF3C7',
    borderColor: '#FDE68A', accentText: '#D97706',
    focusRing: 'rgba(217,119,6,0.12)', shadowTint: 'rgba(217,119,6,0.15)',
    badgeFreeBg: '#FEF3C7', badgeFreeText: '#92400E',
  },
  data: {
    key: 'data',
    gradient: 'linear-gradient(120deg, #22D3EE 0%, #0891B2 100%)',
    pageBgTop: '#ECFEFF', pageBgBottom: '#CFFAFE',
    borderColor: '#A5F3FC', accentText: '#0E7490',
    focusRing: 'rgba(8,145,178,0.12)', shadowTint: 'rgba(8,145,178,0.15)',
    badgeFreeBg: '#CFFAFE', badgeFreeText: '#155E63',
  },
  calculator: {
    key: 'calculator',
    gradient: 'linear-gradient(120deg, #2563EB 0%, #1D4ED8 100%)',
    pageBgTop: '#EFF6FF', pageBgBottom: '#DBEAFE',
    borderColor: '#BFDBFE', accentText: '#1D4ED8',
    focusRing: 'rgba(37,99,235,0.12)', shadowTint: 'rgba(37,99,235,0.25)',
    badgeFreeBg: '#DBEAFE', badgeFreeText: '#1E40AF',
  },
  utilities: {
    key: 'utilities',
    gradient: 'linear-gradient(120deg, #64748B 0%, #475569 100%)',
    pageBgTop: '#F8FAFC', pageBgBottom: '#F1F5F9',
    borderColor: '#E2E8F0', accentText: '#475569',
    focusRing: 'rgba(71,85,105,0.12)', shadowTint: 'rgba(71,85,105,0.15)',
    badgeFreeBg: '#E2E8F0', badgeFreeText: '#334155',
  },
};
