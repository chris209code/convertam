import ToolHubClient from '../../components/ToolHubClient';
import { AiIcon, CATEGORY_ACCENTS } from '../../components/categoryVisuals';

export const metadata = {
  title: 'AI Tools — Convertam',
  description: 'AI-powered document tools. Summarize PDFs, extract text, improve CVs and more. Free, no login required.',
};

const SECTIONS = [
  {
    id: 'all',
    label: 'All AI Tools',
    icon: '🤖',
    tools: [
      { slug: 'summarize-pdf', title: 'Summarize PDF', desc: 'Upload a PDF and AI summarizes it instantly', icon: '📚', badge: 'free' },
      { slug: 'smart-converter', title: 'Smart AI Converter', desc: 'Photograph a document and get back a Word or Excel file', icon: '📸', badge: 'free' },
      { slug: 'receipt-scanner', title: 'Receipt & Invoice Scanner', desc: 'Scan a receipt and AI extracts vendor, items, totals', icon: '🧾', badge: 'free' },
      { slug: 'ocr-pdf', title: 'OCR PDF', desc: 'Extract text from scanned PDFs and images using AI', icon: '🔎', badge: 'free' },
      { slug: 'ask-solve-ai', title: 'Ask & Solve AI', desc: 'Scan, type or upload a question and get clear answers instantly', icon: '💡', badge: 'free' },
      { slug: 'document-translator', title: 'Document Translator', desc: 'Translate a PDF, Word, PowerPoint or text file with layout preserved', icon: '🌐', badge: 'free' },
      { slug: 'contract-summarizer', title: 'Contract Summarizer', desc: 'Upload a contract and AI highlights key points', icon: '📜', badge: 'free' },
      { slug: 'presentation-generator', title: 'AI Presentation Generator', desc: 'Turn documents into an editable PowerPoint presentation', icon: '🎞️', badge: 'free' },
      { slug: 'data-analyst', title: 'AI Data Analyst', desc: 'Upload data and get charts, insights, and an executive report', icon: '📊', badge: 'free' },
    ],
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: `/${t.slug}` })) }));

export default function AIToolsPage() {
  return (
    <ToolHubClient
      accent={CATEGORY_ACCENTS.ai}
      icon={AiIcon}
      title="AI Tools"
      subtitle="Powered by Google Gemini AI — smart tools that read, extract and improve your documents."
      sections={SECTIONS_WITH_HREF}
    />
  );
}
