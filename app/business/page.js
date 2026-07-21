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
      { slug: 'business-document-studio', title: 'Business Document Studio', desc: 'Create invoices, quotations, delivery notes and waybills from one professional workspace', icon: '🧾', badge: 'new', available: true },
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
      sections={SECTIONS_WITH_HREF}
    />
  );
}
