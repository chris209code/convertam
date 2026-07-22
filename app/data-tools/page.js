import ToolHubClient from '../../components/ToolHubClient';
import { DataIcon, CATEGORY_ACCENTS } from '../../components/categoryVisuals';

export const metadata = {
  title: 'Data Tools — Convertam',
  description: 'Clean, format, validate and convert text and data — JSON, CSV, XML, SQL and more. Free, no login required.',
  // Category temporarily hidden from navigation and the homepage while the
  // remaining studios are still under active development — noindex keeps
  // it out of search results until it's ready to be surfaced. Remove this
  // together with the nav/homepage/sitemap reveal once production-ready.
  robots: { index: false, follow: false },
};

// Architecture-only phase: every tool here is a planned route (slug/href
// already decided so nothing gets renamed later and no duplicate route
// ever gets created) but not yet built, so every card is available:false
// ("Coming Soon") except Word Counter, which already exists today inside
// the Utilities Hub — see components/tools/UtilitiesWorkspace.js. None of
// these slugs are registered in lib/tools-config.js yet; that happens
// tool-by-tool as each one is actually built.
const SECTIONS = [
  {
    id: 'text-tools',
    label: 'Text Tools',
    tools: [
      { slug: 'text-cleaner', title: 'Text Cleaner Studio', desc: 'Clean, transform and analyse text instantly — dozens of operations in one workspace.', badge: 'new', available: true, href: '/data-tools/text-cleaner' },
      { slug: 'duplicate-line-remover', title: 'Duplicate Line Remover', desc: 'Remove duplicate lines from a list or block of text.', badge: 'soon', available: false },
      { slug: 'remove-blank-lines', title: 'Remove Blank Lines', desc: 'Delete empty lines from any text instantly.', badge: 'soon', available: false },
      { slug: 'sort-lines', title: 'Sort Lines', desc: 'Sort lines alphabetically, numerically, or in reverse.', badge: 'soon', available: false },
      { slug: 'find-and-replace', title: 'Find & Replace', desc: 'Find and replace text across a whole document in one pass.', badge: 'soon', available: false },
      { slug: 'utilities-hub', title: 'Word Counter', desc: 'Count words, characters, sentences and reading time instantly.', badge: 'free', available: true, href: '/utilities-hub' },
    ],
  },
  {
    id: 'data-tools',
    label: 'Data Tools',
    tools: [
      { slug: 'json-studio', title: 'JSON Studio', desc: 'Validate, format, analyse and transform JSON files instantly.', badge: 'new', available: true, href: '/data-tools/json-studio' },
      { slug: 'csv-studio', title: 'CSV Studio', desc: 'View, clean, analyse and transform CSV data in one professional workspace.', badge: 'soon', available: false },
      { slug: 'csv-formatter', title: 'CSV Formatter', desc: 'Clean up and align CSV data into a readable table.', badge: 'soon', available: false },
      { slug: 'csv-cleaner', title: 'CSV Cleaner', desc: 'Remove empty rows, fix delimiters, and tidy messy CSV files.', badge: 'soon', available: false },
      { slug: 'xml-formatter', title: 'XML Formatter', desc: 'Format and indent XML documents for readability.', badge: 'soon', available: false },
      { slug: 'sql-formatter', title: 'SQL Formatter', desc: 'Beautify SQL queries with consistent indentation and casing.', badge: 'soon', available: false },
    ],
  },
  {
    id: 'extract-convert',
    label: 'Extract & Convert',
    tools: [
      { slug: 'extract-studio', title: 'Extract Studio', desc: 'Extract emails, phone numbers, URLs, numbers and more from text instantly.', badge: 'new', available: true, href: '/data-tools/extract-studio' },
      { slug: 'email-extractor', title: 'Email Extractor', desc: 'Pull every email address out of a block of text.', badge: 'soon', available: false },
      { slug: 'phone-number-extractor', title: 'Phone Number Extractor', desc: 'Pull every phone number out of a block of text.', badge: 'soon', available: false },
      { slug: 'url-extractor', title: 'URL Extractor', desc: 'Pull every link out of a block of text.', badge: 'soon', available: false },
      { slug: 'number-extractor', title: 'Number Extractor', desc: 'Pull every number out of a block of text.', badge: 'soon', available: false },
      { slug: 'json-to-csv', title: 'JSON to CSV', desc: 'Convert JSON data into a CSV spreadsheet.', badge: 'soon', available: false },
      { slug: 'csv-to-json', title: 'CSV to JSON', desc: 'Convert a CSV file into structured JSON.', badge: 'soon', available: false },
      { slug: 'json-to-xml', title: 'JSON to XML', desc: 'Convert JSON data into XML.', badge: 'soon', available: false },
      { slug: 'xml-to-json', title: 'XML to JSON', desc: 'Convert XML data into JSON.', badge: 'soon', available: false },
    ],
  },
  {
    id: 'encoding-tools',
    label: 'Encoding Tools',
    tools: [
      { slug: 'base64-encode-decode', title: 'Base64 Encode / Decode', desc: 'Encode text to Base64 or decode a Base64 string.', badge: 'soon', available: false },
      { slug: 'url-encode-decode', title: 'URL Encode / Decode', desc: 'Encode or decode URLs and query strings.', badge: 'soon', available: false },
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
