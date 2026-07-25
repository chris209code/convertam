import CategoryLandingClient from '@/components/CategoryLandingClient';
import { UtilitiesIcon, CATEGORY_ACCENTS, relatedSuites } from '@/components/categoryVisuals';
import { buildOgMeta } from '@/lib/pageMetadata';

const TITLE = 'Utilities — Convertam';
const DESCRIPTION = 'Free everyday utilities. Custom QR code generator, secure password generator and text case converter. No login required.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/utilities' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/utilities' }),
};

const EDITORIAL = {
  intro: [
    "Utilities is the small, focused set of tools that don't fit neatly into documents, images, or business paperwork, but come up constantly anyway — a QR code for a menu or Wi-Fi network, a strong password for a new account, or a quick text reformat into a different case for code or a heading. Each one is a complete, polished tool in its own right rather than an afterthought bolted onto something else.",
    'Everything here runs entirely in your browser: QR codes are generated and styled client-side, passwords are never transmitted anywhere, and text stays on your device while it\'s reformatted. There\'s nothing to install, nothing to sign up for, and no limit on how many times you use any of them.',
  ],
  whoFor: [
    'Anyone creating a QR code for a menu, business card, or Wi-Fi network',
    'Anyone setting up a new account and needing a genuinely strong password',
    'Developers and writers reformatting text into a specific case',
  ],
  learnLinks: [
    { title: 'How to Build a Strong Password', href: '/learn/productivity-guides/how-to-build-a-strong-password' },
    { title: 'QR Codes for Business', href: '/learn/productivity-guides/qr-codes-for-business' },
  ],
};

const FAQS = [
  {
    q: 'Are these utilities free to use?',
    a: 'Yes — QR Code Studio, Password Studio, and Text Case Converter are all completely free, with no login and no usage limit.',
  },
  {
    q: 'Is my data (passwords, QR content, text) sent to a server?',
    a: 'No — all three tools run entirely in your browser. Generated passwords, QR code content, and text conversions never leave your device.',
  },
  {
    q: 'Can I customize the look of a QR code, or is it just a plain black-and-white grid?',
    a: 'QR Code Studio supports gradients, custom module and corner shapes, a center logo, and a caption — with built-in scan validation to confirm it still reads reliably after styling.',
  },
];

const SECTIONS = [
  {
    id: 'all',
    label: 'All Utilities',
    icon: '⚙️',
    tools: [
      { slug: 'qr-code-generator', title: 'QR Code Studio', desc: 'Create fully customizable QR codes with logos, gradients and scan validation', icon: '📱', badge: 'free' },
      { slug: 'password-generator', title: 'Password Studio', desc: 'Generate secure passwords with live strength and entropy analysis', icon: '🔐', badge: 'free' },
      { slug: 'text-case-converter', title: 'Text Case Converter', desc: 'Instantly convert text into UPPERCASE, camelCase, snake_case and more', icon: '🔤', badge: 'free' },
    ],
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

const RELATED_CATEGORIES = relatedSuites('utilities');

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function UtilitiesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CategoryLandingClient
        accent={CATEGORY_ACCENTS.utilities}
        icon={UtilitiesIcon}
        title="Utilities"
        subtitle="Handy, focused tools for everyday tasks — QR codes, passwords, and text formatting."
        editorial={EDITORIAL}
        sections={SECTIONS_WITH_HREF}
        faqs={FAQS}
        relatedCategories={RELATED_CATEGORIES}
      />
    </>
  );
}
