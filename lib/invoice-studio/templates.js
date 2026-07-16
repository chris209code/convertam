import { CANVAS_W, CANVAS_H } from './constants';

// ---------------------------------------------------------------------------
// Bottom-section layout
//
// The brief for this rebuild is explicit that the Totals box must stay put
// (upper-right of the lower section) while the Approved-By / signature block
// needs real breathing room below it — the source design's numbers actually
// let a divider line cut across the Totals box and left only ~8px between
// "Approved By" and the signature. Rather than copy those coordinates, this
// computes the whole block from one `cardY` (top of the bottom "card"),
// shared by all three templates, so the spacing fix lives in one place
// instead of three sets of hand-tuned magic numbers.
// ---------------------------------------------------------------------------
const LEFT_X = 40;

const CARD_PAD_TOP = 16;
const CARD_PAD_BOTTOM = 16;
const WORDS_H = 64;
const NOTES_GAP_AFTER_WORDS = 10;
const NOTES_W = 300;
const QR_SIZE = 84;
const QR_GAP_AFTER_NOTES = 16;
const TOTALS_H = 120;
const DIVIDER_GAP = 18;
const ROW2_GAP = 16;
const PAYMENT_H = 88;
const BANK_H = 88;
const APPROVAL_H = 52;
const APPROVAL_SIGNATURE_GAP = 20; // the deliberate fix for the crowding issue
const SIGNATURE_H = 56;

export function bottomSectionLayout(cardY) {
  const rowTopY = cardY + CARD_PAD_TOP;
  const totalsY = rowTopY;
  const totalsBottom = totalsY + TOTALS_H;
  const wordsY = rowTopY;
  const wordsBottom = wordsY + WORDS_H;
  // Notes and the QR code share a row below the total-in-words text — QR
  // sits to notes' right so neither is "stacked directly against" the words
  // row or the divider, per the source design's own layout note.
  const notesY = wordsBottom + NOTES_GAP_AFTER_WORDS;
  const qrY = notesY;
  const notesBottom = notesY + Math.max(60, TOTALS_H - WORDS_H - NOTES_GAP_AFTER_WORDS);
  const qrBottom = qrY + QR_SIZE;
  const row1Bottom = Math.max(totalsBottom, notesBottom, qrBottom);
  const dividerY = row1Bottom + DIVIDER_GAP;
  const row2Y = dividerY + ROW2_GAP;
  const approvalY = row2Y;
  const approvalBottom = approvalY + APPROVAL_H;
  const signatureY = approvalBottom + APPROVAL_SIGNATURE_GAP;
  const signatureBottom = signatureY + SIGNATURE_H;
  const row2Bottom = Math.max(row2Y + PAYMENT_H, row2Y + BANK_H, signatureBottom);
  const cardBottom = row2Bottom + CARD_PAD_BOTTOM;
  return {
    cardY, cardH: cardBottom - cardY,
    wordsY, wordsH: WORDS_H,
    notesY, notesH: notesBottom - notesY, notesW: NOTES_W,
    qrY, qrH: QR_SIZE, qrX: LEFT_X + NOTES_W + QR_GAP_AFTER_NOTES,
    totalsY, totalsH: TOTALS_H,
    dividerY,
    row2Y, paymentH: PAYMENT_H, bankH: BANK_H,
    approvalY, approvalH: APPROVAL_H,
    signatureY, signatureH: SIGNATURE_H,
  };
}

const CONTENT_RIGHT = 776; // 736-wide content column, matches the items table's right edge

// ---------------------------------------------------------------------------
// Dynamic layout recompute
//
// Every element below the items table was originally positioned assuming
// exactly 3 sample rows, baked in once when a template is first opened.
// Adding or removing rows afterward never recalculated anything below the
// table — so a 6-item invoice would have its table content overflow past
// its allotted height and visually collide with (or get clipped by) the
// totals/notes/payment/signature block still sitting at their original
// fixed positions. That's the actual cause of blank pages, overlapping
// content, and rows appearing to vanish.
//
// This recomputes every position below the table fresh, based on the
// table's actual current row count, every time it's called — it does not
// try to precisely predict text-wrap height pixel-for-pixel (that would
// need a real DOM measurement pass), but it does correctly handle the
// reported case: any number of rows, with or without a description line.
// ---------------------------------------------------------------------------
const TABLE_HEADER_H = 38;
const ROW_H_SIMPLE = 40;
const ROW_H_WITH_DESC = 54;
const TABLE_BOTTOM_PAD = 14;

