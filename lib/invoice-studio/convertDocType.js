// The one-click "Convert to..." engine. Takes the current document and a
// target docType, and returns a new document that preserves everything
// that still applies (company, client, items, branding, letterhead,
// notes) while generating a fresh document number/date and adapting or
// clearing fields that don't apply to the target type. Nothing here
// mutates `doc` — every return is a fresh object.
//
// `changes` is a plain-English list of what will be hidden or adapted,
// used to build the pre-conversion confirmation dialog so nothing changes
// silently.

import { docTypeConfig } from './docTypes';
import { buildDefaultSections } from './sectionsModel';

export function convertDocument(doc, toType) {
  const fromConfig = docTypeConfig(doc.docType);
  const toConfig = docTypeConfig(toType);
  const sec = doc.sections;
  const changes = [];
  const freshDefaults = buildDefaultSections(toType);

  // A converted document is its own document, not a renamed copy of the
  // old one — it gets a fresh number and blank dates, but keeps who it's
  // for and what's on it.
  const clientInfo = {
    ...sec.clientInfo,
    docNo: freshDefaults.clientInfo.docNo,
    docDate: '',
    secondaryDate: '',
    secondaryDateManual: false,
    status: toConfig.defaultStatus || '',
  };
  changes.push(`${toConfig.numberLabel} will be generated fresh (${clientInfo.docNo}).`);

  // Items: names/descriptions/quantities/images always carry over. Prices
  // only make sense where money is actually changing hands, so they're
  // zeroed (not just hidden) when moving to a non-financial type — matches
  // "Invoice to Delivery Note: remove prices" in the brief.
  let rows = sec.itemsTable.rows.map((r) => ({ ...r }));
  if (fromConfig.showFinancials && !toConfig.showFinancials) {
    rows = rows.map((r) => ({ ...r, rate: 0, vat: 0 }));
    changes.push('Prices, VAT, and totals will be removed.');
  } else if (!fromConfig.showFinancials && toConfig.showFinancials) {
    changes.push('Prices and VAT were not part of the original document and will need to be filled in.');
  }
  const itemsTable = { ...sec.itemsTable, rows };

  // Logistics fields aren't deleted when hidden (switching back restores
  // them) — but the confirmation dialog should still say what disappears.
  if (fromConfig.showLogistics && !toConfig.showLogistics) {
    changes.push('Driver, vehicle, and delivery-address fields will be hidden.');
  } else if (!fromConfig.showLogistics && toConfig.showLogistics) {
    changes.push(toType === 'waybill'
      ? 'Driver, vehicle, and delivery information will need to be filled in.'
      : 'Delivery address and reference numbers will need to be filled in.');
  }
  let logistics = sec.logistics || freshDefaults.logistics;
  // Converting an Invoice into a Delivery Note carries the invoice number
  // forward as the paper-trail reference automatically — the whole point
  // of one-click conversion is not retyping what's already known.
  if (toType === 'delivery-note' && doc.docType === 'invoice') {
    logistics = { ...logistics, relatedInvoiceNo: sec.clientInfo.docNo };
  }
  // Which panel section most needs a look after this conversion — used to
  // scroll/highlight it so a person isn't left scrolling past already-
  // completed sections hunting for the few genuinely new fields.
  const newSection = !fromConfig.showLogistics && toConfig.showLogistics ? 'logistics' : 'documentDetails';

  if (fromConfig.showBank && !toConfig.showBank) {
    changes.push('Bank details will be hidden.');
  }

  // An "Approved By" name/title doesn't make sense carried over onto a
  // "Dispatched By" or "Received By" slot, so those reset — but the actual
  // signature mark (typed/drawn/uploaded) carries over as a starting point
  // rather than forcing it to be redone from scratch.
  const dualBefore = fromConfig.signatureSlots.length === 2;
  const dualAfter = toConfig.signatureSlots.length === 2;
  const signature = { ...sec.signature, approvedName: '', approvedRole: '' };
  const signature2 = dualAfter
    ? { ...(sec.signature2 || freshDefaults.signature2), approvedName: '', approvedRole: '' }
    : (sec.signature2 || freshDefaults.signature2);
  if (fromConfig.signatureSlots[0]?.label !== toConfig.signatureSlots[0]?.label || dualBefore !== dualAfter) {
    const labels = toConfig.signatureSlots.map((s) => s.label).join(' / ');
    changes.push(`Signature will be relabeled "${labels}" — the signed name and title will need to be re-entered.`);
  }

  const nextDoc = {
    ...doc,
    docType: toType,
    sections: { ...sec, clientInfo, itemsTable, logistics, signature, signature2 },
  };

  return { nextDoc, changes, newSection };
}
