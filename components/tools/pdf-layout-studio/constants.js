// Shared constants for the PDF Layout Studio workspace
// (components/tools/pdf-layout-studio/*).
export const RENDER_SCALE = 1.5;

export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export const DEFAULT_FONT_SIZE = 20;

export const INK_COLORS = ['#111827', '#DC2626', '#2563EB', '#059669', '#EA580C', '#7C3AED'];

export const FONT_FAMILIES = [
  { id: 'sans', label: 'Sans-serif' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Monospace' },
];

export const DATE_FORMATS = [
  { id: 'long', label: 'Jan 1, 2026', format: (d) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) },
  { id: 'short', label: '01/01/2026', format: (d) => d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) },
  { id: 'iso', label: '2026-01-01', format: (d) => d.toISOString().slice(0, 10) },
];

// Professional stamp presets — a fixed label + color pairing, matching the
// common set the standalone Sign Documents/Redact stamp libraries already
// use elsewhere in this app. Each renders as a colored bordered box with
// the label centered inside (see objectTypes/stamp.js) rather than a
// pre-rendered image, so color/size/rotation stay fully editable like every
// other element type instead of being baked into a bitmap.
export const STAMP_PRESETS = [
  { id: 'approved', label: 'APPROVED', color: '#15803D' },
  { id: 'confidential', label: 'CONFIDENTIAL', color: '#B91C1C' },
  { id: 'draft', label: 'DRAFT', color: '#475569' },
  { id: 'paid', label: 'PAID', color: '#1D4ED8' },
  { id: 'void', label: 'VOID', color: '#B91C1C' },
  { id: 'urgent', label: 'URGENT', color: '#C2410C' },
  { id: 'copy', label: 'COPY', color: '#475569' },
  { id: 'original', label: 'ORIGINAL', color: '#15803D' },
];
