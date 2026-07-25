'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// Homepage: a clean, typography-driven centered hero (no device illustration
// or large hero graphics — headline, subheading, trust badge, search, and
// trending chips carry the page) followed by the suite-card grid from the
// supplied Convertam Visual System landing package, using the official
// category icon SVGs.
//
// Every route below is a REAL, existing Convertam route — verified against
// lib/tools-config.js before writing this file. Where the design package's
// example tool didn't have a real 1:1 equivalent (e.g. "Tax Calculator",
// "BMI Calculator" — removed from the product earlier, "Unit Converter",
// "AI Writer" — none of these exist as real Convertam tools), it's been
// swapped for the closest real tool in that same category rather than
// promising a route that doesn't exist.

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
  { name: 'Compare PDFs', href: '/compare-pdf' },
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
  { name: 'Invoice Generator', href: '/invoice-generator' },
  { name: 'Quotation Generator', href: '/quotation-generator' },
  { name: 'ID Card Generator', href: '/id-card-generator' },
  { name: 'Summarize PDF', href: '/summarize-pdf' },
  { name: 'Smart AI Converter', href: '/smart-converter' },
  { name: 'Receipt & Invoice Scanner', href: '/receipt-scanner' },
  { name: 'CV Improver', href: '/cv-improver' },
  { name: 'Resume Builder', href: '/resume-builder' },
  { name: 'Cover Letter Writer', href: '/cover-letter' },
  { name: 'Contract Summarizer', href: '/contract-summarizer' },
  { name: 'AI Data Analyst', href: '/data-analyst' },
  { name: 'AI Presentation Generator', href: '/presentation-generator' },
  { name: 'Document Translator', href: '/document-translator' },
  { name: 'Ask & Solve AI', href: '/ask-solve-ai' },
  { name: 'Image Compressor', href: '/image-compressor' },
  { name: 'Image Resizer & Cropper', href: '/resize-image' },
  { name: 'Watermark Image', href: '/watermark-image' },
  { name: 'Image Format Converter', href: '/convert-image-format' },
  { name: 'Meme Generator', href: '/meme-generator' },
  { name: 'Document Enhancer', href: '/document-enhancer' },
  { name: 'Calculator Hub', href: '/calculator-hub' },
  { name: 'Utilities Hub', href: '/utilities-hub' },
  { name: 'QR Code Generator', href: '/qr-code-generator' },
];

