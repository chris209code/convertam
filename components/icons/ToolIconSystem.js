'use client';

import { useId } from 'react';

// One illustration style for every icon in Convertam: a rounded-square chip
// in the tool's suite color, with a simple two-tone-stroke pictogram
// centered inside. Format-conversion tools (pdf-to-word, etc.) are the one
// deliberate exception — those show the source file format's own
// universally-recognized brand color instead of the suite color, since a
// file format's identity is a stronger, more useful signal there than
// which suite hosts the converter.
//
// Suite colors match components/categoryVisuals.js's CATEGORY_ACCENTS
// exactly, so a tool card and its hub page's header chip are always the
// same color family.
export const SUITE_GRADIENTS = {
  pdf: ['#EF4444', '#DC2626'],
  business: ['#10B981', '#059669'],
  ai: ['#8B5CF6', '#7C3AED'],
  image: ['#F59E0B', '#F97316'],
  calculator: ['#2563EB', '#1D4ED8'],
  utilities: ['#64748B', '#475569'],
  data: ['#22D3EE', '#0891B2'],
};

// Maps lib/tools-config.js's `category` field to a suite key, so any
// component that already has a tool object (not just a slug) can derive the
// right color without a second lookup table.
const CATEGORY_TO_SUITE = {
  'Document Conversion': 'pdf',
  'PDF Utilities': 'pdf',
  'PDF Tools': 'pdf',
  'PDF Editor': 'pdf',
  'Image Tools': 'image',
  'Business Tools': 'business',
  'Smart Converter': 'ai',
  Calculators: 'calculator',
  Utilities: 'utilities',
};

export function suiteForCategory(category) {
  return CATEGORY_TO_SUITE[category] || 'pdf';
}

const FORMAT_COLORS = {
  pdf: '#DC2626',
  word: '#1565C0',
  excel: '#1B7A3D',
  powerpoint: '#D24726',
  jpg: '#E67E22',
  png: '#7C3AED',
  html: '#0EA5E9',
};

const FORMAT_LABELS = { pdf: 'PDF', word: 'W', excel: 'X', powerpoint: 'P', jpg: 'JPG', png: 'PNG', html: '<>' };

// The ~10 tools whose entire job is converting one specific file format —
// these render the source format's badge instead of a suite-colored chip.
const FORMAT_BADGE_SLUGS = {
  'pdf-to-word': 'pdf',
  'pdf-to-excel': 'pdf',
  'pdf-to-powerpoint': 'pdf',
  'pdf-to-jpg': 'pdf',
  'pdf-to-png': 'pdf',
  'word-to-pdf': 'word',
  'excel-to-pdf': 'excel',
  'powerpoint-to-pdf': 'powerpoint',
  'jpg-to-pdf': 'jpg',
  'png-to-pdf': 'png',
};

function FormatBadge({ size, format }) {
  const color = FORMAT_COLORS[format] || FORMAT_COLORS.pdf;
  const label = FORMAT_LABELS[format] || 'PDF';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#F1F5F9" />
      <path d="M6.6 3.8A1.6 1.6 0 0 1 8.2 2.2H13l4 4v14.2a1.6 1.6 0 0 1-1.6 1.6H8.2a1.6 1.6 0 0 1-1.6-1.6z" fill="#fff" stroke="#E2E8F0" strokeWidth="0.7" />
      <path d="M13 2.2l4 4h-2.6a1.4 1.4 0 0 1-1.4-1.4z" fill={color} opacity="0.9" />
      <text x="10.9" y="16.4" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize={label.length > 2 ? 4.4 : 6} fontWeight="800" fill={color}>{label}</text>
    </svg>
  );
}

