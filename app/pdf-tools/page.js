import CategoryLandingClient from '../../components/CategoryLandingClient';
import { PdfIcon, CATEGORY_ACCENTS, relatedSuites } from '../../components/categoryVisuals';
import { buildOgMeta } from '../../lib/pageMetadata';
import { SECTIONS } from '../../lib/toolSections/pdf';

const TITLE = 'PDF Tools — Convertam';
const DESCRIPTION = 'Complete PDF toolkit. Convert, edit, merge, split, compress, sign, watermark and secure your PDFs. Free, no login required.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/pdf-tools' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/pdf-tools' }),
};

const EDITORIAL = {
  intro: [
    "PDF is the one format almost every important document eventually becomes — a submitted application, an invoice you need to keep exactly as sent, a report ready to share. The PDF Suite covers the entire lifecycle of that file: turning it into something else (Word, Excel, PowerPoint, images), reshaping it (merging, splitting, reordering, extracting pages), marking it up (watermarking, adding page numbers, redacting), and locking it down (password protection). Signing a document or comparing two versions of one now live in Business Suite, since those are things you do to a contract, not to a PDF specifically.",
    "Most of these 26 tools run entirely in your browser, so your file is processed on your own device and never touches a server — a genuine privacy guarantee, not a policy promise. A handful of format conversions (PDF to Word/Excel/PowerPoint, and Compress PDF) need a dedicated conversion engine and carry a small per-use fee, shown upfront before you pay anything.",
  ],
  whoFor: [
    'Students and job seekers assembling application documents',
    'Small business owners preparing contracts, invoices and reports',
    'Anyone who received a scan and needs it in an editable format',
    'Teams that need to watermark, redact or password-protect files before sending',
  ],
  learnLinks: [
    { title: 'How to Merge PDF Files Without Losing Quality', href: '/learn/pdf-guides/how-to-merge-pdf-files-without-losing-quality' },
    { title: 'How to Compress a PDF Without Losing Quality', href: '/learn/pdf-guides/how-to-compress-a-pdf-without-losing-quality' },
    { title: 'How to Convert PDF to Word Without Breaking Formatting', href: '/learn/pdf-guides/how-to-convert-pdf-to-word-without-breaking-formatting' },
  ],
};

const FAQS = [
  {
    q: 'Is Convertam\'s PDF tools really free?',
    a: 'Yes — most PDF tools (merging, splitting, signing, watermarking, redacting, reordering, and more) are completely free with no limits. A small per-use fee applies only to tools that need a paid conversion engine: PDF to Word/Excel/PowerPoint and Compress PDF.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. Every PDF tool works without signing up, logging in, or providing an email address — upload your file and get started immediately.',
  },
  {
    q: 'Are my files secure?',
    a: 'Browser-based tools (Merge PDF, Split PDF, Redact & Edit PDF, and most others) process everything locally on your device — your file never leaves your browser. Tools that require server-side processing use encrypted transfer and delete your file immediately after the job completes.',
  },
  {
    q: 'What\'s the maximum file size?',
    a: 'Most PDF tools support files up to 100MB, whether they\'re free or paid.',
  },
  {
    q: 'Can I combine multiple PDF tools for one task?',
    a: 'Yes — many people scan a document, enhance it, run OCR, then convert it to Word, or merge, watermark, and password-protect a document before sending it. Each tool is designed to hand off cleanly into the next.',
  },
  {
    q: 'Which file formats can I convert to and from?',
    a: 'PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), JPG, and PNG, with more formats added over time.',
  },
];

const RELATED_CATEGORIES = relatedSuites('pdf-tools');

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function PdfToolsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CategoryLandingClient
        accent={CATEGORY_ACCENTS.pdf}
        icon={PdfIcon}
        title="PDF Tools"
        subtitle="Convert, edit, organize, secure and optimize PDF files — all free, all in one place."
        editorial={EDITORIAL}
        sections={SECTIONS_WITH_HREF}
        faqs={FAQS}
        relatedCategories={RELATED_CATEGORIES}
      />
    </>
  );
}
