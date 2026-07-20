import ToolHubClient from '../../components/ToolHubClient';
import { BusinessIcon, CATEGORY_ACCENTS } from '../../components/categoryVisuals';

export const metadata = {
  title: 'Business Tools — Convertam',
  description: 'Free business document tools. Create invoices, quotations, receipts, ID cards and more. No login required.',
};

const SECTIONS = [
  {
    id: 'all',
    label: 'All Business Tools',
    icon: '🧾',
    tools: [
      { slug: 'invoice-generator', title: 'Invoice Generator', desc: 'Create professional PDF invoices in seconds', icon: '🧾', badge: 'free' },
      { slug: 'quotation-generator', title: 'Quotation Generator', desc: 'Generate professional quotations and proforma invoices', icon: '📋', badge: 'free' },
      { slug: 'delivery-note-waybill', title: 'Delivery Note & Waybill Generator', desc: 'Confirm delivery or document goods in transit', icon: '🚚', badge: 'free' },
      { slug: 'id-card-generator', title: 'ID Card Generator', desc: 'Design and print professional ID cards', icon: '🪪', badge: 'free' },
    ],
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

export default function BusinessPage() {
  return (
    <ToolHubClient
      accent={CATEGORY_ACCENTS.business}
      icon={BusinessIcon}
      title="Business Tools"
      subtitle="Professional business documents — invoices, quotations, receipts and more."
      searchPlaceholder="Search business tools…"
      featured={{ slug: 'invoice-generator', href: '/invoice-generator', icon: '🧾', title: 'Invoice Generator', desc: 'Your most common business document — create a professional PDF invoice in seconds.' }}
      sections={SECTIONS_WITH_HREF}
    />
  );
}