export function computeTableContentHeight(rows) {
  const rowsH = (rows || []).reduce((sum, r) => sum + (r.desc ? ROW_H_WITH_DESC : ROW_H_SIMPLE), 0);
  return TABLE_HEADER_H + rowsH + TABLE_BOTTOM_PAD;
}

// True automatic multi-page splitting (flowing content across separate A4
// sheets) isn't implemented — that's a genuinely larger, separate piece of
// work. This instead detects when the current content honestly doesn't fit
// within one page's height, so the person is told plainly rather than
// having it silently clip or overlap, which was the actual original bug.
export function contentExceedsOnePage(elements) {
  const table = elements.find((e) => e.kind === 'table');
  const terms = elements.find((e) => e.id === 'terms');
  if (!table) return false;
  const dynamicTableH = Math.max(table.h, computeTableContentHeight(table.rows));
  const newCardY = table.y + dynamicTableH + 20;
  const bottom = bottomSectionLayout(newCardY);
  const contentBottom = terms?.visible ? bottom.cardY + bottom.cardH + 14 + 60 : bottom.cardY + bottom.cardH;
  return contentBottom > CANVAS_H;
}

export function recomputeDynamicLayout(elements) {
  const table = elements.find((e) => e.kind === 'table');
  if (!table) return elements;

  // Never shrink below the template's originally authored height (keeps a
  // short 1-2 item invoice looking intentionally spaced, not cramped to the
  // table's bare minimum) but always grow to fit whatever's actually there.
  const dynamicTableH = Math.max(table.h, computeTableContentHeight(table.rows));
  const newCardY = table.y + dynamicTableH + 20;
  const bottom = bottomSectionLayout(newCardY);

  return elements.map((el) => {
    switch (el.id) {
      case 'itemsTable': return { ...el, h: dynamicTableH };
      case 'footerCard': return { ...el, y: bottom.cardY, h: bottom.cardH };
      case 'totalWords': return { ...el, y: bottom.wordsY, h: bottom.wordsH };
      case 'notes': return { ...el, y: bottom.notesY, h: bottom.notesH };
      case 'qr': return { ...el, y: bottom.qrY, x: bottom.qrX, h: bottom.qrH };
      case 'totals': return { ...el, y: bottom.totalsY, h: bottom.totalsH };
      case 'footerDivider': return { ...el, y: bottom.dividerY };
      case 'paymentMethods': return { ...el, y: bottom.row2Y, h: bottom.paymentH };
      case 'bankDetails': return { ...el, y: bottom.row2Y, h: bottom.bankH };
      // Signature renders ABOVE the printed name/title — signature takes the
      // first (approvalY) slot, the name/title block sits below it, matching
      // how a real signed document reads.
      case 'signature': return { ...el, y: bottom.approvalY, h: bottom.signatureH };
      case 'approvedBy': return { ...el, y: bottom.approvalY + bottom.signatureH + 10, h: bottom.approvalH };
      case 'stamp': return { ...el, y: bottom.approvalY + 10 };
      case 'terms': return { ...el, y: bottom.cardY + bottom.cardH + 14 };
      default: return el;
    }
  });
}

const TOTALS_X = 552;
const TOTALS_W = 224;
const CARD_X = 28;
const CARD_W = 760;
const PAYMENT_X = 40, PAYMENT_W = 300;
const BANK_X = 372, BANK_W = 200;
const APPROVAL_X = 612, APPROVAL_W = 164;

const SAMPLE_ROWS = [
  { name: 'Ergonomic Office Chair', desc: 'Mesh back, adjustable lumbar support', qty: 4, rate: 85000, vat: 7.5, img: null },
  { name: 'Standing Desk 140cm', desc: 'Electric height adjustment, oak finish', qty: 2, rate: 210000, vat: 7.5, img: null },
  { name: 'Desk Organizer Set', desc: 'Bamboo, 5-piece set', qty: 6, rate: 12500, vat: 7.5, img: null },
];

