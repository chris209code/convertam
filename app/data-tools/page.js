import ToolHubClient from '../../components/ToolHubClient';
import { DataIcon, CATEGORY_ACCENTS } from '../../components/categoryVisuals';

export const metadata = {
  title: 'Data Tools — Convertam',
  description: 'Clean, format, validate and convert text and data — JSON, CSV, XML, SQL and more. Free, no login required.',
};

// One flagship Studio per domain, not a fragmented formatter/validator/
// extractor per format — see commit f676af4's rationale. Text Cleaner
// Studio, JSON Studio, and Extract Studio are live and already cover most
// of what a separate "Duplicate Line Remover"/"Email Extractor"/etc. card
// would have offered as its own thin page (a doorway-page pattern this hub
// deliberately avoids repeating). CSV/XML/SQL Studio are the same
// flagship-per-domain shape, not yet built. Base64 and URL Encode/Decode
// are genuinely standalone single-purpose tools, not sub-features of a
// Studio, so they stay as their own entries.
const SECTIONS = [
  {
    id: 'document-parsing',
    label: 'Document Parsing',
    icon: '🧠',
    tools: [
      { slug: 'smart-parser', title: 'Smart Parser', desc: 'Upload any document and extract clean text, structured tables, or the exact custom fields you define — invoices, receipts, reports, statements and more.', icon: '🧠', badge: 'new', available: true, href: '/data-tools/smart-parser' },
    ],
  },
  {
    id: 'text-tools',
    label: 'Text Tools',
    icon: '📝',
    tools: [
      { slug: 'text-cleaner', title: 'Text Cleaner Studio', desc: 'Clean, transform and analyse text instantly — dozens of operations in one workspace.', icon: '🧹', badge: 'new', available: true, href: '/data-tools/text-cleaner' },
      { slug: 'text-case-converter', title: 'Text Case Converter', desc: 'Instantly convert text into UPPERCASE, lowercase, Title Case, camelCase and more.', icon: '🔤', badge: 'free', available: true, href: '/text-case-converter' },
    ],
  },
  {
    id: 'data-tools',
    label: 'Data Format Studios',
    icon: '🗄️',
    tools: [
      { slug: 'json-studio', title: 'JSON Studio', desc: 'Validate, format, analyse and transform JSON files instantly — including conversion to CSV, XML and Text.', icon: '🧩', badge: 'new', available: true, href: '/data-tools/json-studio' },
      { slug: 'csv-studio', title: 'CSV Studio', desc: 'View, clean, analyse and transform CSV data in one professional workspace.', icon: '📈', badge: 'soon', available: false },
      { slug: 'xml-studio', title: 'XML Studio', desc: 'Format, validate and transform XML documents in one workspace.', icon: '🗂️', badge: 'soon', available: false },
      { slug: 'sql-studio', title: 'SQL Studio', desc: 'Format, beautify and validate SQL queries in one workspace.', icon: '🗄️', badge: 'soon', available: false },
    ],
  },
  {
    id: 'extract-convert',
    label: 'Extract',
    icon: '🔀',
    tools: [
      { slug: 'extract-studio', title: 'Extract Studio', desc: 'Extract emails, phone numbers, URLs, numbers and more from text instantly — chain extractors into a pipeline.', icon: '🧲', badge: 'new', available: true, href: '/data-tools/extract-studio' },
    ],
  },
  {
    id: 'encoding-tools',
    label: 'Encoding Tools',
    icon: '🔐',
    tools: [
      { slug: 'base64-encode-decode', title: 'Base64 Encode / Decode', desc: 'Encode text to Base64 or decode a Base64 string.', icon: '🔐', badge: 'soon', available: false },
      { slug: 'url-encode-decode', title: 'URL Encode / Decode', desc: 'Encode or decode URLs and query strings.', icon: '🌐', badge: 'soon', available: false },
    ],
  },
];

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({
  ...s,
  tools: s.tools.map((t) => ({ ...t, href: t.href || `/${t.slug}` })),
}));

export default function DataToolsPage() {
  return (
    <ToolHubClient
      accent={CATEGORY_ACCENTS.data}
      icon={DataIcon}
      title="Data Tools"
      subtitle="Clean, format, validate and convert text and data — all in one place."
      sections={SECTIONS_WITH_HREF}
    />
  );
}