const SUITES = [
  {
    name: 'PDF Suite',
    slug: 'pdf',
    icon: '/visuals/icons/category/pdf-suite.svg',
    desc: 'Convert, merge, compress, split, OCR, and protect PDFs.',
    viewAllHref: '/pdf-tools',
    tools: [
      { name: 'Merge PDF', href: '/merge-pdf' },
      { name: 'Split PDF', href: '/split-pdf' },
      { name: 'Compress PDF', href: '/compress-pdf' },
      { name: 'PDF to Word', href: '/pdf-to-word' },
    ],
  },
  {
    name: 'Business Suite',
    slug: 'business',
    icon: '/visuals/icons/category/business-suite.svg',
    desc: 'Create clean documents for daily business operations.',
    viewAllHref: '/business',
    tools: [
      { name: 'Invoice Generator', href: '/invoice-generator' },
      { name: 'Quotation Generator', href: '/quotation-generator' },
      { name: 'ID Card Generator', href: '/id-card-generator' },
      { name: 'Business Document Studio', href: '/business-document-studio' },
    ],
  },
  {
    name: 'Career Studio',
    slug: 'career',
    icon: '/visuals/icons/category/career-studio.svg',
    desc: 'Build, improve, and polish your career documents.',
    viewAllHref: '/career-studio',
    tools: [
      { name: 'Resume Builder', href: '/resume-builder' },
      { name: 'CV Improver', href: '/cv-improver' },
      { name: 'Cover Letter Writer', href: '/cover-letter' },
    ],
  },
  {
    name: 'AI Workspace',
    slug: 'ai',
    icon: '/visuals/icons/category/ai-workspace.svg',
    desc: 'Summarize, analyze, translate, and present with AI support.',
    viewAllHref: '/ai-tools',
    tools: [
      { name: 'AI Data Analyst', href: '/data-analyst' },
      { name: 'AI Presentation Generator', href: '/presentation-generator' },
      { name: 'Document Translator', href: '/document-translator' },
      { name: 'Contract Summarizer', href: '/contract-summarizer' },
    ],
  },
  {
    name: 'Image Studio',
    slug: 'image',
    icon: '/visuals/icons/category/image-studio.svg',
    desc: 'Resize, compress, watermark, convert, and clean images.',
    viewAllHref: '/image-tools',
    tools: [
      { name: 'Image Compressor', href: '/image-compressor' },
      { name: 'Image Resizer & Cropper', href: '/resize-image' },
      { name: 'Watermark Image', href: '/watermark-image' },
      { name: 'Format Converter', href: '/convert-image-format' },
    ],
  },
  {
    name: 'Calculators',
    slug: 'calculator',
    icon: '/visuals/icons/category/calculators.svg',
    desc: 'Fast everyday calculators for money and business math.',
    viewAllHref: '/calculator-hub',
    tools: [
      { name: 'Loan Calculator', href: '/calculators/loan-calculator' },
      { name: 'VAT Calculator', href: '/calculators/vat-calculator' },
      { name: 'Profit & Loss', href: '/calculators/profit-margin' },
      { name: 'Discount Calculator', href: '/calculators/discount-calculator' },
    ],
  },
  {
    name: 'Utilities',
    slug: 'utility',
    icon: '/visuals/icons/category/utilities.svg',
    desc: 'Quick helpers for QR codes, passwords, and words.',
    viewAllHref: '/utilities-hub',
    tools: [
      { name: 'QR Code Generator', href: '/qr-code-generator' },
      { name: 'Password Studio', href: '/password-generator' },
      { name: 'Word Counter', href: '/utilities-hub' },
      { name: 'Text Case Converter', href: '/utilities-hub' },
    ],
  },
];

const QUICK_CHIPS = [
  { name: 'PDF to Word', href: '/pdf-to-word' },
  { name: 'Invoice Generator', href: '/invoice-generator' },
  { name: 'Image Compressor', href: '/image-compressor' },
  { name: 'Resume Builder', href: '/resume-builder' },
];

const POPULAR_NOW = [
  { name: 'Compress PDF', href: '/compress-pdf', icon: '/visuals/icons/tools/compress-pdf.svg' },
  { name: 'AI Data Analyst', href: '/data-analyst', icon: '/visuals/icons/tools/ai-data-analyst.svg' },
  { name: 'Image Format Converter', href: '/convert-image-format', icon: '/visuals/icons/tools/image-compressor.svg' },
  { name: 'Password Studio', href: '/password-generator', icon: '/visuals/icons/tools/password-studio.svg' },
];