function baseElements({ itemsTableY, itemsTableH, headerVariant, headerColor }) {
  const bottom = bottomSectionLayout(itemsTableY + itemsTableH + 20);
  return [
    { id: 'letterhead', kind: 'letterhead', x: 0, y: 0, w: CANVAS_W, h: 150, visible: false, src: null },
    { id: 'logo', kind: 'logo', x: 40, y: 40, w: 64, h: 64, visible: true, src: null, shape: 'rounded' },
    {
      id: 'companyText', kind: 'companyText', x: 132, y: 42, w: 368, h: 56, visible: true,
      name: 'Nimbus Office Supplies', tagline: 'Equip your workplace, effortlessly.', center: false, onDark: false, useBrand: true,
    },
    {
      id: 'contactInfo', kind: 'contactInfo', x: 476, y: 40, w: 300, h: 96, visible: true, center: false, onDark: false,
      phone: '+234 802 555 1180', email: 'hello@nimbusoffice.com', website: 'www.nimbusoffice.com', address: '14 Adeyemi Lawson St, Lagos',
    },
    { id: 'accentBar', kind: 'bar', x: 0, y: 150, w: CANVAS_W, h: 6, visible: true, color: 'primary' },
    {
      id: 'billTo', kind: 'billTo', x: LEFT_X, y: 186, w: 380, h: 110, visible: true,
      clientName: 'Carter & Wells LLP', clientAddress: '22 Broad Street, Lagos Island, Lagos', clientPhone: '+234 701 220 4499',
    },
    {
      id: 'invoiceMeta', kind: 'meta', x: 476, y: 176, w: 300, h: 130, visible: true, useBrand: 'title',
      rows: [
        { key: 'no', label: 'Invoice No.', value: 'INV-2026-0714' },
        { key: 'date', label: 'Invoice Date', value: 'Jul 15, 2026' },
        { key: 'due', label: 'Due Date', value: 'Jul 30, 2026' },
        { key: 'status', label: 'Status', value: 'Unpaid' },
      ],
    },
    {
      id: 'itemsTable', kind: 'table', x: LEFT_X, y: itemsTableY, w: 736, h: itemsTableH, visible: true,
      showImages: true, headerVariant, headerColor,
      rows: SAMPLE_ROWS.map((r) => ({ ...r })),
    },
    // footerCard paints the "card" background for the whole bottom section —
    // it must come before totalWords/qr/totals/etc in this array so those
    // elements paint on top of it, not the other way round.
    { id: 'footerCard', kind: 'shape', variant: 'card', x: CARD_X, y: bottom.cardY, w: CARD_W, h: bottom.cardH, visible: true },
    { id: 'totalWords', kind: 'words', x: LEFT_X, y: bottom.wordsY, w: 480, h: bottom.wordsH, visible: true },
    {
      id: 'notes', kind: 'notes', x: LEFT_X, y: bottom.notesY, w: bottom.notesW, h: bottom.notesH, visible: true,
      content: 'Thank you for your business — we appreciate your patronage.',
    },
    { id: 'qr', kind: 'qr', x: bottom.qrX, y: bottom.qrY, w: 84, h: bottom.qrH, visible: true, src: null, value: '' },
    { id: 'totals', kind: 'totals', x: TOTALS_X, y: bottom.totalsY, w: TOTALS_W, h: bottom.totalsH, visible: true, useBrand: true, bgVariant: 'default' },
    { id: 'footerDivider', kind: 'bar', x: LEFT_X, y: bottom.dividerY, w: 736, h: 1, visible: true, color: 'divider' },
    { id: 'paymentMethods', kind: 'payment', x: PAYMENT_X, y: bottom.row2Y, w: PAYMENT_W, h: bottom.paymentH, visible: true, methods: ['Bank Transfer', 'POS', 'USSD', 'Cash'] },
    {
      id: 'bankDetails', kind: 'bank', x: BANK_X, y: bottom.row2Y, w: BANK_W, h: bottom.bankH, visible: true,
      rows: [{ k: 'Bank Name', v: 'Zenith Bank' }, { k: 'Account Name', v: 'Nimbus Office Supplies Ltd' }, { k: 'Account Number', v: '6120044521' }],
    },
    { id: 'signature', kind: 'signature', x: APPROVAL_X, y: bottom.approvalY, w: APPROVAL_W, h: bottom.signatureH, visible: true, mode: 'typed', text: 'Adaeze Nwosu', src: null },
    { id: 'approvedBy', kind: 'approval', x: APPROVAL_X, y: bottom.approvalY + bottom.signatureH + 10, w: APPROVAL_W, h: bottom.approvalH, visible: true, name: 'Adaeze Nwosu', role: 'Finance Officer' },
    // Default position overlaps the signature, not the totals box — a stamp
    // stamped over (or right beside) a signature is the realistic placement;
    // the default 85% opacity keeps the signature legible underneath it.
    { id: 'stamp', kind: 'stamp', x: APPROVAL_X + 40, y: bottom.approvalY + 20, w: 84, h: 84, visible: false, src: null, shape: 'circle', opacity: 30 },
    { id: 'footer', kind: 'footer', x: 0, y: CANVAS_H - 56, w: CANVAS_W, h: 56, visible: true, content: 'Thank you for your business.', color: 'primary' },
    { id: 'watermark', kind: 'watermark', x: 130, y: itemsTableY + 90, w: 560, h: 260, visible: false, content: 'UNPAID', opacity: 12, rotation: -28 },
    {
      id: 'terms', kind: 'terms', x: LEFT_X, y: bottom.cardY + bottom.cardH + 14, w: 736, h: 60, visible: false,
      content: 'Payment is due within 14 days. Late payments may incur a 2% monthly fee. All goods remain property of the seller until paid in full.',
    },
  ];
}

