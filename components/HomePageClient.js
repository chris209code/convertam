'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

// Google's SearchAction schema needs a real URL target that actually
// performs a search — "/?q={search_term_string}" plus this effect (which
// pre-fills the search box from that query param on load) makes that true,
// rather than the schema pointing at a URL that silently does nothing.
const SEARCH_ACTION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Convertam',
  url: 'https://www.convertam.app',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: 'https://www.convertam.app/?q={search_term_string}' },
    'query-input': 'required name=search_term_string',
  },
};
const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Convertam',
  url: 'https://www.convertam.app',
  logo: 'https://www.convertam.app/logo.png',
  sameAs: ['https://x.com/chrisndz'],
};

// A newer, more professional icon set for the homepage category cards only —
// categoryVisuals.js's icons are shared with every suite landing page (via
// CATEGORY_ACCENTS), which weren't part of this redesign, so this set lives
// here rather than replacing those and silently changing pages nobody asked
// to change.
const PdfSuiteIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M5 3.8A1.8 1.8 0 0 1 6.8 2h7.4L19 6.8v13.4A1.8 1.8 0 0 1 17.2 22H6.8A1.8 1.8 0 0 1 5 20.2z" fill="#fff" />
    <path d="M14.2 2v3.6c0 .77.63 1.4 1.4 1.4H19" fill="none" stroke="#F1F5F9" strokeWidth="1" />
    <rect x="4" y="13.4" width="11.5" height="6.6" rx="1.4" fill="#DC2626" />
    <text x="9.7" y="18.3" fontFamily="Arial, sans-serif" fontSize="5.3" fontWeight="800" fill="#fff" textAnchor="middle">PDF</text>
  </svg>
);
const BusinessSuiteIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <rect x="2.5" y="8" width="19" height="12" rx="2.5" fill="#fff" />
    <path d="M9 8V6.5A2.5 2.5 0 0 1 11.5 4h1A2.5 2.5 0 0 1 15 6.5V8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    <rect x="10.3" y="12.4" width="3.4" height="2.6" rx="0.6" fill="#059669" />
  </svg>
);
const AiWorkspaceIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <rect x="11" y="2.6" width="2" height="4" rx="1" fill="#fff" />
    <circle cx="12" cy="2.6" r="1.5" fill="#fff" />
    <rect x="4" y="8" width="16" height="12.5" rx="4" fill="#fff" />
    <circle cx="9.2" cy="14.2" r="1.6" fill="#7C3AED" />
    <circle cx="14.8" cy="14.2" r="1.6" fill="#7C3AED" />
    <rect x="9" y="17.2" width="6" height="1.5" rx="0.75" fill="#7C3AED" opacity="0.55" />
  </svg>
);
const CareerStudioIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <rect x="4" y="2.6" width="14" height="18" rx="2" fill="#fff" />
    <rect x="6.3" y="6.4" width="8.5" height="1.3" rx="0.6" fill="#0EA5E9" />
    <rect x="6.3" y="9.2" width="8.5" height="1.1" rx="0.55" fill="#0EA5E9" opacity="0.4" />
    <rect x="6.3" y="11.4" width="6" height="1.1" rx="0.55" fill="#0EA5E9" opacity="0.4" />
    <circle cx="17.2" cy="16.2" r="4.2" fill="#0EA5E9" />
    <path d="M15.4 16.3l1.2 1.2 2.1-2.5" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ImageStudioIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <rect x="2.5" y="4" width="19" height="16" rx="2.5" fill="#fff" />
    <circle cx="8.3" cy="9.6" r="2" fill="#F97316" />
    <path d="M3.8 17.8l5.4-6.3 4 4.1 3.4-4.1 4.9 6.3" fill="none" stroke="#F97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const DataWorkspaceIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <path d="M4 5.5v13c0 1.66 3.58 3 8 3s8-1.34 8-3v-13" fill="#fff" opacity="0.92" />
    <ellipse cx="12" cy="5.5" rx="8" ry="3" fill="#fff" />
    <path d="M4 11c0 1.66 3.58 3 8 3s8-1.34 8-3" fill="none" stroke="#0891B2" strokeWidth="1.3" opacity="0.55" />
    <path d="M4 16c0 1.66 3.58 3 8 3s8-1.34 8-3" fill="none" stroke="#0891B2" strokeWidth="1.3" opacity="0.55" />
  </svg>
);
const CalculatorsIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <rect x="5" y="2" width="14" height="20" rx="2.5" fill="#fff" />
    <rect x="7" y="4.2" width="10" height="4" rx="1" fill="#2563EB" />
    <g fill="#2563EB" opacity="0.55">
      <circle cx="8.6" cy="11.6" r="1.1" /><circle cx="12" cy="11.6" r="1.1" /><circle cx="15.4" cy="11.6" r="1.1" />
      <circle cx="8.6" cy="15.1" r="1.1" /><circle cx="12" cy="15.1" r="1.1" /><circle cx="15.4" cy="15.1" r="1.1" />
    </g>
    <rect x="7" y="18" width="10" height="2" rx="1" fill="#2563EB" opacity="0.55" />
  </svg>
);
const UtilitiesIconV2 = (
  <svg width="22" height="22" viewBox="0 0 24 24">
    <g transform="rotate(45 12 12)">
      <rect x="10.5" y="3" width="3" height="18" rx="1.5" fill="#fff" />
      <circle cx="12" cy="4.6" r="3.3" fill="none" stroke="#fff" strokeWidth="2.2" />
      <circle cx="12" cy="19.4" r="2.2" fill="#fff" />
    </g>
  </svg>
);

