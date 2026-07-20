// The document is now an ordered set of sections, not a flat list of
// positioned elements. Order in this object (and the SECTION_ORDER array)
// IS the layout — there is no x/y/w/h anywhere in this file. Height is
// never specified; it's whatever the content needs, computed by whichever
// renderer (editor or PDF) is currently displaying it.

import { readLegacyBizProfile } from './legacySeed';
import { docTypeConfig } from './docTypes';

export const CURRENCIES = [
  { code: 'NGN', symbol: '₦' }, { code: 'USD', symbol: '$' }, { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' }, { code: 'GHS', symbol: '₵' }, { code: 'KES', symbol: 'KSh' },
  { code: 'ZAR', symbol: 'R' }, { code: 'CAD', symbol: 'CA$' },
];

// The order sections render in — this array IS the document flow. Adding,
// removing, or reordering a section here changes the whole document's
// layout with no coordinate math involved anywhere.
export const SECTION_ORDER = [
  'letterhead', 'header', 'clientInfo', 'logistics', 'itemsTable', 'totals',
  'notes', 'bank', 'signature', 'terms', 'watermark', 'footer',
];

const SAMPLE_ROWS = [
  { name: 'Ergonomic Office Chair', desc: 'Mesh back, adjustable lumbar support', qty: 4, rate: 85000, vat: 7.5, unit: 'pcs', weight: 8, remarks: 'Fragile — handle with care', img: null },
  { name: 'Standing Desk 140cm', desc: 'Electric height adjustment, oak finish', qty: 2, rate: 210000, vat: 7.5, unit: 'pcs', weight: 22, remarks: '', img: null },
  { name: 'Desk Organizer Set', desc: 'Bamboo, 5-piece set', qty: 6, rate: 12500, vat: 7.5, unit: 'set', weight: 3, remarks: '', img: null },
];

export function buildDefaultSections(docType = 'invoice') {
  const config = docTypeConfig(docType);
  return {
    letterhead: { visible: false, src: null },
    header: {
      visible: true, logoSrc: null, logoShape: 'circle',
      companyName: 'Your Business Ltd.', tagline: 'A short tagline about what you do',
      phone: '+234 800 000 0000', email: 'hello@yourbusiness.com', website: '', address: '5, Business Street, Lagos',
    },
    clientInfo: {
      visible: true, clientName: 'Client Name', clientAddress: '', clientPhone: '',
      docNo: `${config.numberPrefix}0001`, docDate: '', secondaryDate: '', status: config.defaultStatus || '',
    },
    // Only read/shown when the active docType's config sets showLogistics
    // (Delivery Note, Waybill) — irrelevant fields for a given type simply
    // stay blank and unrendered, gated by docTypes.js's logisticsFields.
    logistics: {
      visible: true,
      pickupAddress: '', deliveryAddress: '', driverName: '', driverPhone: '',
      vehicleNumber: '', transportCompany: '', deliveryInstructions: '',
      relatedInvoiceNo: '', purchaseOrderNo: '',
    },
    itemsTable: { visible: true, showImages: false, rows: SAMPLE_ROWS.map((r) => ({ ...r })) },
    totals: { visible: true },
    notes: { visible: true, content: 'Thank you for your business — we appreciate your patronage.' },
    bank: {
      visible: true,
      rows: [{ k: 'Bank Name', v: 'Your Bank' }, { k: 'Account Name', v: 'Your Business Ltd.' }, { k: 'Account Number', v: '0000000000' }],
    },
    signature: { visible: true, mode: 'typed', text: '', src: null, size: 40, approvedName: '', approvedRole: 'Finance Officer' },
    // Second signature slot — only rendered when the active docType's
    // config.signatureSlots has two entries (Waybill's Dispatched By /
    // Received By). Invoice/Quotation/Delivery Note never read this.
    signature2: { visible: true, mode: 'typed', text: '', src: null, size: 40, approvedName: '', approvedRole: '' },
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

// Adds `days` to an ISO ("YYYY-MM-DD") date string, returning an ISO string.
// Constructed at UTC noon so month/year rollovers can't shift a day off
// under a browser's local timezone (midnight UTC dates otherwise round
// down a day in timezones behind UTC).
export function addDaysIso(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function emptyDoc(templateId = 'modern', docType = 'invoice') {
  return {
    templateId,
    docType,
    currency: 'NGN', discount: 0, vatRate: 7.5,
    sections: applyLegacySeed(buildDefaultSections(docType)),
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
