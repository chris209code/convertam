import ToolHubClient from '../../components/ToolHubClient';
import { DataIcon, CATEGORY_ACCENTS } from '../../components/categoryVisuals';

export const metadata = {
  title: 'Data Tools — Convertam',
  description: 'Clean, format, validate and convert text and data — JSON, CSV, XML, SQL and more. Free, no login required.',
};

// One flagship Studio per domain, not a fragmented formatter/validator/
// extractor per format — see commit f676af4's rationale. Grouped by what
// the user is actually trying to do (parse a document, clean/transform
// data, query it, or encode/decode a value) rather than by file format,
// so the hub reads as one coherent Data Workspace product rather than a
// grab-bag of format converters.
const SECTIONS = [
  {
    id: 'parse-extract',
    label: 'Parse & Extract',
    icon: '🧠',
    tools: [
      { slug: 'smart-parser', title: 'Smart Parser', desc: 'Upload any document and extract clean text, structured tables, or the exact custom fields you define — invoices, receipts, reports, statements and more.', icon: '🧠', badge: 'new', available: true, href: '/data-tools/smart-parser' },
      { slug: 'extract-studio', title: 'Extract Studio', desc: 'Extract emails, phone numbers, URLs, numbers and more from text instantly — chain extractors into a pipeline.', icon: '🧲', badge: 'new', available: true, href: '/data-tools/extract-studio' },
    ],
  },
  {
    id: 'clean-transform',
    label: 'Clean & Transform',
    icon: '🧹',
    tools: [
      { slug: 'text-cleaner', title: 'Text Cleaner Studio', desc: 'Clean, transform and analyse text instantly — dozens of operations in one workspace.', icon: '🧹', badge: 'new', available: true, href: '/data-tools/text-cleaner' },
      { slug: 'csv-studio', title: 'CSV Studio', desc: 'A real spreadsheet-like workspace to edit, clean, deduplicate and analyse CSV data — with correct import/export round-tripping.', icon: '📈', badge: 'new', available: true, href: '/data-tools/csv-studio' },
      { slug: 'xml-studio', title: 'XML Studio', desc: 'Format, validate, browse as a tree, and convert XML to JSON or CSV — protected against XXE and malformed payloads.', icon: '🗂️', badge: 'new', available: true, href: '/data-tools/xml-studio' },
      { slug: 'json-studio', title: 'JSON Studio', desc: 'Validate, format, analyse and transform JSON files instantly — including conversion to CSV, XML and Text.', icon: '🧩', badge: 'new', available: true, href: '/data-tools/json-studio' },
      { slug: 'text-case-converter', title: 'Text Case Converter', desc: 'Instantly convert text into UPPERCASE, lowercase, Title Case, camelCase and more.', icon: '🔤', badge: 'free', available: true, href: '/text-case-converter' },
    ],
  },
  {
    id: 'query-analyze',
    label: 'Query & Analyze',
    icon: '🗄️',
    tools: [
      { slug: 'sql-studio', title: 'SQL Studio', desc: 'Write and run real SQL — SELECT, JOIN, GROUP BY, INSERT, UPDATE, DELETE — directly against CSV, JSON or XLSX data you import, entirely in your browser.', icon: '🗄️', badge: 'new', available: true, href: '/data-tools/sql-studio' },
    ],
  },
  {
    id: 'encoding-utilities',
    label: 'Encoding & Utilities',
    icon: '🔐',
    tools: [
      { slug: 'base64', title: 'Base64 Encode / Decode', desc: 'Encode text or files to Base64, or decode back to text or a file — correct Unicode and binary handling.', icon: '🔐', badge: 'new', available: true, href: '/data-tools/base64' },
      { slug: 'url-encoder', title: 'URL Encoder / Decoder', desc: 'Correctly percent-encode or decode URLs and query strings — spaces, Unicode, and reserved characters handled properly.', icon: '🌐', badge: 'new', available: true, href: '/data-tools/url-encoder' },
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