function Chip({ size, suite, children }) {
  const gid = useId();
  const [c1, c2] = SUITE_GRADIENTS[suite] || SUITE_GRADIENTS.pdf;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={c2} />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gid})`} />
      <g stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
        {children}
      </g>
    </svg>
  );
}

// Every functional (non-format-badge) glyph, one entry per tool slug. Kept
// to simple strokes/shapes on purpose — one consistent hand, not 64
// different illustration styles.
const GLYPHS = {
  // ---- PDF suite ----
  'html-to-pdf': (<><path d="M7 8l-3 4 3 4M17 8l3 4-3 4M13.5 6l-3 12" /></>),
  'merge-pdf': (<><rect x="5" y="7" width="6" height="11" rx="1" /><rect x="13" y="7" width="6" height="11" rx="1" /><path d="M11 12.5h2" /></>),
  'split-pdf': (<><rect x="4.5" y="6" width="7" height="12" rx="1" /><rect x="12.5" y="6" width="7" height="12" rx="1" /><path d="M12 4v16" strokeDasharray="2 2" /></>),
  'compress-pdf': (<><path d="M8 9l4-4 4 4M8 15l4 4 4-4" /><path d="M12 6v12" strokeDasharray="1 2.4" /></>),
  'rotate-pdf': (<><path d="M18 8.5A6.5 6.5 0 1 0 19 13" /><path d="M18.6 5v4h-4" /></>),
  'extract-pdf-pages': (<><rect x="5" y="5" width="9" height="12" rx="1" /><rect x="10" y="8" width="9" height="12" rx="1" fill="#00000022" /></>),
  'remove-pdf-pages': (<><rect x="6" y="4" width="12" height="16" rx="1.5" /><path d="M9 8h6M9 11h6M9 14h3" /><circle cx="18" cy="18" r="4.6" fill="#DC2626" stroke="none" /><path d="M16.3 18h3.4" stroke="#fff" /></>),
  'add-page-numbers': (<><rect x="6" y="4" width="12" height="16" rx="1.5" /><path d="M9 8h6M9 11h6" /><text x="15.6" y="17.4" fontSize="5.5" fontWeight="800" fill="#fff" stroke="none" textAnchor="middle">12</text></>),
  'protect-pdf': (<><rect x="6" y="10.5" width="12" height="9" rx="2" /><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" /><circle cx="12" cy="14.6" r="1.1" fill="#fff" stroke="none" /></>),
  'images-to-pdf': (<><rect x="4.5" y="9" width="9" height="9" rx="1.2" transform="rotate(-8 9 13.5)" /><rect x="10.5" y="5" width="9" height="12" rx="1.2" fill="#00000022" /></>),
  'extract-pdf-images': (<><rect x="5" y="4" width="10" height="14" rx="1.2" /><circle cx="8.4" cy="8.4" r="1.3" /><path d="M6 15l2.5-3 2 2 1.5-2 2.5 3" /><path d="M17 11v7M14.3 15.7L17 18.4l2.7-2.7" /></>),
  'compare-pdf': (<><rect x="4" y="5" width="8" height="14" rx="1.2" /><rect x="12.5" y="5" width="8" height="14" rx="1.2" /><path d="M7 9h2M7 12h2M7 15h2M15.5 9h2M15.5 12h2M15.5 15h2" /></>),
  'redact-pdf': (<><rect x="6" y="4" width="12" height="16" rx="1.5" /><path d="M9 8h6" /><rect x="8.7" y="10.4" width="6.6" height="2.6" rx="0.5" fill="#fff" stroke="none" /><path d="M9 16h5" /></>),
  'pdf-overlay': (<><rect x="5" y="6" width="10" height="13" rx="1.2" /><rect x="9" y="4" width="10" height="13" rx="1.2" fill="#00000022" /></>),
  'write-on-pdf': (<><rect x="5" y="4" width="12" height="16" rx="1.5" /><path d="M8 9h6M8 12h6" /><path d="M14 17.2l4.2-4.2 1.6 1.6-4.2 4.2H14z" fill="#fff" stroke="none" /></>),
  'fill-pdf': (<><rect x="6" y="4" width="12" height="16" rx="1.5" /><path d="M9 9h6M9 12.5h6M9 16h3.5" /><circle cx="17.5" cy="17" r="3.6" fill="#F59E0B" stroke="none" /><path d="M16 17l1 1 2-2" stroke="#fff" /></>),
  'sign-pdf': (<><rect x="5" y="4" width="14" height="16" rx="1.5" /><path d="M7.5 15.5c1.2-3 2.8-5.6 4-6s1 2.4 0 3.8 2.8-1.6 4.5-2.4" /></>),
  'reorder-pdf': (<><path d="M8 8h9M8 12h9M8 16h9" /><path d="M5 10l-1.6-2L5 6M5 18l-1.6-2L5 14" /></>),
  'watermark-pdf': (<><rect x="5" y="5" width="14" height="14" rx="1.5" /><path d="M8 15l4-7 4 7" opacity="0.55" /></>),
  'invoice-generator': (<><rect x="6" y="3.5" width="12" height="17" rx="1.5" /><path d="M9 8h6M9 11h6M9 14h4" /><text x="12" y="19" fontSize="4.6" fontWeight="800" fill="#fff" stroke="none" textAnchor="middle">$</text></>),

  // ---- Business suite ----
  'business-document-studio': (<><rect x="5" y="5" width="8" height="11" rx="1" /><rect x="11" y="8" width="8" height="11" rx="1" fill="#00000022" /><path d="M7 8h4M7 10.5h4" /></>),
  'quotation-generator': (<><rect x="6" y="3.5" width="12" height="17" rx="1.5" /><path d="M9 8h6M9 11h6" /><path d="M8.6 15.4l1.3 1.3 3.6-3.7" /></>),
  'id-card-generator': (<><rect x="4" y="6" width="16" height="12" rx="2" /><circle cx="9" cy="11" r="1.8" /><path d="M6.6 15.4c.6-1.6 1.5-2.4 2.4-2.4s1.8.8 2.4 2.4" /><path d="M14 10h4M14 13h4" /></>),
  'delivery-note-waybill': (<><rect x="4.5" y="10" width="11" height="7" rx="1" /><path d="M15.5 12h3l1.5 2.4V17h-4.5" /><circle cx="8" cy="18.3" r="1.4" fill="#fff" stroke="none" /><circle cx="17" cy="18.3" r="1.4" fill="#fff" stroke="none" /></>),

  // ---- AI / Smart Converter suite ----
  'summarize-pdf': (<><rect x="6" y="4" width="12" height="16" rx="1.5" /><path d="M9 9h6M9 12h6M9 15h3" /><path d="M16 4.8l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#fff" stroke="none" /></>),
  'smart-converter': (<><rect x="4.5" y="8" width="15" height="10.5" rx="2" /><circle cx="12" cy="13.2" r="2.6" /><path d="M9.5 8l1-2h3l1 2" /></>),
  'receipt-scanner': (<><path d="M6.5 4h11v15.5l-1.8-1.4-1.8 1.4-1.9-1.4-1.9 1.4-1.8-1.4-1.8 1.4z" /><path d="M9 8h6M9 11h6M9 14h3.5" /></>),
  'ocr-pdf': (<><rect x="4.5" y="4" width="11" height="15" rx="1.2" /><path d="M7 8.4h6M7 11h4" /><circle cx="16.2" cy="15.2" r="3.4" /><path d="M18.6 17.6l2 2" /></>),
  'cv-improver': (<><rect x="6" y="4" width="12" height="16" rx="1.5" /><circle cx="12" cy="9" r="1.9" /><path d="M8.6 14c.7-1.8 1.9-2.7 3.4-2.7s2.7.9 3.4 2.7" /><path d="M9 17.5h6" /></>),
  'qr-code-generator': (<><rect x="4.5" y="4.5" width="6" height="6" rx="0.6" /><rect x="13.5" y="4.5" width="6" height="6" rx="0.6" /><rect x="4.5" y="13.5" width="6" height="6" rx="0.6" /><rect x="14" y="14" width="2" height="2" fill="#fff" stroke="none" /><rect x="17.5" y="14" width="2" height="2" fill="#fff" stroke="none" /><rect x="14" y="17.5" width="2" height="2" fill="#fff" stroke="none" /><rect x="17.5" y="17.5" width="2" height="2" fill="#fff" stroke="none" /></>),
  'ask-solve-ai': (<><path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H10l-3.5 3.4V15h-1A2.5 2.5 0 0 1 3 12.5z" /><path d="M12 7.6a1.6 1.6 0 1 1 1.8 1.58c-.5.1-.8.5-.8 1v.32" strokeWidth="1.4" /><circle cx="13" cy="12.4" r="0.15" fill="#fff" stroke="#fff" strokeWidth="0.9" /></>),
  'document-translator': (<><rect x="4.5" y="4.5" width="10" height="15" rx="1.4" /><path d="M7 9h5M7 12h3.5" /><circle cx="17.5" cy="15.5" r="3.9" /><path d="M15.5 15.5h4M17.5 13v5" strokeWidth="1.3" /></>),
  'resume-builder': (<><rect x="6" y="4" width="12" height="16" rx="1.5" /><circle cx="12" cy="9" r="1.9" /><path d="M8.6 14c.7-1.8 1.9-2.7 3.4-2.7s2.7.9 3.4 2.7" /><path d="M9 17.5h6" opacity="0" /><path d="M17.5 6.5v3M16 8h3" strokeWidth="1.3" /></>),
  'cover-letter': (<><rect x="4.5" y="6" width="15" height="12" rx="1.5" /><path d="M4.5 7l7.5 6 7.5-6" /></>),
  'contract-summarizer': (<><rect x="6" y="3.5" width="12" height="17" rx="1.5" /><path d="M9 8h6M9 11h6M9 14h4" /><circle cx="15.5" cy="16.5" r="0.9" fill="#fff" stroke="none" /><circle cx="12" cy="16.5" r="0.9" fill="#fff" stroke="none" /><circle cx="8.5" cy="16.5" r="0.9" fill="#fff" stroke="none" /></>),
  'presentation-generator': (<><rect x="4" y="5.5" width="16" height="10.5" rx="1.3" /><path d="M8 15.5v3M16 15.5v3M6.5 19h11" /><path d="M7 9.5l3 2.4 2.5-3 4.5 3.6" strokeWidth="1.4" /></>),
  'data-analyst': (<><path d="M5 19V6M5 19h14" /><rect x="7.5" y="13" width="2.4" height="6" fill="#fff" stroke="none" /><rect x="11.3" y="9.5" width="2.4" height="9.5" fill="#fff" stroke="none" /><rect x="15.1" y="11.8" width="2.4" height="7.2" fill="#fff" stroke="none" /></>),

  // ---- Image suite ----
  'image-compressor': (<><rect x="4" y="5" width="16" height="14" rx="1.5" /><circle cx="9" cy="10" r="1.6" /><path d="M5.5 17l4-4.6 3 3 2.6-3.2 3.9 4.8" /><path d="M12 3.5v3M10.3 5.2H13.7" strokeWidth="1.3" /></>),
  'resize-image': (<><rect x="5" y="6" width="14" height="12" rx="1.5" /><path d="M8 15l3-3.5 2.2 2.2 2-2.5 2.8 3.4" strokeWidth="1.3" /><path d="M5 4.6h3.4M4.6 5v3.4M19 19.4h-3.4M19.4 19v-3.4" strokeWidth="1.4" /></>),
  'watermark-image': (<><rect x="4" y="5" width="16" height="14" rx="1.5" /><circle cx="9" cy="10" r="1.6" /><path d="M5.5 17l4-4.6 3 3 2.6-3.2 3.9 4.8" opacity="0.5" /><path d="M13 14.5l3.5-6 3.5 6" opacity="0.85" strokeWidth="1.3" /></>),
  'convert-image-format': (<><rect x="4" y="7.5" width="8.5" height="9" rx="1.2" /><rect x="11.5" y="7.5" width="8.5" height="9" rx="1.2" fill="#00000022" /><path d="M9 5l1.5 1.5L9 8M15 16l-1.5-1.5L15 13" strokeWidth="1.3" /></>),
  'meme-generator': (<><rect x="4" y="4.5" width="16" height="15" rx="1.5" /><path d="M6.5 8.5h11M6.5 15.5h11" strokeWidth="2.1" /><circle cx="9.5" cy="12" r="1.3" /><circle cx="14.5" cy="12" r="1.3" /></>),
  'document-enhancer': (<><path d="M6 5.5A1.5 1.5 0 0 1 7.5 4h6l3 3v13a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 6 20z" /><path d="M17.5 3l0.8 1.9 1.9 0.8-1.9 0.8-0.8 1.9-0.8-1.9-1.9-0.8 1.9-0.8z" fill="#fff" stroke="none" /><path d="M9.5 13.5h5M9.5 16.5h3.5" strokeWidth="1.3" /></>),

  // ---- Calculators suite ----
  'salary-calculator': (<><rect x="5" y="3.5" width="14" height="17" rx="2" /><rect x="7" y="5.7" width="10" height="3.6" rx="0.8" fill="#00000022" stroke="none" /><circle cx="9" cy="13.4" r="1.1" fill="#fff" stroke="none" /><circle cx="12" cy="13.4" r="1.1" fill="#fff" stroke="none" /><circle cx="15" cy="13.4" r="1.1" fill="#fff" stroke="none" /><rect x="7.8" y="16.4" width="8.4" height="2" rx="1" fill="#fff" stroke="none" /></>),
  'loan-calculator': (<><path d="M4.5 20V10L12 4l7.5 6v10z" /><path d="M9.5 20v-6h5v6" strokeWidth="1.3" /><text x="15.5" y="9.5" fontSize="4.6" fontWeight="800" fill="#fff" stroke="none" textAnchor="middle">%</text></>),
  'vat-calculator': (<><rect x="5" y="3.5" width="14" height="17" rx="2" /><rect x="7" y="5.7" width="10" height="3.6" rx="0.8" fill="#00000022" stroke="none" /><path d="M8 17l8-7" strokeWidth="1.4" /><circle cx="9" cy="10.3" r="1" fill="#fff" stroke="none" /><circle cx="15" cy="16.7" r="1" fill="#fff" stroke="none" /></>),
  'profit-margin': (<><path d="M5 19V6M5 19h14" /><path d="M6.5 15l3.5-4 3 2.6 4.5-6" strokeWidth="1.4" /><path d="M17.5 7.6h2v2" strokeWidth="1.4" /></>),
  'discount-calculator': (<><path d="M5 12.5l7-7.5h6v6l-7.5 7z" /><circle cx="14" cy="8" r="1.1" fill="#fff" stroke="none" /><path d="M9 15l6-6" strokeWidth="1.4" /></>),
  'age-calculator': (<><rect x="4.5" y="5" width="15" height="14.5" rx="1.6" /><path d="M4.5 9h15" /><path d="M8 3.5v3M16 3.5v3" strokeWidth="1.4" /><circle cx="12" cy="14" r="2.4" strokeWidth="1.3" /><path d="M12 12.6v1.5l1 0.7" strokeWidth="1.2" /></>),
  'expense-budget-calculator': (<><path d="M4.5 8.5A2 2 0 0 1 6.5 6.5h10.2a1.3 1.3 0 0 1 1.3 1.3v9.4a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2z" /><circle cx="16.3" cy="12.3" r="1.1" fill="#fff" stroke="none" /><path d="M4.5 10.3h13.6" strokeWidth="1.3" /></>),
  'break-even-calculator': (<><path d="M5 19V6M5 19h14" /><path d="M6.5 17.5l11-11" strokeWidth="1.4" /><path d="M6.5 8l11 9.5" strokeWidth="1.4" opacity="0.6" /><circle cx="12" cy="13.2" r="1.1" fill="#fff" stroke="none" /></>),
  'savings-goal-calculator': (<><circle cx="12" cy="12" r="7.3" /><circle cx="12" cy="12" r="4.1" /><circle cx="12" cy="12" r="1" fill="#fff" stroke="none" /><path d="M16.6 7.4L19 5" strokeWidth="1.4" /></>),

  // ---- Utilities suite ----
  'password-generator': (<><circle cx="9.3" cy="9.3" r="4.3" /><path d="M12.4 12.4L20 20M16.4 16.4l1.8 1.8M19 14.8l2 2" strokeWidth="1.6" /><circle cx="9.3" cy="9.3" r="1.3" fill="#fff" stroke="none" /></>),
  'utilities-hub': (<><path d="M14.5 4a3.7 3.7 0 0 0-4.6 4.6L4 14.5V19h4.5l5.9-5.9a3.7 3.7 0 0 0 4.6-4.6l-2.7 2.7-2-2z" /></>),
};

// A neutral fallback for any slug not yet in GLYPHS (a plain generic document
// glyph) — keeps the system safe against new tools being added before their
// bespoke icon is drawn, rather than silently rendering nothing.
const FALLBACK_GLYPH = (<><rect x="6" y="4" width="12" height="16" rx="1.5" /><path d="M9 9h6M9 12h6M9 15h4" /></>);

export function getToolIconSuite(slug, category) {
  return category ? suiteForCategory(category) : 'pdf';
}

export function ToolIcon({ slug, suite = 'pdf', size = 24 }) {
  const format = FORMAT_BADGE_SLUGS[slug];
  if (format) return <FormatBadge size={size} format={format} />;
  return <Chip size={size} suite={suite}>{GLYPHS[slug] || FALLBACK_GLYPH}</Chip>;
}

// Larger, category-level pictograms — one per suite, used anywhere a whole
// category/suite (not a single tool) needs an icon: hub page headers, the
// homepage category cards, the nav dropdown, and "related category" cards.
const CATEGORY_GLYPHS = {
  pdf: (<><path d="M7 3.6A1.6 1.6 0 0 1 8.6 2H13l4 4v14.4A1.6 1.6 0 0 1 15.4 22H8.6A1.6 1.6 0 0 1 7 20.4z" /><path d="M13 2v2.6A1.4 1.4 0 0 0 14.4 6H17" /><path d="M10 12.5h4M10 15.5h4" /></>),
  business: (<><rect x="3.2" y="8.4" width="17.6" height="12" rx="2.2" /><path d="M9 8.4V6.6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.8" /><path d="M3.2 13.4h17.6" /></>),
  ai: (<><rect x="4.5" y="7.6" width="15" height="12" rx="3.4" /><path d="M12 7.6V4.6" /><circle cx="12" cy="3.4" r="1.2" fill="#fff" stroke="none" /><circle cx="9.3" cy="13.4" r="1.4" fill="#fff" stroke="none" /><circle cx="14.7" cy="13.4" r="1.4" fill="#fff" stroke="none" /><path d="M9.4 17h5.2" /></>),
  image: (<><rect x="3.2" y="4.6" width="17.6" height="14.8" rx="2.2" /><circle cx="8.6" cy="9.6" r="1.9" /><path d="M4.7 17.6l4.7-5.8 3.4 3.4 3-3.6 4.5 5.4" /></>),
  calculator: (<><rect x="5.6" y="2.6" width="12.8" height="18.8" rx="2.4" /><rect x="7.6" y="4.8" width="8.8" height="4.2" rx="1" fill="#fff" opacity="0.28" stroke="none" /><path d="M8.4 12.6h.01M12 12.6h.01M15.6 12.6h.01M8.4 15.8h.01M12 15.8h.01M15.6 15.8h.01" strokeWidth="2.6" /><path d="M8.4 19h7.2" /></>),
  utilities: (<><path d="M16 4.4a4.4 4.4 0 0 0-5.5 5.5L4 16.4V20h3.6l6.5-6.5a4.4 4.4 0 0 0 5.5-5.5l-3.2 3.2-2.4-2.4z" /></>),
  data: (<><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6" /><path d="M4 11c0 1.66 3.58 3 8 3s8-1.34 8-3" opacity="0.6" /></>),
};

export function CategoryIcon({ suite = 'pdf', size = 30 }) {
  return <Chip size={size} suite={suite}>{CATEGORY_GLYPHS[suite] || CATEGORY_GLYPHS.pdf}</Chip>;
}

// Small icons for the named sub-groups within a hub page (Conversion,
// Editing, Organize…) — same chip system, smaller size, next to a section
// heading rather than a whole category.
const SECTION_GLYPHS = {
  conversion: (<><path d="M7 8h8M7 8l2.4-2.4M17 16H9M17 16l-2.4 2.4" /></>),
  editing: (<><path d="M6 18.2l3.6-1 8-8-2.6-2.6-8 8z" /><path d="M15.8 9.4l1.8-1.8-2.6-2.6-1.8 1.8" /></>),
  organize: (<><rect x="4.5" y="9" width="15" height="9.5" rx="1.5" /><path d="M4.5 9V7.2a1.4 1.4 0 0 1 1.4-1.4h3.4l1.6 1.8h6.6a1.4 1.4 0 0 1 1.4 1.4V9" /></>),
  security: (<><rect x="6" y="10.5" width="12" height="9" rx="2" /><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" /></>),
  optimization: (<><path d="M13 3L5 14h5.5L10 21l8-11h-5.5z" /></>),
  export: (<><path d="M12 15V4M8 8l4-4 4 4" /><path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" /></>),
  all: (<><rect x="4.5" y="4.5" width="6" height="6" rx="1" /><rect x="13.5" y="4.5" width="6" height="6" rx="1" /><rect x="4.5" y="13.5" width="6" height="6" rx="1" /><rect x="13.5" y="13.5" width="6" height="6" rx="1" /></>),
  'text-tools': (<><path d="M5 6.5h14M8 6.5v11M12 12h5" /></>),
  'data-tools': (<><ellipse cx="12" cy="6.5" rx="7" ry="2.6" /><path d="M5 6.5v11c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6v-11" /></>),
  'extract-convert': (<><path d="M4.5 12h9M13.5 12l-2.6-2.6M13.5 12l-2.6 2.6" /><path d="M15.5 8l4-2.5M15.5 16l4 2.5" /></>),
  'encoding-tools': (<><rect x="7" y="10.5" width="10" height="8" rx="1.6" /><path d="M9.2 10.5V8.2a2.8 2.8 0 0 1 5.6 0v2.3" /></>),
};

// Aliases: the workspace-group taxonomy (lib/tools-config.js's
// `workspaceGroup`) uses short ids ('edit', 'optimize') that don't quite
// match the hub-page section ids ('editing', 'optimization') — same glyphs.
SECTION_GLYPHS.edit = SECTION_GLYPHS.editing;
SECTION_GLYPHS.optimize = SECTION_GLYPHS.optimization;

export function SectionIcon({ id, suite = 'pdf', size = 20 }) {
  return <Chip size={size} suite={suite}>{SECTION_GLYPHS[id] || SECTION_GLYPHS.all}</Chip>;
}