// ---------------------------------------------------------------------------
// Every route below is a REAL, existing Convertam route — verified against
// lib/tools-config.js and the actual category listing pages before writing
// this file. Where the design export's placeholder tool didn't have a real
// 1:1 equivalent (e.g. separate JPG-to-PNG/PNG-to-JPG tools, or a Certificate
// Generator), it's been swapped for the closest real tool rather than left
// pointing at a route that doesn't exist.
// ---------------------------------------------------------------------------

const ALL_TOOLS = [
  { name: 'PDF to Word', href: '/pdf-to-word' },
  { name: 'Word to PDF', href: '/word-to-pdf' },
  { name: 'PDF to Excel', href: '/pdf-to-excel' },
  { name: 'Excel to PDF', href: '/excel-to-pdf' },
  { name: 'PDF to PowerPoint', href: '/pdf-to-powerpoint' },
  { name: 'PowerPoint to PDF', href: '/powerpoint-to-pdf' },
  { name: 'HTML to PDF', href: '/html-to-pdf' },
  { name: 'Merge PDF', href: '/merge-pdf' },
  { name: 'Split PDF', href: '/split-pdf' },
  { name: 'Compress PDF', href: '/compress-pdf' },
  { name: 'Rotate PDF', href: '/rotate-pdf' },
  { name: 'Extract PDF Pages', href: '/extract-pdf-pages' },
  { name: 'Remove PDF Pages', href: '/remove-pdf-pages' },
  { name: 'Add Page Numbers', href: '/add-page-numbers' },
  { name: 'Protect PDF', href: '/protect-pdf' },
  { name: 'Images to PDF', href: '/images-to-pdf' },
  { name: 'Extract PDF Images', href: '/extract-pdf-images' },
  { name: 'PDF Compare', href: '/compare-pdf' },
  { name: 'Screenshot Studio', href: '/screenshot-studio' },
  { name: 'Redact & Edit PDF', href: '/redact-pdf' },
  { name: 'PDF Overlay', href: '/pdf-overlay' },
  { name: 'PDF to Images', href: '/pdf-to-png' },
  { name: 'Write on PDF', href: '/write-on-pdf' },
  { name: 'Fill PDF Forms', href: '/fill-pdf' },
  { name: 'Sign Documents', href: '/sign-documents' },
  { name: 'Reorder PDF Pages', href: '/reorder-pdf' },
  { name: 'Watermark PDF', href: '/watermark-pdf' },
  { name: 'OCR PDF', href: '/ocr-pdf' },
  { name: 'Business Document Studio', href: '/business-document-studio' },
  { name: 'Quotation Generator', href: '/quotation-generator' },
  { name: 'Delivery Note & Waybill', href: '/delivery-note-waybill' },
  { name: 'ID Card Generator', href: '/id-card-generator' },
  { name: 'Summarize PDF', href: '/summarize-pdf' },
  { name: 'Smart AI Converter', href: '/smart-converter' },
  { name: 'Receipt & Invoice Scanner', href: '/receipt-scanner' },
  { name: 'Document Translator', href: '/document-translator' },
  { name: 'Contract Summarizer', href: '/contract-summarizer' },
  { name: 'CV Improver', href: '/cv-improver' },
  { name: 'Resume Builder', href: '/resume-builder' },
  { name: 'Cover Letter Writer', href: '/cover-letter' },
  { name: 'AI Data Analyst', href: '/data-analyst' },
  { name: 'AI Presentation Generator', href: '/presentation-generator' },
  { name: 'Image Compressor', href: '/image-compressor' },
  { name: 'Image Resizer & Cropper', href: '/resize-image' },
  { name: 'Watermark Image', href: '/watermark-image' },
  { name: 'Image Format Converter', href: '/convert-image-format' },
  { name: 'Meme Generator', href: '/meme-generator' },
  { name: 'Document Enhancer', href: '/document-enhancer' },
  { name: 'Calculator Hub', href: '/calculator-hub' },
  { name: 'QR Code Generator', href: '/qr-code-generator' },
  { name: 'Password Studio', href: '/password-generator' },
  { name: 'Text Case Converter', href: '/text-case-converter' },
];

