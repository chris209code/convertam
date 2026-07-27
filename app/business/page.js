import CategoryLandingClient from '../../components/CategoryLandingClient';
import { BusinessIcon, CATEGORY_ACCENTS, relatedSuites } from '../../components/categoryVisuals';
import { buildOgMeta } from '../../lib/pageMetadata';

const TITLE = 'Business Tools — Convertam';
const DESCRIPTION = 'Free business document tools. Create invoices, quotations, delivery notes and waybills, sign contracts, compare document versions, and design ID cards. No login required.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/business' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/business' }),
};

const EDITORIAL = {
  intro: [
    'Every small business runs on the same handful of documents — a quotation to win the work, an invoice to get paid, a delivery note or waybill to prove goods moved, and an ID card for staff or event access. The Business Suite covers that whole cycle from one place, so client and item details you type once carry forward automatically as a deal progresses, instead of retyping the same name and address into four separate documents.',
    "Once a document is ready, business usually means getting it approved and signed, not just created — so Sign Documents and Compare Documents live here too: sign a contract or agreement without printing it, and see exactly what changed between two drafts before you commit to a final version.",
    "Every document generated here is completely free, downloads as a polished PDF, and requires no account — fill in your details, download, and send. Nothing is stored on Convertam's servers once you close the tab.",
  ],
  whoFor: [
    'Freelancers and small businesses who bill clients directly',
    'Anyone who needs to quote a price before starting work',
    'Businesses that ship physical goods and need proof of delivery',
    'Organizations issuing staff, school, or event ID cards',
    'Anyone who needs to review, sign, or approve a contract or agreement',
  ],
  learnLinks: [
    { title: 'Invoice vs. Quotation vs. Delivery Note', href: '/learn/business-documents/invoice-vs-quotation-vs-delivery-note' },
    { title: 'How to Create a Professional Invoice', href: '/learn/business-documents/how-to-create-a-professional-invoice' },
    { title: 'Are Digital Signatures Legally Binding?', href: '/learn/business-documents/are-digital-signatures-legally-binding' },
  ],
};

const FAQS = [
  {
    q: 'What\'s the difference between Business Document Studio and the individual generators?',
    a: 'They\'re the same underlying tool. Business Document Studio is the full workspace with all four document types and the "Convert to →" flow between them; Invoice Generator, Quotation Generator, and Delivery Note & Waybill are direct entry points for when you already know exactly which one you need.',
  },
  {
    q: 'Are these business tools free?',
    a: 'Yes — every document type (invoice, quotation, delivery note, waybill, ID card) is completely free to generate and download, with no login and no limit on how many you create.',
  },
  {
    q: 'Can I convert one document type into another?',
    a: 'Yes — a Quotation can convert into an Invoice, and an Invoice can convert into a Delivery Note or Waybill, carrying your client and item details forward automatically. Fields that don\'t apply to the new type are removed, and fields it needs are added, with a preview of the change before you confirm.',
  },
  {
    q: 'Is my business and client data stored anywhere?',
    a: 'No — documents are generated directly in your browser and downloaded as a PDF. Your company details are remembered locally in your browser so future documents start pre-filled, but nothing is uploaded to a server.',
  },
  {
    q: 'Can I add my company logo and branding?',
    a: 'Yes — upload your logo or letterhead once and it carries across every document type and template, so your invoices, quotations, and delivery notes all look consistent.',
  },
  {
    q: 'Can I sign a contract or compare two document versions here too?',
    a: 'Yes — Sign Documents and Compare Documents live in Business Suite alongside the document generators, since approving a business document usually means reviewing, signing, and sending it, not just creating it in the first place.',
  },
];

const SECTIONS = [
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

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

const RELATED_CATEGORIES = relatedSuites('business');

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function BusinessPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CategoryLandingClient
        accent={CATEGORY_ACCENTS.business}
        icon={BusinessIcon}
        title="Business Tools"
        subtitle="Professional business documents — invoices, quotations, delivery notes, signatures and ID cards."
        editorial={EDITORIAL}
        sections={SECTIONS_WITH_HREF}
        faqs={FAQS}
        relatedCategories={RELATED_CATEGORIES}
      />
    </>
  );
}
