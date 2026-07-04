'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

// ── Data ──────────────────────────────────────────────────────────────────────

const TRENDING = ['PDF to Word', 'Invoice Generator', 'Resume Builder', 'OCR PDF', 'Compress PDF', 'Passport Photo'];

const FLOATING_TOOLS = [
  { icon: '📄', title: 'PDF to Word', desc: 'Convert PDF to editable Word documents', color: '#2563EB', bg: '#EFF6FF', popular: false },
  { icon: '🧾', title: 'Invoice Generator', desc: 'Create professional invoices in seconds', color: '#059669', bg: '#ECFDF5', popular: true },
  { icon: '🤖', title: 'OCR PDF', desc: 'Extract text from scanned PDFs and images', color: '#7C3AED', bg: '#F5F3FF', popular: false },
  { icon: '🗜️', title: 'Compress PDF', desc: 'Reduce PDF file size without losing quality', color: '#DC2626', bg: '#FEF2F2', popular: false },
  { icon: '📊', title: 'Resume Builder', desc: 'Create a professional resume in minutes', color: '#D97706', bg: '#FFFBEB', popular: false },
];

const CATEGORIES = [
  {
    slug: 'pdf-tools', icon: '📄', title: 'PDF Tools', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE',
    count: '12+', desc: 'Convert, merge, split, compress and secure your PDFs',
    examples: ['PDF to Word', 'Merge PDF', 'Compress PDF', 'Sign PDF', 'Protect PDF'],
  },
  {
    slug: 'business', icon: '🧾', title: 'Business Tools', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
    count: '8+', desc: 'Invoices, receipts, quotes, ID cards and more',
    examples: ['Invoice Generator', 'Receipt Generator', 'Quotation Maker', 'ID Card Generator', 'Delivery Note'],
  },
  {
    slug: 'ai-tools', icon: '🤖', title: 'AI Tools', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE',
    count: '10+', desc: 'AI-powered features for smarter work',
    examples: ['AI Summarizer', 'OCR PDF', 'CV Improver', 'AI Translator', 'AI Writer'],
  },
  {
    slug: 'image-tools', icon: '🖼️', title: 'Image Tools', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A',
    count: '9+', desc: 'Convert, edit, resize and optimize images',
    examples: ['Image to PDF', 'Compress Image', 'Resize Image', 'Crop Image', 'Convert to WebP'],
  },
  {
    slug: 'calculator', icon: '🧮', title: 'Calculators', color: '#CA8A04', bg: '#FEFCE8', border: '#FEF08A',
    count: '25+', desc: 'Finance, health, business and more',
    examples: ['VAT Calculator', 'Loan Calculator', 'BMI Calculator', 'Profit Calculator', 'Age Calculator'],
  },
  {
    slug: 'utilities', icon: '⚙️', title: 'Utilities', color: '#475569', bg: '#F8FAFC', border: '#E2E8F0',
    count: '20+', desc: 'Everyday tools to make life easier',
    examples: ['QR Code Generator', 'Password Generator', 'Word Counter', 'JSON Formatter', 'URL Encoder'],
  },
];

const AUDIENCES = [
  { icon: '🎓', title: 'For Students', desc: 'Convert assignments, summarize PDFs, build resumes and more.' },
  { icon: '💼', title: 'For Professionals', desc: 'Edit PDFs, sign documents, compress files and save time.' },
  { icon: '🏪', title: 'For Small Businesses', desc: 'Create invoices, quotes, receipts and manage your business.' },
  { icon: '👨‍💻', title: 'For Developers', desc: 'JSON formatter, Base64, UUID generator and more.' },
  { icon: '🎨', title: 'For Creators', desc: 'Image tools, watermarking, resizing and conversions.' },
  { icon: '🌍', title: 'For Everyone', desc: 'AI summaries, OCR, file conversions and more.' },
];

