// The document is now an ordered set of sections, not a flat list of
// positioned elements. Order in this object (and the SECTION_ORDER array)
// IS the layout — there is no x/y/w/h anywhere in this file. Height is
// never specified; it's whatever the content needs, computed by whichever
// renderer (editor or PDF) is currently displaying it.

import { readLegacyBizProfile } from './legacySeed';

export const CURRENCIES = [
  { code: 'NGN', symbol: '₦' }, { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' }, { code: 'GHS', symbol: '₵' }, { code: 'KES', symbol: 'KSh' },
  { code: 'ZAR', symbol: 'R' }, { code: 'CAD', symbol: 'CA$' },
];

export const ALL_PAYMENT_METHODS = ['Bank Transfer', 'POS', 'USSD', 'Cash'];

// The order sections render in — this array IS the document flow. Adding,
// removing, or reordering a section here changes the whole document's
// layout with no coordinate math involved anywhere.
export const SECTION_ORDER = [
  'letterhead', 'header', 'clientInfo', 'itemsTable', 'totals',
  'notes', 'payment', 'bank', 'signature', 'terms', 'watermark', 'footer',
];

const SAMPLE_ROWS = [
  { name: 'Ergonomic Office Chair', desc: 'Mesh back, adjustable lumbar support', qty: 4, rate: 85000, vat: 7.5, img: null },
  { name: 'Standing Desk 140cm', desc: 'Electric height adjustment, oak finish', qty: 2, rate: 210000, vat: 7.5, img: null },
  { name: 'Desk Organizer Set', desc: 'Bamboo, 5-piece set', qty: 6, rate: 12500, vat: 7.5, img: null },
];

export function buildDefaultSections() {
  return {
    letterhead: { visible: false, src: null },
    header: {
      visible: true, logoSrc: null, logoShape: 'circle',
      companyName: 'Your Business Ltd.', tagline: 'A short tagline about what you do',
      phone: '+234 800 000 0000', email: 'hello@yourbusiness.com', website: '', address: '5, Business Street, Lagos',
    },
    clientInfo: {
      visible: true, clientName: 'Client Name', clientAddress: '', clientPhone: '',
      invoiceNo: 'INV-0001', invoiceDate: '', dueDate: '', status: 'Unpaid',
    },
    itemsTable: { visible: true, showImages: false, rows: SAMPLE_ROWS.map((r) => ({ ...r })) },
    totals: { visible: true },
    notes: { visible: true, content: 'Thank you for your business — we appreciate your patronage.' },
    payment: { visible: true, methods: ['Bank Transfer', 'POS'] },
    bank: {
      visible: true,
      rows: [{ k: 'Bank Name', v: 'Your Bank' }, { k: 'Account Name', v: 'Your Business Ltd.' }, { k: 'Account Number', v: '0000000000' }],
    },
    signature: { visible: true, mode: 'typed', text: '', src: null, approvedName: '', approvedRole: 'Finance Officer' },
    stamp: { visible: false, src: null, opacity: 30 },
    qr: { visible: false, value: '', src: null },
    watermark: { visible: false, content: 'UNPAID', opacity: 12, rotation: -28 },
    terms: { visible: false, content: 'Payment is due within 14 days. Late payments may incur a 2% monthly fee.' },
    footer: { content: 'Thank you for your business.' },
  };
}

// Read-only lookup of the classic Invoice Generator's saved business
// profile - seeds a brand-new invoice's header for a returning user, never
// applied when an invoice is already in progress (that path preserves
// whatever the person has already entered instead).
function applyLegacySeed(sections) {
  const legacy = readLegacyBizProfile();
  if (!legacy || !legacy.name) return sections;
  return {
    ...sections,
    header: {
      ...sections.header,
      logoSrc: legacy.logoDataUrl || sections.header.logoSrc,
      companyName: legacy.name,
      tagline: legacy.tagline || sections.header.tagline,
      phone: legacy.phone || '',
      email: legacy.email || '',
      address: legacy.address || '',
      website: '',
    },
  };
}

export function emptyDoc(templateId = 'modern') {
  return {
    templateId,
    currency: 'NGN', discount: 0, vatRate: 7.5,
    sections: applyLegacySeed(buildDefaultSections()),
  };
}

// Templates are skins — switching one preserves every field of content,
// changing only which style tokens are applied (handled separately in
// styleTokens.js). Since sections carry no position data anymore, there's
// nothing coordinate-related to reconcile here at all — this function only
// has to exist because a *new* template's default `visible` flags might
// differ, and because it's the one clear place that expresses "content
// survives a template swap" as an explicit rule, not an accident of
// shared object references.
export function applyTemplateSkin(sections) {
  return sections; // sections are already skin-agnostic; nothing to transform
}
