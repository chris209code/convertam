// Shared style tokens for Smart Parser — the same cyan/teal Data Workspace
// accent already used on the homepage card and /data-tools hub
// (components/HomePageClient.js, app/data-tools/page.js), so this reads as
// the same category rather than a bolted-on visual language.
export const T = {
  font: "'IBM Plex Sans', -apple-system, sans-serif",
  ink: '#0F172A',
  inkSecondary: '#334155',
  muted: '#94A3B8',
  mutedDark: '#64748B',
  border: '#E2E8F0',
  borderLight: '#EEF2F6',
  pageBg: '#F8FEFF',
  cardBg: '#FFFFFF',
  accent: '#0891B2',
  accentDark: '#0E7490',
  accentTint: '#ECFEFF',
  accentBorder: '#A5F3FC',
  accentGradient: 'linear-gradient(120deg, #22D3EE 0%, #0891B2 100%)',
  danger: '#DC2626',
  dangerTint: '#FEF2F2',
  warning: '#D97706',
  warningTint: '#FFFBEB',
  success: '#059669',
  successTint: '#ECFDF5',
};

export function confidenceColor(level) {
  if (level === 'high') return { fg: T.success, bg: T.successTint, border: '#A7F3D0' };
  if (level === 'medium') return { fg: T.warning, bg: T.warningTint, border: '#FDE68A' };
  return { fg: T.danger, bg: T.dangerTint, border: '#FECACA' };
}
