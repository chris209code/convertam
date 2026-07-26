import SmartWorkflowLauncher from '../../components/smart-workflows/SmartWorkflowLauncher';
import { buildOgMeta } from '../../lib/pageMetadata';

const TITLE = 'Smart Workflows — Convertam';
const DESCRIPTION = 'Tell Convertam what you\'re trying to accomplish and get the right tools, in the right order — no need to know the category structure first.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/smart-workflows' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/smart-workflows' }),
};

const FAQS = [
  { q: 'Is this a separate tool?', a: 'No — Smart Workflows is a platform feature that recommends and sequences existing Convertam tools for a goal you describe. It doesn\'t do any processing itself.' },
  { q: 'Does this use AI?', a: 'No, not for the workflows listed here — they\'re matched using a predefined rule-based catalogue. AI is reserved as a future, bounded fallback only for unusual goals this catalogue doesn\'t yet cover.' },
  { q: 'Do I have to re-upload my file at every step?', a: 'No — Smart Workflows works alongside the Document Workspace and Career Session, which already carry your file or job details between compatible tools automatically.' },
  { q: 'Can I skip a step?', a: 'Yes — any step marked "Optional" has a Skip button once you\'re on it.' },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export default function SmartWorkflowsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <section style={{ background: '#F8FAFC', padding: '40px 4%' }}>
        <SmartWorkflowLauncher />
      </section>
      <section style={{ maxWidth: 720, margin: '0 auto', padding: '32px 4% 60px' }}>
        <h2 style={{ fontSize: '1.1rem', color: '#0F172A', marginBottom: 14 }}>Frequently Asked Questions</h2>
        {FAQS.map((f, i) => (
          <div key={i} style={{ borderBottom: '1px solid #E2E8F0', padding: '12px 0' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>{f.q}</p>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>{f.a}</p>
          </div>
        ))}
      </section>
    </>
  );
}