const LEARN_LINKS = [
  { name: 'OCR Explained', href: '/learn/ai-guides/what-is-ocr-and-when-you-need-it' },
  { name: 'Invoice vs Quotation', href: '/learn/business-documents/invoice-vs-quotation-vs-delivery-note' },
];

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);

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
      <style dangerouslySetInnerHTML={{ __html: `
        .cvt-home {
          --blue: #246bfe; --red: #f43f3f; --green: #14b875; --purple: #7c3aed;
          --orange: #ff7a1a; --steel: #58749a; --slate: #667085; --ink: #07122f;
          --muted: #5f6f86; --line: #dce6f7; --page: #f7fbff;
          --shadow: 0 18px 44px rgb(24 55 102 / 12%); --soft-shadow: 0 8px 24px rgb(24 55 102 / 10%);
          --cat-pdf: #DC2626; --cat-business: #059669; --cat-career: #0284C7;
          --cat-ai: #7C3AED; --cat-image: #F97316; --cat-calc: #2563EB; --cat-utility: #475569;
          position: relative; color: var(--ink);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at 78% 14%, rgb(36 107 254 / 9%), transparent 28%),
            radial-gradient(circle at 6% 30%, rgb(20 184 117 / 8%), transparent 25%),
            linear-gradient(180deg, #ffffff 0%, var(--page) 58%, #f9fbff 100%);
        }
        .cvt-main { position: relative; width: min(1440px, 100%); margin: 0 auto; padding: 36px clamp(18px, 4.5vw, 64px) 56px; }

        /* Clean, typography-driven centered hero — no device illustration or
           large hero graphics. Premium-SaaS direction: minimal background
           (soft blobs + dot grid, both already declared on .cvt-home / below),
           generous whitespace, typography carrying the visual weight. */
        .cvt-blob-1 { position: absolute; top: 30px; left: 40px; width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,0.10), rgba(37,99,235,0)); }
        .cvt-blob-2 { position: absolute; top: 120px; left: 150px; width: 20px; height: 20px; border-radius: 50%; background: rgba(37,99,235,0.18); }
        .cvt-blob-3 { position: absolute; top: 20px; right: 60px; width: 190px; height: 190px; border-radius: 50%; background: radial-gradient(circle, rgba(16,185,129,0.12), rgba(16,185,129,0)); animation: cvtFloat 9s ease-in-out infinite; }
        @keyframes cvtFloat { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-14px); } }

        .cvt-hero { position: relative; text-align: center; max-width: 800px; margin: 0 auto; padding: 28px 0 8px; }
        .cvt-hero h1 { margin: 0 0 14px; font-size: clamp(32px, 4.2vw, 52px); line-height: 1.06; letter-spacing: -0.01em; font-weight: 800; }
        .cvt-hero-gradient { background: linear-gradient(90deg, #1D4ED8 0%, #0F766E 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .cvt-hero-sub { max-width: 640px; margin: 0 auto 22px; color: #47566f; font-size: clamp(16px, 1.3vw, 19px); line-height: 1.6; }
        .cvt-eyebrow-wrap { display: flex; justify-content: center; margin-bottom: 18px; }
        .cvt-eyebrow { display: inline-flex; align-items: center; gap: 7px; width: fit-content; padding: 8px 16px; border: 1px solid rgb(20 184 117 / 25%); color: #0d7f60; background: rgb(236 253 245 / 74%); border-radius: 999px; font-weight: 700; font-size: 13.5px; }
        .cvt-eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #10B981; flex-shrink: 0; }
        .cvt-search-shell { display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 12px; width: min(680px, 100%); margin: 0 auto; min-height: 66px; padding: 8px 8px 8px 20px; background: white; border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); position: relative; }
        .cvt-search-shell input { width: 100%; min-width: 0; border: 0; outline: 0; color: var(--ink); font: inherit; font-size: 17px; background: transparent; text-align: left; }
        .cvt-search-shell button { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; padding: 0 24px; border: 0; border-radius: 14px; background: linear-gradient(135deg, #2d67f4, #1f55dc); color: white; font-weight: 800; font-size: 16px; box-shadow: 0 12px 24px rgb(36 107 254 / 26%); cursor: pointer; }
        .cvt-search-results { position: absolute; top: calc(100% + 8px); left: 0; right: 0; background: #fff; border: 1px solid var(--line); border-radius: 14px; box-shadow: var(--shadow); overflow: hidden; z-index: 20; text-align: left; }
        .cvt-search-result { display: block; padding: 12px 18px; font-size: 14.5px; color: #334155; text-decoration: none; border-bottom: 1px solid #F1F5F9; }
        .cvt-search-result:last-child { border-bottom: none; }
        .cvt-search-result:hover { background: #F8FAFC; color: var(--blue); }
        .cvt-chips { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
        .cvt-chips-label { font-size: 13.5px; font-weight: 700; color: #334155; margin-right: 2px; }
        .cvt-chips a { display: inline-flex; align-items: center; min-height: 34px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: rgb(255 255 255 / 76%); color: #536178; font-weight: 700; text-decoration: none; }
        .cvt-chips a:hover { color: var(--blue); }

        .cvt-suite-section { padding-top: 44px; }
        .cvt-section-heading { display: flex; align-items: end; justify-content: space-between; gap: 18px; margin-bottom: 18px; }
        .cvt-section-heading p { margin: 0 0 6px; color: var(--blue); font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; }
        .cvt-section-heading h2 { margin: 0; font-size: clamp(24px, 3vw, 34px); line-height: 1.1; }
        .cvt-suite-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; }
        .cvt-suite-card { --accent: var(--blue); position: relative; overflow: hidden; display: flex; min-height: 270px; flex-direction: column; padding: 20px; border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--line)); border-radius: 12px; background: radial-gradient(circle at 92% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 36%), linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, white), #ffffff 45%); box-shadow: var(--soft-shadow); text-decoration: none; color: inherit; }
        .cvt-suite-card::before { content: ''; position: absolute; inset: 0 0 auto; height: 5px; background: var(--accent); }
        .cvt-suite-card::after { content: ''; position: absolute; right: -24px; bottom: -28px; width: 130px; height: 130px; border: 24px solid color-mix(in srgb, var(--accent) 10%, transparent); border-radius: 34px; transform: rotate(18deg); }
        .cvt-suite-card.pdf { --accent: var(--cat-pdf); }
        .cvt-suite-card.business { --accent: var(--cat-business); }
        .cvt-suite-card.career { --accent: var(--cat-career); }
        .cvt-suite-card.ai { --accent: var(--cat-ai); }
        .cvt-suite-card.image { --accent: var(--cat-image); }
        .cvt-suite-card.calculator { --accent: var(--cat-calc); }
        .cvt-suite-card.utility { --accent: var(--cat-utility); }
        .cvt-suite-top { position: relative; z-index: 1; display: grid; grid-template-columns: 64px 1fr; gap: 14px; }
        .cvt-icon-tile { display: grid; place-items: center; width: 70px; height: 70px; border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--line)); border-radius: 16px; background: color-mix(in srgb, var(--accent) 8%, white); box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 14%, transparent); }
        .cvt-icon-tile img { width: 56px; height: 56px; }
        .cvt-suite-card h3 { margin: 2px 0 6px; font-size: 19px; }
        .cvt-suite-card p { margin: 0; color: #596980; font-size: 13.5px; line-height: 1.4; }
        .cvt-suite-card ul { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 14px; margin: 20px 0 16px; padding: 0; list-style: none; }
        .cvt-suite-card li a { display: flex; gap: 8px; color: #2f4059; font-weight: 700; line-height: 1.25; font-size: 13px; text-decoration: none; }
        .cvt-suite-card li a:hover { color: var(--accent); }
        .cvt-suite-card li a::before { content: ''; flex: 0 0 auto; width: 7px; height: 7px; margin-top: 5px; border-radius: 999px; background: var(--accent); }
        .cvt-suite-card .cvt-viewall { position: relative; z-index: 1; margin-top: auto; color: var(--accent); font-weight: 900; text-decoration: none; font-size: 13.5px; }
        .cvt-suite-card .cvt-viewall::after { content: ' ->'; }
        .cvt-secondary-strip { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 18px; margin: 30px 0 0; padding: 18px; border: 1px solid var(--line); border-radius: 16px; background: rgb(255 255 255 / 76%); }
        .cvt-secondary-strip > div { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .cvt-secondary-strip strong { margin-right: 4px; color: #344258; }
        .cvt-secondary-strip a { display: inline-flex; align-items: center; gap: 6px; min-height: 34px; padding: 0 14px; border: 1px solid var(--line); border-radius: 999px; background: rgb(255 255 255 / 76%); color: #536178; font-weight: 700; text-decoration: none; }
        .cvt-secondary-strip a:hover { color: var(--blue); }
        .cvt-secondary-strip a img { width: 16px; height: 16px; }
        .cvt-flame { flex-shrink: 0; }

        @media (max-width: 1180px) {
          .cvt-suite-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 820px) {
          .cvt-hero h1 { font-size: clamp(30px, 8vw, 44px); }
          .cvt-search-shell { grid-template-columns: 20px 1fr; }
          .cvt-search-shell button { grid-column: 1 / -1; }
          .cvt-suite-grid { grid-template-columns: 1fr; }
          .cvt-secondary-strip { flex-direction: column; }
        }
        @media (max-width: 640px) {
          .cvt-suite-top, .cvt-suite-card ul { grid-template-columns: 1fr; }
        }
      ` }} />

      <div className="cvt-blob-1" />
      <div className="cvt-blob-2" />
      <div className="cvt-blob-3" />

      <div className="cvt-main">
        <div className="cvt-hero">
          <h1>One platform,<br /><span className="cvt-hero-gradient">endless possibilities.</span></h1>
          <p className="cvt-hero-sub">
            One fast, no-signup platform for everything from PDFs and business
            paperwork to AI-assisted work, image editing and everyday calculations.
          </p>

          <div className="cvt-eyebrow-wrap">
            <span className="cvt-eyebrow"><span className="cvt-eyebrow-dot" />50+ free tools · no sign-up · files auto-deleted after use</span>
          </div>

          <form className="cvt-search-shell" onSubmit={handleSubmit}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setShowResults(true); }}
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 150)}
              placeholder="Search 50+ tools (e.g., PDF to Word, Invoice Generator, Image Compressor...)"
            />
            <button type="submit">Search</button>
            {showResults && results.length > 0 && (
              <div className="cvt-search-results">
                {results.map((r) => (
                  <Link key={r.href} href={r.href} className="cvt-search-result">{r.name}</Link>
                ))}
              </div>
            )}
          </form>

          <div className="cvt-chips">
            <span className="cvt-chips-label">Trending now:</span>
            {QUICK_CHIPS.map((c) => <Link key={c.href} href={c.href}>{c.name}</Link>)}
          </div>
        </div>

        <div className="cvt-suite-section">
          <div className="cvt-section-heading">
            <div>
              <p>Choose a suite</p>
              <h2>Everything you need, grouped clearly.</h2>
            </div>
          </div>

          <div className="cvt-suite-grid">
            {SUITES.map((s) => (
              <div key={s.name} className={`cvt-suite-card ${s.slug}`}>
                <div className="cvt-suite-top">
                  <span className="cvt-icon-tile"><img src={s.icon} alt="" /></span>
                  <div>
                    <h3>{s.name}</h3>
                    <p>{s.desc}</p>
                  </div>
                </div>
                <ul>
                  {s.tools.map((t) => <li key={t.name}><Link href={t.href}>{t.name}</Link></li>)}
                </ul>
                <Link href={s.viewAllHref} className="cvt-viewall">View all {s.name}</Link>
              </div>
            ))}
          </div>
        </div>

        <div className="cvt-secondary-strip">
          <div>
            <svg className="cvt-flame" width="16" height="16" viewBox="0 0 24 24" fill="#F97316"><path d="M12 2c1 3-2 4-2 7a4 4 0 0 0 8 0c0-1-.3-2-1-3 2 1 3 3.5 3 6a8 8 0 0 1-16 0c0-4 3-6 4-8 1.5-1.5 3-2 4-2z" /></svg>
            <strong>Popular right now</strong>
            {POPULAR_NOW.map((t) => <Link key={t.href} href={t.href}><img src={t.icon} alt="" />{t.name}</Link>)}
          </div>
          <div>
            <strong>Learn Center</strong>
            {LEARN_LINKS.map((t) => <Link key={t.href} href={t.href}>{t.name}</Link>)}
          </div>
        </div>
      </div>
    </section>
  );
}
