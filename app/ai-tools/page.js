import CategoryLandingClient from '../../components/CategoryLandingClient';
import { AiIcon, CATEGORY_ACCENTS, relatedSuites } from '../../components/categoryVisuals';
import { buildOgMeta } from '../../lib/pageMetadata';
import { SECTIONS } from '../../lib/toolSections/ai';

const TITLE = 'AI Tools — Convertam';
const DESCRIPTION = 'AI-powered tools that read, summarize, translate and analyze your documents. Powered by Google Gemini. Free, no login required.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/ai-tools' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/ai-tools' }),
};

const EDITORIAL = {
  intro: [
    "AI Workspace is for the tasks a regular converter can't do — reading a photograph of a document, summarizing a report you don't have time to read in full, translating a contract into another language, or turning raw data into a written analysis. Each tool sends only what it needs (extracted text, or the file itself for image-based tools) to Google's Gemini model, and nothing is used to train any AI or kept longer than the job takes.",
    "These tools are genuinely useful, not infallible — AI reads handwriting and low-quality scans imperfectly, and every tool here is built to say so honestly (flagging uncertain text rather than guessing) instead of presenting a confident-sounding wrong answer as fact. Reviewing AI output before you rely on it is worth the extra minute, especially for numbers and names.",
  ],
  whoFor: [
    'Anyone with a scan or photo instead of a real digital document',
    'People who need the gist of a long report without reading every page',
    'Businesses handling contracts, receipts, or documents in another language',
    'Anyone turning raw data or notes into a report or presentation',
  ],
  learnLinks: [
    { title: 'What Is OCR, and When Do You Need It?', href: '/learn/ai-guides/what-is-ocr-and-when-you-need-it' },
    { title: 'How AI Document Translation Actually Works', href: '/learn/ai-guides/how-ai-document-translation-works' },
  ],
};

const FAQS = [
  {
    q: 'Which AI model powers these tools, and is my data used to train it?',
    a: 'Every AI tool here uses Google Gemini via the Google API. Your files and text are sent only to generate your result and are not used to train Gemini or any other model.',
  },
  {
    q: 'Are the AI tools free?',
    a: 'Yes — every AI tool is free, though Document Translator and AI Data Analyst\'s narrative reports have a fair-use daily limit to keep the service sustainable for everyone.',
  },
  {
    q: 'What happens if the AI misreads something?',
    a: "These tools are built to flag uncertainty rather than guess — OCR PDF marks unclear words as [UNREADABLE] instead of inventing text, and AI Data Analyst computes every number itself rather than letting the AI make one up. Always review results before relying on them for anything important.",
  },
  {
    q: 'Can these tools read handwriting or photographs, not just typed text?',
    a: 'Yes — Smart AI Converter, OCR PDF, Receipt & Invoice Scanner, and Contract Summarizer can all work from a clear photo, not just a digitally created file.',
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

const RELATED_CATEGORIES = relatedSuites('ai-tools');

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function AIToolsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CategoryLandingClient
        accent={CATEGORY_ACCENTS.ai}
        icon={AiIcon}
        title="AI Tools"
        subtitle="Powered by Google Gemini AI — smart tools that read, extract, translate and analyze your documents."
        editorial={EDITORIAL}
        sections={SECTIONS_WITH_HREF}
        faqs={FAQS}
        relatedCategories={RELATED_CATEGORIES}
      />
    </>
  );
}