const CATEGORIES = [
  {
    name: 'PDF Suite',
    gradient: 'linear-gradient(120deg, #EF4444 0%, #DC2626 100%)',
    bodyTint: '#FFFBFA',
    borderColor: '#FEE2E2',
    dotColor: '#EF4444',
    accentText: '#DC2626',
    icon: 'fileText',
    viewAllHref: '/pdf-tools',
    tools: [
      { name: 'PDF to Word', href: '/pdf-to-word' },
      { name: 'Compress PDF', href: '/compress-pdf' },
      { name: 'Word to PDF', href: '/word-to-pdf' },
      { name: 'Split PDF', href: '/split-pdf' },
      { name: 'Merge PDF', href: '/merge-pdf' },
      { name: 'OCR PDF', href: '/ocr-pdf' },
    ],
  },
  {
    name: 'Business Suite',
    gradient: 'linear-gradient(120deg, #10B981 0%, #059669 100%)',
    bodyTint: '#F7FDFB',
    borderColor: '#D1FAE5',
    dotColor: '#10B981',
    accentText: '#059669',
    icon: 'briefcase',
    viewAllHref: '/business',
    tools: [
      { name: 'Business Document Studio', href: '/business-document-studio' },
      { name: 'Quotation Generator', href: '/quotation-generator' },
      { name: 'Delivery Note & Waybill', href: '/delivery-note-waybill' },
      { name: 'ID Card Generator', href: '/id-card-generator' },
    ],
  },
  {
    name: 'Career Studio',
    gradient: 'linear-gradient(120deg, #38BDF8 0%, #0EA5E9 100%)',
    bodyTint: '#F7FCFF',
    borderColor: '#BAE6FD',
    dotColor: '#38BDF8',
    accentText: '#0369A1',
    icon: 'careerStudio',
    viewAllHref: '/career-studio',
    tools: [
      { name: 'CV Improver', href: '/cv-improver' },
      { name: 'Resume Builder', href: '/resume-builder' },
      { name: 'Cover Letter Writer', href: '/cover-letter' },
    ],
  },
  {
    name: 'AI Workspace',
    gradient: 'linear-gradient(120deg, #8B5CF6 0%, #7C3AED 100%)',
    bodyTint: '#FBFAFF',
    borderColor: '#EDE9FE',
    dotColor: '#8B5CF6',
    accentText: '#7C3AED',
    icon: 'sparkles',
    viewAllHref: '/ai-tools',
    tools: [
      { name: 'AI Data Analyst', href: '/data-analyst' },
      { name: 'AI Presentation Generator', href: '/presentation-generator' },
      { name: 'Summarize PDF', href: '/summarize-pdf' },
      { name: 'Document Translator', href: '/document-translator' },
      { name: 'Contract Summarizer', href: '/contract-summarizer' },
      { name: 'Smart AI Converter', href: '/smart-converter' },
    ],
  },
  {
    name: 'Image Studio',
    gradient: 'linear-gradient(120deg, #F59E0B 0%, #F97316 100%)',
    bodyTint: '#FFFCF7',
    borderColor: '#FEF3C7',
    dotColor: '#F59E0B',
    accentText: '#EA580C',
    icon: 'image',
    viewAllHref: '/image-tools',
    tools: [
      { name: 'Image Compressor', href: '/image-compressor' },
      { name: 'Image Resizer & Cropper', href: '/resize-image' },
      { name: 'Watermark Image', href: '/watermark-image' },
      { name: 'Format Converter', href: '/convert-image-format' },
      { name: 'Meme Generator', href: '/meme-generator' },
      { name: 'Document Enhancer', href: '/document-enhancer' },
    ],
  },
  {
    name: 'Calculators',
    gradient: 'linear-gradient(120deg, #2563EB 0%, #3B82F6 100%)',
    bodyTint: '#F7FAFF',
    borderColor: '#DBEAFE',
    dotColor: '#2563EB',
    accentText: '#2563EB',
    icon: 'calculator',
    viewAllHref: '/calculator-hub',
    tools: [
      { name: 'Salary Calculator', href: '/salary-calculator' },
      { name: 'Loan Calculator', href: '/calculators/loan-calculator' },
      { name: 'VAT Calculator', href: '/calculators/vat-calculator' },
      { name: 'Profit & Loss', href: '/calculators/profit-margin' },
      { name: 'Discount Calculator', href: '/calculators/discount-calculator' },
      { name: 'Age Calculator', href: '/calculators/age-calculator' },
      { name: 'Expense & Budget Calculator', href: '/calculators/expense-budget-calculator' },
    ],
  },
  {
    name: 'Utilities',
    gradient: 'linear-gradient(120deg, #475569 0%, #64748B 100%)',
    bodyTint: '#F8FAFC',
    borderColor: '#E2E8F0',
    dotColor: '#64748B',
    accentText: '#475569',
    icon: 'grid',
    viewAllHref: '/utilities',
    tools: [
      { name: 'QR Code Generator', href: '/qr-code-generator' },
      { name: 'Password Studio', href: '/password-generator' },
      { name: 'Text Case Converter', href: '/text-case-converter' },
    ],
  },
  // Data Workspace category card is temporarily hidden from the homepage
  // while the remaining Data Tools studios are still under active
  // development — re-add this object once they're ready. The hub itself
  // (/data-tools) and its live studios (Text Cleaner, JSON, Extract) are
  // untouched and still fully reachable by direct link; only this
  // homepage entry point is removed.
  // {
  //   name: 'Data Workspace',
  //   gradient: 'linear-gradient(120deg, #22D3EE 0%, #0891B2 100%)',
  //   bodyTint: '#ECFEFF',
  //   borderColor: '#A5F3FC',
  //   dotColor: '#22D3EE',
  //   accentText: '#0E7490',
  //   icon: 'data',
  //   viewAllHref: '/data-tools',
  //   tools: [
  //     { name: 'Text Cleaner Studio', href: '/data-tools/text-cleaner' },
  //     { name: 'JSON Studio', href: '/data-tools/json-studio' },
  //     { name: 'Extract Studio', href: '/data-tools/extract-studio' },
  //     { name: 'CSV Formatter', href: '/data-tools' },
  //   ],
  // },
];

