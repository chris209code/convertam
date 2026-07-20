// Single source of truth for what varies between the four business
// document types Business Document Studio produces. Everything else
// (sections, templates, rendering, PDF export, undo/redo, download flow)
// is genuinely shared — this file is the one place that says what a
// document TYPE means, so a new type never requires touching rendering
// logic itself, only adding a config entry here.
//
// Template (styleTokens.js) controls colours/fonts/header layout/table
// style. This file controls labels/fields/columns/totals/signatures/
// business rules. The two are deliberately independent axes.

export const DOC_TYPES = ['invoice', 'quotation', 'delivery-note', 'waybill'];

// The suggested end-to-end business process, in order. Used to build the
// "Start a Business Document Flow" entry option and each type's default
// "next" conversion target.
export const FLOW_SEQUENCE = ['quotation', 'invoice', 'delivery-note', 'waybill'];

export const DOC_TYPE_CONFIG = {
  invoice: {
    id: 'invoice',
    label: 'Invoice',
    documentTitle: 'INVOICE',
    numberLabel: 'Invoice No.',
    dateLabel: 'Invoice Date',
    secondaryDateLabel: 'Due Date',
    secondaryDateAutoDays: 30,
    statusLabel: 'Status',
    defaultStatus: 'Unpaid',
    partyLabel: 'Billed To',
    showFinancials: true,
    totalLabel: 'Total Due',
    itemColumns: ['qty', 'rate', 'vat', 'amount'],
    showBank: true,
    showLogistics: false,
    logisticsFields: [],
    signatureSlots: [{ key: 'primary', label: 'Approved By' }],
    numberPrefix: 'INV-',
    convertTargets: ['delivery-note', 'waybill'],
    nextInFlow: 'delivery-note',
  },
  quotation: {
    id: 'quotation',
    label: 'Quotation',
    documentTitle: 'QUOTATION',
    numberLabel: 'Quotation No.',
    dateLabel: 'Quotation Date',
    secondaryDateLabel: 'Valid Until',
    secondaryDateAutoDays: 14,
    // No "Paid"/"Unpaid"/"Amount Due" language on a quotation — nothing is
    // owed yet, so there's no payment status to show.
    statusLabel: null,
    defaultStatus: null,
    partyLabel: 'Prepared For',
    showFinancials: true,
    totalLabel: 'Quoted Total',
    itemColumns: ['qty', 'rate', 'vat', 'amount'],
    showBank: true,
    showLogistics: false,
    logisticsFields: [],
    signatureSlots: [{ key: 'primary', label: 'Approved By' }],
    numberPrefix: 'QUO-',
    convertTargets: ['invoice'],
    nextInFlow: 'invoice',
  },
  'delivery-note': {
    id: 'delivery-note',
    label: 'Delivery Note',
    documentTitle: 'DELIVERY NOTE',
    numberLabel: 'Delivery Note No.',
    dateLabel: 'Delivery Date',
    secondaryDateLabel: null,
    secondaryDateAutoDays: null,
    statusLabel: 'Delivery Status',
    defaultStatus: 'Pending',
    partyLabel: 'Delivered To',
    showFinancials: false,
    totalLabel: null,
    itemColumns: ['qty', 'unit', 'remarks'],
    showBank: false,
    showLogistics: true,
    logisticsFields: ['deliveryAddress', 'relatedInvoiceNo', 'purchaseOrderNo'],
    signatureSlots: [{ key: 'primary', label: 'Received By' }],
    numberPrefix: 'DN-',
    convertTargets: ['invoice', 'waybill'],
    nextInFlow: 'waybill',
  },
  waybill: {
    id: 'waybill',
    label: 'Waybill',
    documentTitle: 'WAYBILL',
    numberLabel: 'Waybill No.',
    dateLabel: 'Dispatch Date',
    secondaryDateLabel: null,
    secondaryDateAutoDays: null,
    statusLabel: null,
    defaultStatus: null,
    partyLabel: 'Receiver',
    showFinancials: false,
    totalLabel: null,
    itemColumns: ['qty', 'weight', 'unit', 'remarks'],
    showBank: false,
    showLogistics: true,
    logisticsFields: ['pickupAddress', 'deliveryAddress', 'driverName', 'driverPhone', 'vehicleNumber', 'transportCompany', 'deliveryInstructions'],
    signatureSlots: [{ key: 'primary', label: 'Dispatched By' }, { key: 'secondary', label: 'Received By' }],
    numberPrefix: 'WB-',
    convertTargets: [],
    nextInFlow: null,
  },
};

export function docTypeConfig(docType) {
  return DOC_TYPE_CONFIG[docType] || DOC_TYPE_CONFIG.invoice;
}

export function isValidDocType(docType) {
  return DOC_TYPES.includes(docType);
}

// Human labels for the `logistics` section's fields — shared between the
// ContentPanel editing form and both renderers so a field never has to be
// relabeled by hand in more than one place. Only the fields listed in a
// given docType's `logisticsFields` are ever shown for that type.
export const LOGISTICS_FIELD_LABELS = {
  deliveryAddress: 'Delivery Address',
  pickupAddress: 'Pickup Address',
  driverName: 'Driver Name',
  driverPhone: 'Driver Phone',
  vehicleNumber: 'Vehicle Number',
  transportCompany: 'Transport Company',
  deliveryInstructions: 'Delivery Instructions',
  relatedInvoiceNo: 'Related Invoice No.',
  purchaseOrderNo: 'Purchase Order No.',
};

// Item-table column metadata shared between the editor and PDF renderers —
// a docType's `itemColumns` array (above) selects which of these actually
// render, in order. Financial columns (rate/vat/amount) only ever appear
// for showFinancials types; unit/weight/remarks are the logistics-doc
// equivalents.
export const ITEM_COLUMN_DEFS = {
  qty: { label: 'Qty', width: 55, align: 'right' },
  rate: { label: 'Rate', width: 100, align: 'right' },
  vat: { label: 'VAT', width: 60, align: 'right' },
  amount: { label: 'Amount', width: 105, align: 'right' },
  unit: { label: 'Unit', width: 70, align: 'left' },
  weight: { label: 'Weight', width: 80, align: 'right' },
  remarks: { label: 'Remarks', width: 150, align: 'left' },
};