const FEATURED_TOOLS = [
  { slug: 'pdf-to-word', icon: '📄', title: 'PDF to Word', desc: 'Convert PDF files to editable Word documents in seconds.', rating: 4.9, color: '#2563EB', popular: false },
  { slug: 'invoice-generator', icon: '🧾', title: 'Invoice Generator', desc: 'Create professional invoices instantly. Download as PDF.', rating: 4.8, color: '#059669', popular: false },
  { slug: 'ocr-pdf', icon: '🤖', title: 'OCR PDF', desc: 'Extract text from scanned PDFs and images using AI.', rating: 4.8, color: '#7C3AED', popular: false },
  { slug: 'compress-pdf', icon: '🗜️', title: 'Compress PDF', desc: 'Reduce PDF file size without losing quality.', rating: 4.7, color: '#DC2626', popular: false },
  { slug: 'merge-pdf', icon: '🔗', title: 'Merge PDF', desc: 'Combine multiple PDFs into one single file.', rating: 4.8, color: '#0891B2', popular: false },
  { slug: 'sign-pdf', icon: '✍️', title: 'Sign PDF', desc: 'Create a professional resume in minutes.', rating: 4.9, color: '#D97706', popular: true },
];

const RECENTLY_ADDED = [
  { slug: 'write-on-pdf', icon: '✏️', title: 'Write on PDF', desc: 'Type text directly onto any scanned PDF form.', color: '#2563EB' },
  { slug: 'ocr-pdf', icon: '🤖', title: 'OCR PDF', desc: 'Extract text from scanned PDFs using AI.', color: '#7C3AED' },
  { slug: 'summarize-pdf', icon: '📝', title: 'AI Summarizer', desc: 'Summarize any PDF document instantly.', color: '#059669' },
  { slug: 'watermark-pdf', icon: '💧', title: 'Watermark PDF', desc: 'Add custom watermarks to your PDFs.', color: '#D97706' },
  { slug: 'receipt-scanner', icon: '🧾', title: 'Receipt Scanner', desc: 'Extract data from receipts using AI.', color: '#DC2626' },
  { slug: 'protect-pdf', icon: '🔒', title: 'Protect PDF', desc: 'Add password protection to your PDFs.', color: '#475569' },
];

const MOST_USED = [
  { slug: 'pdf-to-word', icon: '📄', title: 'PDF to Word' },
  { slug: 'invoice-generator', icon: '🧾', title: 'Invoice Generator' },
  { slug: 'ocr-pdf', icon: '🤖', title: 'OCR PDF' },
  { slug: 'compress-pdf', icon: '🗜️', title: 'Compress PDF' },
  { slug: 'merge-pdf', icon: '🔗', title: 'Merge PDF' },
  { slug: 'sign-pdf', icon: '✍️', title: 'Sign PDF' },
  { slug: 'watermark-pdf', icon: '💧', title: 'Watermark PDF' },
  { slug: 'jpg-to-pdf', icon: '🖼️', title: 'JPG to PDF' },
];

const STATS = [
  { icon: '📁', value: '100,000+', label: 'Files Processed', sub: 'And counting every day' },
  { icon: '🛠️', value: '25+', label: 'Free Tools', sub: 'And more coming soon' },
  { icon: '📂', value: '12+', label: 'Tool Categories', sub: 'Everything in one place' },
  { icon: '✅', value: '99.9%', label: 'Success Rate', sub: 'Reliable and accurate results' },
  { icon: '🗑️', value: '24 hrs', label: 'Auto Deletion', sub: 'Your files stay private' },
];

// ── Counter animation hook ────────────────────────────────────────────────────
function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    const num = parseInt(target.replace(/[^0-9]/g, ''));
    if (!num) return;
    let startTime = null;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setCount(Math.floor(progress * num));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [start, target, duration]);
  return count;
}