const TRENDING_TOOLS = [
  { name: 'AI Data Analyst', href: '/data-analyst' },
  { name: 'AI Presentation Generator', href: '/presentation-generator' },
  { name: 'CV Improver', href: '/cv-improver' },
  { name: 'Resume Builder', href: '/resume-builder' },
  { name: 'PDF to Word', href: '/pdf-to-word' },
];

const ICONS = {
  fileText: PdfSuiteIcon,
  briefcase: BusinessSuiteIcon,
  careerStudio: CareerStudioIcon,
  sparkles: AiWorkspaceIcon,
  image: ImageStudioIcon,
  calculator: CalculatorsIcon,
  grid: UtilitiesIconV2,
  data: DataWorkspaceIcon,
  shield: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z" /></svg>
  ),
  lock: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
  ),
  zap: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 11 14 9 22 21 10 13 10 13 2" /></svg>
  ),
  globe: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" /></svg>
  ),
};

const TRUST_ITEMS = [
  { title: '100% Free to Use', subtitle: 'All tools are free. No hidden charges.', bg: '#DBEAFE', icon: 'shield' },
  { title: 'Private & Secure', subtitle: 'Your files are encrypted and never stored.', bg: '#D1FAE5', icon: 'lock' },
  { title: 'Super Fast', subtitle: 'Optimized for speed. Get results in seconds.', bg: '#EDE9FE', icon: 'zap' },
  { title: 'Works Anywhere', subtitle: 'On any device, anytime, anywhere.', bg: '#FFEDD5', icon: 'globe' },
];