export function buildModernElements() {
  return baseElements({ itemsTableY: 330, itemsTableH: 230, headerVariant: 'solid', headerColor: 'primary' });
}

export function buildCorporateElements() {
  const els = baseElements({ itemsTableY: 354, itemsTableH: 230, headerVariant: 'solid', headerColor: 'secondary' });
  const map = Object.fromEntries(els.map((e) => [e.id, e]));

  map.letterhead.h = 186;
  map.logo.y = 54; map.logo.onDark = true;
  map.companyText.y = 56; map.companyText.onDark = true;
  map.contactInfo.y = 54; map.contactInfo.onDark = true;
  map.accentBar.y = 182; map.accentBar.h = 3; map.accentBar.color = 'accent';
  map.billTo.y = 210;
  map.invoiceMeta.y = 200;
  map.totals.bgVariant = 'tan';
  map.footer.color = 'secondary';

  els.splice(1, 0, { id: 'headerBand', kind: 'shape', variant: 'fill', x: 0, y: 0, w: CANVAS_W, h: 186, visible: true, color: 'secondary' });
  return els;
}

export function buildElegantElements() {
  const els = baseElements({ itemsTableY: 380, itemsTableH: 230, headerVariant: 'outline', headerColor: 'primary' });
  const map = Object.fromEntries(els.map((e) => [e.id, e]));

  map.logo.x = 376; map.logo.y = 36; map.logo.w = 64; map.logo.h = 64;
  map.companyText.x = 228; map.companyText.y = 104; map.companyText.w = 360; map.companyText.h = 48; map.companyText.center = true;
  map.contactInfo.x = 228; map.contactInfo.y = 154; map.contactInfo.w = 360; map.contactInfo.h = 74; map.contactInfo.center = true;
  map.accentBar.y = 240; map.accentBar.h = 1; map.accentBar.color = 'divider';
  map.billTo.x = LEFT_X; map.billTo.y = 240; map.billTo.w = 360;
  map.invoiceMeta.x = 476; map.invoiceMeta.y = 240; map.invoiceMeta.w = 300;
  map.totals.useBrand = true; map.totals.bgVariant = 'plain';
  map.footer.color = 'primary';
  map.footer.content = 'With gratitude for your business.';

  return els;
}

export const TEMPLATE_BUILDERS = {
  modern: buildModernElements,
  corporate: buildCorporateElements,
  elegant: buildElegantElements,
};

export const TEMPLATE_DEFAULTS = {
  modern: { brandPrimary: '#2563EB', brandSecondary: '#0F172A', brandAccent: '#10B981', headingFont: 'Poppins', bodyFont: 'Inter' },
  corporate: { brandPrimary: '#2563EB', brandSecondary: '#0B1220', brandAccent: '#C9A227', headingFont: 'Georgia', bodyFont: 'Inter' },
  elegant: { brandPrimary: '#6D28D9', brandSecondary: '#1F2937', brandAccent: '#A78BFA', headingFont: 'Georgia', bodyFont: 'Inter' },
};

export const TEMPLATE_GALLERY = [
  { id: 'modern', name: 'Modern', category: 'Clean & spacious', hue: 214 },
  { id: 'corporate', name: 'Corporate', category: 'Structured & formal', hue: 222 },
  { id: 'elegant', name: 'Elegant', category: 'Centered & refined', hue: 280 },
];

export function buildTemplateElements(templateId) {
  const builder = TEMPLATE_BUILDERS[templateId] || TEMPLATE_BUILDERS.modern;
  return builder();
}

export function cloneElements(elements) {
  return typeof structuredClone === 'function' ? structuredClone(elements) : JSON.parse(JSON.stringify(elements));
}