// ── Star rating ───────────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#E5E7EB', fontSize: '0.75rem' }}>★</span>
      ))}
      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginLeft: 4 }}>{rating}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HomePage() {
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStatsVisible(true); },
      { threshold: 0.3 }
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <main style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', background: '#FFFFFF' }}>
      <style>{`
        * { box-sizing: border-box; }
        .section-inner { width: 100%; padding: 0 4%; }
        .section-title { font-size: clamp(1.4rem, 3vw, 1.75rem); font-weight: 800; color: #0F172A; margin-bottom: 6px; }
        .section-sub { font-size: 0.9rem; color: #64748B; margin-bottom: 40px; }

        /* Hero */
        .hero-section {
          width: 100%; min-height: 100vh;
          display: grid; grid-template-columns: 1fr 1fr;
          align-items: center;
          background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 60%, #1E40AF 100%);
          padding: 80px 4% 60px;
          gap: 40px;
        }
        .hero-left { max-width: 560px; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 99px;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          margin-bottom: 24px;
        }
        .hero-title {
          font-size: clamp(2.2rem, 4vw, 3.5rem);
          font-weight: 900; line-height: 1.05;
          letter-spacing: -0.02em; color: white; margin-bottom: 16px;
        }
        .hero-subtitle {
          font-size: clamp(0.95rem, 1.5vw, 1.1rem);
          color: rgba(255,255,255,0.7); line-height: 1.7; margin-bottom: 32px;
        }
        .search-wrap {
          display: flex; align-items: center;
          background: white; border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          overflow: hidden; margin-bottom: 16px;
        }
        .search-icon { padding: 0 14px; color: #94A3B8; font-size: 1rem; }
        .search-input-fake {
          flex: 1; padding: 14px 0; font-size: 0.9rem;
          color: #94A3B8; text-decoration: none; display: block;
        }
        .search-btn-fake {
          padding: 14px 20px; background: #2563EB; color: white;
          font-size: 0.9rem; font-weight: 600; text-decoration: none;
          white-space: nowrap;
        }
        .search-btn-fake:hover { background: #1D4ED8; }
        .trending-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .trend-label { font-size: 0.75rem; color: rgba(255,255,255,0.5); white-space: nowrap; }
        .trend-chip {
          font-size: 0.72rem; font-weight: 500;
          padding: 4px 12px; border-radius: 99px;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.8); text-decoration: none;
          transition: all 0.2s ease; white-space: nowrap;
        }
        .trend-chip:hover { background: rgba(255,255,255,0.2); }

        /* Floating tool cards */
        .hero-right { position: relative; display: flex; align-items: center; justify-content: center; }
        .floating-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 12px; max-width: 380px; width: 100%;
        }
        .float-card {
          background: white; border-radius: 16px;
          padding: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.15);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          text-decoration: none; display: block;
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
        }
        .float-card:hover { transform: translateY(-4px); box-shadow: 0 16px 48px rgba(0,0,0,0.2); }
        .float-card.featured { grid-column: span 2; }
        .float-icon { font-size: 1.5rem; margin-bottom: 8px; }
        .float-title { font-size: 0.85rem; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .float-desc { font-size: 0.72rem; color: #64748B; line-height: 1.4; }
        .popular-badge {
          position: absolute; top: -8px; right: 12px;
          background: #F59E0B; color: white;
          font-size: 0.6rem; font-weight: 700;
          padding: 2px 8px; border-radius: 99px;
        }

        /* Categories */
        .categories-section { padding: 80px 0; background: #F8FAFC; }
        .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .cat-card {
          background: white; border-radius: 20px; padding: 24px;
          border: 1px solid; text-decoration: none;
          transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .cat-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }
        .cat-icon-wrap { font-size: 2rem; margin-bottom: 12px; }
        .cat-count { font-size: 0.72rem; font-weight: 700; margin-bottom: 4px; }
        .cat-title { font-size: 1rem; font-weight: 700; color: #0F172A; margin-bottom: 6px; }
        .cat-desc { font-size: 0.78rem; color: #64748B; line-height: 1.5; margin-bottom: 12px; }
        .cat-examples { display: flex; flex-direction: column; gap: 4px; margin-bottom: 16px; }
        .cat-example { font-size: 0.72rem; color: #475569; display: flex; align-items: center; gap: 6px; }
        .cat-explore {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 0.78rem; font-weight: 600; text-decoration: none;
          transition: gap 0.2s ease;
        }
        .cat-card:hover .cat-explore { gap: 10px; }

        /* Audiences */
        .audiences-section { padding: 80px 0; background: white; }
        .aud-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .aud-card {
          padding: 24px; border-radius: 16px;
          border: 1px solid #E5E7EB; background: #FAFAFA;
          transition: all 0.2s ease; text-align: center;
        }
        .aud-card:hover { border-color: #BFDBFE; background: #EFF6FF; transform: translateY(-2px); }
        .aud-icon { font-size: 2rem; margin-bottom: 12px; }
        .aud-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; margin-bottom: 6px; }
        .aud-desc { font-size: 0.78rem; color: #64748B; line-height: 1.5; }

        /* Featured tools */
        .featured-section { padding: 80px 0; background: #F8FAFC; }
        .featured-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
        .feat-card {
          background: white; border-radius: 16px; padding: 20px;
          border: 1px solid #E5E7EB;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          position: relative;
        }
        .feat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); border-color: #BFDBFE; }
        .feat-icon { font-size: 1.8rem; margin-bottom: 10px; }
        .feat-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .feat-desc { font-size: 0.75rem; color: #64748B; line-height: 1.4; margin-bottom: 10px; }
        .feat-launch {
          display: block; width: 100%; text-align: center;
          padding: 8px; border-radius: 10px; font-size: 0.78rem;
          font-weight: 600; text-decoration: none; color: white;
          margin-top: 12px; transition: opacity 0.2s ease;
        }
        .feat-launch:hover { opacity: 0.85; }
        .feat-popular {
          position: absolute; top: -8px; right: 12px;
          background: #F59E0B; color: white;
          font-size: 0.6rem; font-weight: 700;
          padding: 2px 8px; border-radius: 99px;
        }

        /* How it works + stats */
        .how-section { padding: 80px 0; background: white; }
        .how-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .steps-list { display: flex; flex-direction: column; gap: 32px; }
        .step { display: flex; align-items: flex-start; gap: 16px; }
        .step-num {
          width: 44px; height: 44px; border-radius: 50%;
          background: #2563EB; color: white;
          font-size: 1.1rem; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .step-title { font-size: 1rem; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .step-desc { font-size: 0.82rem; color: #64748B; line-height: 1.5; }
        .stats-dark {
          background: linear-gradient(135deg, #0F172A, #1E3A5F);
          border-radius: 24px; padding: 32px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
        }
        .stat-item { text-align: center; }
        .stat-icon { font-size: 1.5rem; margin-bottom: 8px; }
        .stat-value { font-size: 1.4rem; font-weight: 800; color: white; margin-bottom: 4px; }
        .stat-label { font-size: 0.78rem; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 2px; }
        .stat-sub { font-size: 0.68rem; color: rgba(255,255,255,0.5); }

        /* Recently added */
        .recent-section { padding: 80px 0; background: #F8FAFC; }
        .recent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .recent-card {
          background: white; border-radius: 14px; padding: 16px;
          border: 1px solid #E5E7EB; text-decoration: none;
          transition: all 0.2s ease; position: relative;
          box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .recent-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: #BFDBFE; }
        .new-badge {
          display: inline-block; font-size: 0.6rem; font-weight: 700;
          padding: 2px 7px; border-radius: 99px;
          background: #10B981; color: white; margin-bottom: 8px;
        }
        .recent-title { font-size: 0.85rem; font-weight: 700; color: #0F172A; margin-bottom: 4px; }
        .recent-desc { font-size: 0.72rem; color: #64748B; line-height: 1.4; }

        /* Most used */
        .most-used-section { padding: 80px 0; background: white; }
        .most-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .most-card {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px; border-radius: 12px;
          border: 1px solid #E5E7EB; text-decoration: none;
          transition: all 0.2s ease; background: #FAFAFA;
        }
        .most-card:hover { background: #EFF6FF; border-color: #BFDBFE; transform: translateY(-1px); }
        .most-icon { font-size: 1.3rem; flex-shrink: 0; }
        .most-title { font-size: 0.8rem; font-weight: 600; color: #0F172A; }

        /* Footer */
        .footer-section { background: #0F172A; padding: 64px 0 32px; }
        .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 48px; }
        .footer-col-title { font-size: 0.78rem; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px; }
        .footer-link { display: block; font-size: 0.82rem; color: rgba(255,255,255,0.6); text-decoration: none; margin-bottom: 8px; transition: color 0.15s; }
        .footer-link:hover { color: white; }
        .footer-brand-desc { font-size: 0.82rem; color: rgba(255,255,255,0.5); line-height: 1.6; margin: 12px 0 20px; }
        .footer-socials { display: flex; gap: 12px; }
        .social-btn {
          width: 36px; height: 36px; border-radius: 8px;
          background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; font-size: 0.85rem; color: rgba(255,255,255,0.7);
          transition: all 0.15s ease;
        }
        .social-btn:hover { background: rgba(255,255,255,0.2); color: white; }
        .newsletter-row { display: flex; gap: 0; margin-top: 16px; border-radius: 10px; overflow: hidden; }
        .newsletter-input {
          flex: 1; padding: 10px 14px; background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15); border-right: none;
          color: white; font-size: 0.82rem; font-family: inherit; outline: none;
          border-radius: 10px 0 0 10px;
        }
        .newsletter-input::placeholder { color: rgba(255,255,255,0.4); }
        .newsletter-btn {
          padding: 10px 16px; background: #2563EB; color: white;
          border: none; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; font-family: inherit; white-space: nowrap;
          border-radius: 0 10px 10px 0;
        }
        .footer-bottom {
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 24px; display: flex;
          align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .footer-copy { font-size: 0.78rem; color: rgba(255,255,255,0.4); }

        /* Section header row */
        .section-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 32px; }
        .view-all { font-size: 0.82rem; font-weight: 600; color: #2563EB; text-decoration: none; }
        .view-all:hover { text-decoration: underline; }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-section { grid-template-columns: 1fr; min-height: auto; padding: 60px 5% 40px; }
          .hero-right { display: none; }
          .cat-grid { grid-template-columns: repeat(2, 1fr); }
          .featured-grid { grid-template-columns: repeat(2, 1fr); }
          .footer-grid { grid-template-columns: 1fr 1fr; }
          .how-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .section-inner { padding: 0 5%; }
          .cat-grid { grid-template-columns: 1fr; }
          .aud-grid { grid-template-columns: repeat(2, 1fr); }
          .featured-grid { grid-template-columns: 1fr; }
          .recent-grid { grid-template-columns: repeat(2, 1fr); }
          .most-grid { grid-template-columns: repeat(2, 1fr); }
          .stats-dark { grid-template-columns: 1fr 1fr; }
          .footer-grid { grid-template-columns: 1fr; gap: 24px; }
          .footer-bottom { flex-direction: column; text-align: center; }
        }
        @media (max-width: 480px) {
          .aud-grid { grid-template-columns: 1fr; }
          .recent-grid { grid-template-columns: 1fr; }
          .most-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="hero-section">
        <div className="hero-left">
          <div className="hero-badge">
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>100% Free Forever</span>
          </div>
          <h1 className="hero-title">
            One platform.<br />
            <span style={{ color: '#60A5FA' }}>Endless productivity.</span>
          </h1>
          <p className="hero-subtitle">
            Powerful tools for PDFs, AI-powered features, images, documents, and business essentials.
          </p>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <Link href="#categories" className="search-input-fake">
              Search for any tool... Try &quot;invoice&quot;, &quot;compress PDF&quot;, &quot;OCR&quot;...
            </Link>
            <Link href="#categories" className="search-btn-fake">Search</Link>
          </div>
          <div className="trending-row">
            <span className="trend-label">Trending:</span>
            {TRENDING.map(t => (
              <Link key={t} href="#categories" className="trend-chip">{t}</Link>
            ))}
          </div>
        </div>

        {/* Floating product showcase */}
        <div className="hero-right">
          <div className="floating-grid">
            {FLOATING_TOOLS.map((tool, i) => (
              <Link key={tool.title} href={`/${tool.slug || '#'}`}
                className={`float-card ${i === 1 ? 'featured' : ''}`}
                style={{ background: tool.bg, borderColor: tool.color + '33' }}>
                {tool.popular && <span className="popular-badge">Most Popular</span>}
                <div className="float-icon">{tool.icon}</div>
                <div className="float-title" style={{ color: tool.color }}>{tool.title}</div>
                <div className="float-desc">{tool.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section id="categories" className="categories-section">
        <div className="section-inner">
          <h2 className="section-title">Browse by Category</h2>
          <p className="section-sub">Everything you need to work smarter — all in one place.</p>
          <div className="cat-grid">
            {CATEGORIES.map(({ slug, icon, title, color, bg, border, count, desc, examples }) => (
              <Link key={slug} href={`/${slug}`} className="cat-card" style={{ borderColor: border, background: bg }}>
                <div className="cat-icon-wrap">{icon}</div>
                <div className="cat-count" style={{ color }}>{count} tools</div>
                <div className="cat-title">{title}</div>
                <div className="cat-desc">{desc}</div>
                <div className="cat-examples">
                  {examples.map(ex => (
                    <div key={ex} className="cat-example">
                      <span style={{ color, fontSize: '0.6rem' }}>●</span>
                      {ex}
                    </div>
                  ))}
                </div>
                <span className="cat-explore" style={{ color }}>Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILT FOR EVERYONE ── */}
      <section className="audiences-section">
        <div className="section-inner">
          <h2 className="section-title">Built for everyone</h2>
          <p className="section-sub">Powerful tools for every need and every person.</p>
          <div className="aud-grid">
            {AUDIENCES.map(({ icon, title, desc }) => (
              <div key={title} className="aud-card">
                <div className="aud-icon">{icon}</div>
                <div className="aud-title">{title}</div>
                <div className="aud-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED TOOLS ── */}
      <section className="featured-section">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <h2 className="section-title">Featured Tools</h2>
              <p className="section-sub" style={{ marginBottom: 0 }}>Hand-picked tools that our users love the most.</p>
            </div>
            <Link href="/pdf-tools" className="view-all">View all tools →</Link>
          </div>
          <div className="featured-grid">
            {FEATURED_TOOLS.map(({ slug, icon, title, desc, rating, color, popular }) => (
              <div key={slug} className="feat-card">
                {popular && <span className="feat-popular">Popular</span>}
                <div className="feat-icon">{icon}</div>
                <div className="feat-title">{title}</div>
                <div className="feat-desc">{desc}</div>
                <Stars rating={rating} />
                <Link href={`/${slug}`} className="feat-launch" style={{ background: color }}>
                  Launch Tool
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS + STATS ── */}
      <section className="how-section">
        <div className="section-inner">
          <div className="how-grid">
            <div>
              <h2 className="section-title">How Convertam Works</h2>
              <p className="section-sub">Three simple steps to get your work done.</p>
              <div className="steps-list">
                {[
                  { num: '1', title: 'Upload', desc: 'Upload your file securely from your device. No account needed.' },
                  { num: '2', title: 'Choose Tool', desc: 'Select the right tool and customize it if needed.' },
                  { num: '3', title: 'Download', desc: 'Get your result instantly. Fast, easy, secure.' },
                ].map(({ num, title, desc }) => (
                  <div key={num} className="step">
                    <div className="step-num">{num}</div>
                    <div>
                      <div className="step-title">{title}</div>
                      <div className="step-desc">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div ref={statsRef} className="stats-dark">
              {STATS.map(({ icon, value, label, sub }) => (
                <div key={label} className="stat-item">
                  <div className="stat-icon">{icon}</div>
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                  <div className="stat-sub">{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RECENTLY ADDED ── */}
      <section className="recent-section">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <h2 className="section-title">Recently Added</h2>
              <p className="section-sub" style={{ marginBottom: 0 }}>New tools to boost your productivity.</p>
            </div>
            <Link href="/pdf-tools" className="view-all">View all new tools →</Link>
          </div>
          <div className="recent-grid">
            {RECENTLY_ADDED.map(({ slug, icon, title, desc, color }) => (
              <Link key={slug} href={`/${slug}`} className="recent-card">
                <span className="new-badge">NEW</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                  <span className="recent-title">{title}</span>
                </div>
                <div className="recent-desc">{desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOST USED ── */}
      <section className="most-used-section">
        <div className="section-inner">
          <div className="section-header">
            <div>
              <h2 className="section-title">Most Used Tools</h2>
              <p className="section-sub" style={{ marginBottom: 0 }}>See what others are using the most.</p>
            </div>
            <Link href="/pdf-tools" className="view-all">View all tools →</Link>
          </div>
          <div className="most-grid">
            {MOST_USED.map(({ slug, icon, title }) => (
              <Link key={slug} href={`/${slug}`} className="most-card">
                <span className="most-icon">{icon}</span>
                <span className="most-title">{title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer-section">
        <div className="section-inner">
          <div className="footer-grid">
            {/* Brand */}
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Convertam" style={{ height: 40, marginBottom: 12, filter: 'brightness(0) invert(1)' }} />
              <p className="footer-brand-desc">
                Powerful tools for PDFs, AI, images, documents, and business essentials.
              </p>
              <div className="footer-socials">
                <a href="https://x.com/chrisndz" target="_blank" rel="noopener noreferrer" className="social-btn">𝕏</a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-btn">in</a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-btn">f</a>
              </div>
            </div>

            {/* Tools */}
            <div>
              <div className="footer-col-title">Tools</div>
              {['PDF Tools', 'Business Tools', 'AI Tools', 'Image Tools', 'Calculators', 'Utilities'].map((t, i) => (
                <Link key={t} href={`/${['pdf-tools','business','ai-tools','image-tools','calculator','utilities'][i]}`} className="footer-link">{t}</Link>
              ))}
            </div>

            {/* Resources */}
            <div>
              <div className="footer-col-title">Resources</div>
              {['Blog', 'Guides', 'Templates', 'Use Cases', 'API'].map(t => (
                <span key={t} className="footer-link" style={{ cursor: 'default' }}>{t}</span>
              ))}
            </div>

            {/* Support */}
            <div>
              <div className="footer-col-title">Support</div>
              <Link href="/about" className="footer-link">Help Center</Link>
              <Link href="/about" className="footer-link">Contact Us</Link>
              <Link href="/about" className="footer-link">FAQ</Link>
              <Link href="/about" className="footer-link">Privacy</Link>
              <Link href="/about" className="footer-link">Report Issue</Link>
            </div>

            {/* Company + Newsletter */}
            <div>
              <div className="footer-col-title">Company</div>
              <Link href="/about" className="footer-link">Our Story</Link>
              <Link href="/about" className="footer-link">Careers</Link>
              <span className="footer-link" style={{ cursor: 'default' }}>Press</span>

              <div style={{ marginTop: 24 }}>
                <div className="footer-col-title">Stay Updated</div>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                  Get new tools and productivity tips straight to your inbox.
                </p>
                <div className="newsletter-row">
                  <input className="newsletter-input" type="email" placeholder="Enter your email" />
                  <button className="newsletter-btn">Subscribe</button>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <span className="footer-copy">© {new Date().getFullYear()} Convertam. All rights reserved.</span>
            <span className="footer-copy">Made with ❤️ in Nigeria</span>
          </div>
        </div>
      </footer>

    </main>
  );
}