export default function HomePageClient() {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);

  // Pre-fills the search box from ?q= so the SearchAction schema's URL
  // target actually does something real when visited, not just a URL that
  // resolves to the plain homepage.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q) { setSearch(q); setShowResults(true); }
  }, []);

  // A real, working search over the actual tool list — no pre-existing
  // search route was found anywhere in the project to hook into, so this
  // filters live against the same tools every category page lists.
  const results = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return ALL_TOOLS.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 8);
  }, [search]);

  function handleSubmit(e) {
    e.preventDefault();
    if (results[0]) {
      window.location.href = results[0].href;
    }
  }

  return (
    <section className="cvt-home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SEARCH_ACTION_SCHEMA) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }} />
      {/* dangerouslySetInnerHTML, not a JSX text child: react-dom/server HTML-escapes
          text children (e.g. ' -> &#x27;) but <style> is a raw-text element per the
          HTML spec, so the browser never decodes that entity back — a guaranteed
          hydration mismatch for any rule with a quote character, like the
          font-family: 'Inter' below or .cvt-cat-header::after's content: ''.
          dangerouslySetInnerHTML sets raw HTML identically server and client. */}
      <style dangerouslySetInnerHTML={{ __html: `
        .cvt-home { position: relative; background: linear-gradient(180deg, #FFFFFF 0%, #F4F7FB 55%, #EFF3F8 100%); overflow: hidden; padding: 20px 32px 40px; font-family: 'Inter', Helvetica, Arial, sans-serif; }
        .cvt-blob-1 { position: absolute; top: 30px; left: 40px; width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.10), rgba(37,99,235,0)); }
        .cvt-blob-2 { position: absolute; top: 120px; left: 150px; width: 20px; height: 20px; border-radius: 50%; background: rgba(37,99,235,0.18); }
        .cvt-blob-3 { position: absolute; top: 20px; right: 60px; width: 190px; height: 190px; border-radius: 50%; background: radial-gradient(circle, rgba(16,185,129,0.12), rgba(16,185,129,0)); animation: cvtFloat 9s ease-in-out infinite; }
        .cvt-blob-4 { position: absolute; bottom: -40px; left: -40px; width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.08), rgba(37,99,235,0)); }
        .cvt-dots { position: absolute; inset: 0; background-image: radial-gradient(rgba(100,116,139,0.10) 1px, transparent 1px); background-size: 22px 22px; opacity: 0.5; -webkit-mask-image: radial-gradient(ellipse 60% 40% at 50% 15%, black 0%, transparent 70%); mask-image: radial-gradient(ellipse 60% 40% at 50% 15%, black 0%, transparent 70%); pointer-events: none; }
        @keyframes cvtFloat { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }

        .cvt-inner { position: relative; max-width: 1160px; margin: 0 auto; }

        .cvt-eyebrow-wrap { display: flex; justify-content: center; margin-bottom: 10px; }
        .cvt-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 600; color: #64748B; background: #fff; border: 1px solid #E2E8F0; border-radius: 999px; padding: 4px 10px 4px 8px; box-shadow: 0 1px 2px rgba(15,23,42,0.04); }
        .cvt-eyebrow-dot { width: 5px; height: 5px; border-radius: 50%; background: #10B981; flex-shrink: 0; }
        @media (max-width: 480px) { .cvt-eyebrow { font-size: 9.5px; text-align: left; } }

        .cvt-hero { text-align: center; max-width: 780px; margin: 0 auto; }
        .cvt-hero h1 { font-size: clamp(1.9rem, 3.2vw, 2.75rem); line-height: 1.02; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 8px; color: #0F172A; }
        .cvt-hero-gradient { background: linear-gradient(90deg, #2563EB 0%, #10B981 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .cvt-hero p { font-size: 15px; line-height: 1.4; color: #475569; max-width: 580px; margin: 0 auto 18px; font-weight: 500; }
        @media (max-width: 640px) { .cvt-hero h1 { font-size: 1.9rem; } }

        .cvt-search-wrap { max-width: 760px; margin: 0 auto 14px; position: relative; }
        .cvt-search-form { display: flex; align-items: center; gap: 8px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 10px 30px rgba(15,23,42,0.07), 0 1px 2px rgba(15,23,42,0.04); padding: 6px 6px 6px 18px; }
        .cvt-search-form input { flex: 1; border: none; outline: none; font-size: 15px; font-family: inherit; color: #0F172A; background: transparent; padding: 8px 0; }
        .cvt-search-btn { display: flex; align-items: center; gap: 8px; background: #2563EB; color: #fff; border: none; border-radius: 11px; padding: 10px 22px; font-size: 14.5px; font-weight: 600; font-family: inherit; cursor: pointer; flex-shrink: 0; transition: background 180ms ease; }
        .cvt-search-btn:hover { background: #1D4ED8; }
        .cvt-search-results { position: absolute; top: calc(100% + 6px); left: 0; right: 0; background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; box-shadow: 0 10px 30px rgba(15,23,42,0.1); overflow: hidden; z-index: 20; }
        .cvt-search-result { display: block; padding: 12px 18px; font-size: 14.5px; color: #334155; text-decoration: none; border-bottom: 1px solid #F1F5F9; }
        .cvt-search-result:last-child { border-bottom: none; }
        .cvt-search-result:hover { background: #F8FAFC; color: #2563EB; }

        .cvt-trending { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
        .cvt-trending-label { font-size: 13px; font-weight: 600; color: #334155; margin-right: 2px; }
        .cvt-chip { font-size: 13px; font-weight: 500; color: #334155; background: #F1F5F9; border: 1px solid #E2E8F0; border-radius: 999px; padding: 5px 13px; text-decoration: none; transition: all 160ms ease; white-space: nowrap; }
        .cvt-chip:hover { background: #E2E8F0; border-color: #CBD5E1; }

        .cvt-cat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        @media (max-width: 1180px) { .cvt-cat-grid { grid-template-columns: repeat(3, 1fr); } }
        @media (max-width: 879px) { .cvt-cat-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 639px) { .cvt-cat-grid { grid-template-columns: 1fr; } }

        /* Shorter desktop/laptop screens (e.g. 1366×768) get extra compaction
           on top of the base compact layout, so all cards still fit without
           scrolling even with less vertical room to work with. */
        @media (min-width: 1024px) and (max-height: 850px) {
          .cvt-home { padding-top: 12px; padding-bottom: 28px; }
          .cvt-hero h1 { font-size: clamp(1.6rem, 2.6vw, 2.2rem); margin-bottom: 6px; }
          .cvt-hero p { font-size: 14px; margin-bottom: 14px; }
          .cvt-search-wrap { margin-bottom: 10px; }
          .cvt-search-form { padding: 5px 5px 5px 16px; }
          .cvt-search-form input { padding: 6px 0; }
          .cvt-search-btn { padding: 8px 18px; }
          .cvt-trending { margin-bottom: 14px; gap: 6px; }
          .cvt-chip { padding: 4px 11px; font-size: 12.5px; }
          .cvt-cat-grid { gap: 16px; }
          .cvt-cat-header { padding: 14px 20px; }
          .cvt-cat-body { padding: 16px 20px 14px; }
        }

        .cvt-cat-card { border-radius: 16px; overflow: hidden; box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 12px 24px rgba(15,23,42,0.06); transition: transform 200ms ease, box-shadow 200ms ease; }
        .cvt-cat-card:hover { transform: translateY(-3px); box-shadow: 0 1px 2px rgba(15,23,42,0.05), 0 20px 34px rgba(15,23,42,0.11); }
        .cvt-cat-header { padding: 15px 18px; display: flex; align-items: center; gap: 10px; position: relative; overflow: hidden; }
        .cvt-cat-header::after { content: ''; position: absolute; top: -30%; right: -6%; width: 120px; height: 120px; border-radius: 50%; background: rgba(255,255,255,0.08); }
        .cvt-cat-icon-chip { width: 36px; height: 36px; border-radius: 10px; background: linear-gradient(160deg, rgba(255,255,255,0.32), rgba(255,255,255,0.14)); box-shadow: inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -6px 10px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; position: relative; }
        .cvt-cat-header h3 { margin: 0; color: #fff; font-size: 16px; font-weight: 700; letter-spacing: -0.01em; position: relative; }
        .cvt-cat-body { padding: 16px 18px 15px; }
        .cvt-cat-eyebrow { font-size: 11px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
        .cvt-cat-tools { display: grid; grid-template-columns: 1fr 1fr; gap: 5px 10px; margin-bottom: 12px; min-width: 0; }
        @media (max-width: 420px) { .cvt-cat-tools { grid-template-columns: 1fr; } }
        .cvt-cat-tool-link { display: flex; align-items: center; gap: 6px; text-decoration: none; color: #334155; font-size: 12.5px; font-weight: 500; padding: 3px; margin: -3px; border-radius: 7px; min-width: 0; transition: background 150ms ease, color 150ms ease; }
        .cvt-cat-tool-link:hover { background: var(--hover-bg); color: var(--hover-color); }
        .cvt-cat-tool-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
        .cvt-cat-tool-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .cvt-cat-viewall { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; text-decoration: none; }

        .cvt-trust-wrap { margin-top: 44px; padding: 26px 28px; background: rgba(255,255,255,0.6); border: 1px solid #E7ECF3; border-radius: 18px; }
        .cvt-trust { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        @media (max-width: 900px) { .cvt-trust { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .cvt-trust { grid-template-columns: 1fr; } }
        .cvt-trust-item { display: flex; align-items: center; gap: 14px; }
        .cvt-trust-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cvt-trust-title { font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 2px; }
        .cvt-trust-sub { font-size: 13px; color: #64748B; line-height: 1.4; }
      ` }} />

      <div className="cvt-blob-1" />
      <div className="cvt-blob-2" />
      <div className="cvt-blob-3" />
      <div className="cvt-blob-4" />
      <div className="cvt-dots" />

      <div className="cvt-inner">
        <div className="cvt-hero">
          <h1>One platform,<br /><span className="cvt-hero-gradient">endless possibilities.</span></h1>
          <p>Convert, edit, scan, generate, calculate and organize documents, images and business essentials in seconds.</p>
        </div>

        <div className="cvt-eyebrow-wrap">
          <span className="cvt-eyebrow"><span className="cvt-eyebrow-dot" />45+ free tools · no sign-up · files auto-deleted after use</span>
        </div>

        <div className="cvt-search-wrap">
          <form className="cvt-search-form" onSubmit={handleSubmit}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 150)}
              placeholder="Search 45+ tools (e.g., PDF to Word, Invoice Generator, Image Compressor...)"
            />
            <button type="submit" className="cvt-search-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Search
            </button>
          </form>
          {showResults && results.length > 0 && (
            <div className="cvt-search-results">
              {results.map((r) => (
                <Link key={r.href} href={r.href} className="cvt-search-result">{r.name}</Link>
              ))}
            </div>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748B', margin: '0 0 14px' }}>
          Not sure which tool you need?{' '}
          <Link href="/smart-workflows" style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}>Tell Smart Workflows what you're trying to accomplish →</Link>
        </p>

        <div className="cvt-trending">
          <span className="cvt-trending-label">Trending now:</span>
          {TRENDING_TOOLS.map((t) => (
            <Link key={t.href} href={t.href} className="cvt-chip">{t.name}</Link>
          ))}
        </div>

        <div className="cvt-cat-grid">
          {CATEGORIES.map((cat) => (
            <div key={cat.name} className="cvt-cat-card" style={{ background: cat.bodyTint, border: `1px solid ${cat.borderColor}` }}>
              <div className="cvt-cat-header" style={{ background: cat.gradient }}>
                <div className="cvt-cat-icon-chip">{ICONS[cat.icon]}</div>
                <h3>{cat.name}</h3>
              </div>
              <div className="cvt-cat-body">
                <div className="cvt-cat-eyebrow">Popular Tools</div>
                <div className="cvt-cat-tools">
                  {cat.tools.map((tool) => (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      className="cvt-cat-tool-link"
                      style={{ '--hover-bg': cat.borderColor, '--hover-color': cat.accentText }}
                    >
                      <span className="cvt-cat-tool-dot" style={{ background: cat.dotColor }} />
                      <span className="cvt-cat-tool-name">{tool.name}</span>
                    </Link>
                  ))}
                </div>
                <Link href={cat.viewAllHref} className="cvt-cat-viewall" style={{ color: cat.accentText }}>
                  View all {cat.name} <span style={{ fontSize: 15 }}>&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="cvt-trust-wrap">
          <div className="cvt-trust">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="cvt-trust-item">
                <div className="cvt-trust-icon" style={{ background: item.bg }}>{ICONS[item.icon]}</div>
                <div>
                  <div className="cvt-trust-title">{item.title}</div>
                  <div className="cvt-trust-sub">{item.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
