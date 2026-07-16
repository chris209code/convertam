// Canvas is a fixed logical A4 page (210mm x 297mm at 96dpi), scaled
// visually via CSS transform for both the editor preview and print output.
// Previously this was 816x1056 (US Letter, 8.5x11in) — corrected to true A4
// per an explicit requirement that the preview maintain A4 proportions.
export const CANVAS_W = 794;
export const CANVAS_H = 1123;

export const SNAP_THRESHOLD = 6;

export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;
export const ZOOM_DEFAULT = 0.82;

export const HISTORY_LIMIT = 60;

export const CURRENCIES = [
  { code: 'NGN', locale: 'en-NG', symbol: '₦', words: 'Naira' },
  { code: 'USD', locale: 'en-US', symbol: '$', words: 'Dollars' },
  { code: 'GBP', locale: 'en-GB', symbol: '£', words: 'Pounds Sterling' },
  { code: 'EUR', locale: 'en-IE', symbol: '€', words: 'Euros' },
  { code: 'GHS', locale: 'en-GH', symbol: 'GH₵', words: 'Cedis' },
  { code: 'ZAR', locale: 'en-ZA', symbol: 'R', words: 'Rand' },
  { code: 'KES', locale: 'en-KE', symbol: 'KSh', words: 'Shillings' },
];

export const DEFAULT_CURRENCY = 'NGN';
export const DEFAULT_VAT_RATE = 7.5;
export const DEFAULT_DISCOUNT = 0;

export const ALL_PAYMENT_METHODS = ['Bank Transfer', 'POS', 'USSD', 'Cash'];

// Old single-template Invoice Generator's saved business profile. Read-only —
// Invoice Studio seeds a new template from it once, but never writes to it,
// so the legacy tool (until removed) keeps working off its own copy.
export const LEGACY_BIZ_PROFILE_KEY = 'convertam_biz_profile_v2';

export const DRAFT_STORAGE_PREFIX = 'convertam_invoice_studio';
export const DRAFT_SCHEMA_VERSION = 1;
