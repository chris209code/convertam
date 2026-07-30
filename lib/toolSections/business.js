// Tool metadata for the Business Suite hub page — see lib/toolSections/pdf.js
// for why this lives as a standalone data module.
export const SECTIONS = [
  {
    id: 'documents',
    label: 'Business Documents',
    icon: '🧾',
    tools: [
      { slug: 'business-document-studio', title: 'Business Document Studio', desc: 'Create invoices, quotations, delivery notes and waybills from one professional workspace', icon: '🗂️', badge: 'new' },
      { slug: 'invoice-generator', title: 'Invoice Generator', desc: 'Create a professional, itemized invoice to request payment', icon: '🧾', badge: 'free' },
      { slug: 'quotation-generator', title: 'Quotation Generator', desc: 'Send a proposed price before any payment is owed', icon: '📋', badge: 'free' },
      { slug: 'delivery-note-waybill', title: 'Delivery Note & Waybill', desc: 'Confirm what was delivered, or document goods in transit', icon: '📦', badge: 'free' },
    ],
  },
  {
    id: 'sign-review',
    label: 'Sign & Review',
    icon: '🖊️',
    tools: [
      { slug: 'sign-documents', title: 'Sign Documents', desc: 'Sign a PDF, Word document, or photo of a printed page — no printing required', icon: '✒️', badge: 'free' },
      { slug: 'compare-pdf', title: 'Compare Documents', desc: 'See what changed between two versions of a document before approving it', icon: '🔍', badge: 'free' },
    ],
  },
  {
    id: 'branding',
    label: 'ID & Branding',
    icon: '🪪',
    tools: [
      { slug: 'id-card-generator', title: 'ID Card Generator', desc: 'Design and print professional front-and-back ID cards', icon: '🪪', badge: 'free' },
    ],
  },
];
