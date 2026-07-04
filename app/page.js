'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

const TRENDING = ['PDF to Word', 'Invoice Generator', 'Resume Builder', 'OCR PDF', 'Compress PDF'];

const CATEGORIES = [
  {
    slug: 'pdf-tools', icon: '📄', title: 'PDF Tools', color: '#2566EB', bg: '#EFF6FF', border: '#BFDBFE',
    count: '12+', desc: 'Convert, merge, split, compress and secure your PDFs',
    examples: ['PDF to Word', 'Merge PDF', 'Compress PDF', 'Sign PDF', 'Protect PDF'],
  },
  {
    slug: 'business', icon: '🧾', title: 'Business Tools', color: '#22C55E', bg: '#ECFDF5', border: '#A7F3D0',
    count: '8+', desc: 'Invoices, receipts, quotes, ID cards and more',
    examples: ['Invoice Generator', 'Receipt Generator', 'Quotation Maker', 'ID Card Generator', 'Delivery Note'],
  },
  {
    slug: 'ai-tools', icon: '🤖', title: 'AI Tools', color: '#BB5CF6', bg: '#F5F3FF', border: '#DDD6FE',
    count: '10+', desc: 'AI-powered features for smarter work',
    examples: ['AI Summarizer', 'OCR PDF', 'CV Improver', 'AI Translator', 'AI Writer'],
  },
  {
    slug: 'image-tools', icon: '🖼️', title: 'Image Tools', color: '#F97316', bg: '#FFF7ED', border: '#FED7AA',
    count: '9+', desc: 'Convert, edit, resize and optimize images',
    examples: ['Image to PDF', 'Compress Image', 'Resize Image', 'Crop Image', 'Convert to WebP'],
  },
  {
    slug: 'calculator', icon: '🧮', title: 'Calculators', color: '#EAB308', bg: '#FEFCE8', border: '#FEF08A',
    count: '25+', desc: 'Finance, health, business and more',
    examples: ['VAT Calculator', 'Loan Calculator', 'BMI Calculator', 'Profit Calculator', 'Age Calculator'],
  },
  {
    slug: 'utilities', icon: '⚙️', title: 'Utilities', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0',
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
  { slug: 'pdf-to-word', icon: '📄', title: 'PDF to Word', desc: 'Convert PDF files to editable Word documents in seconds.', rating: 4.9, color: '#2566EB', popular: false },
  { slug: 'invoice-generator', icon: '🧾', title: 'Invoice Generator', desc: 'Create professional invoices instantly. Download as PDF.', rating: 4.8, color: '#22C55E', popular: false },
  { slug: 'ocr-pdf', icon: '🤖', title: 'OCR PDF', desc: 'Extract text from scanned PDFs and images using AI.', rating: 4.8, color: '#BB5CF6', popular: false },
  { slug: 'compress-pdf', icon: '🗜️', title: 'Compress PDF', desc: 'Reduce PDF file size without losing quality.', rating: 4.7, color: '#DC2626', popular: false },
  { slug: 'merge-pdf', icon: '🔗', title: 'Merge PDF', desc: 'Combine multiple PDFs into one single file.', rating: 4.8, color: '#0891B2', popular: false },
  { slug: 'sign-pdf', icon: '✍️', title: 'Sign PDF', desc: 'Place your signature anywhere on a PDF document.', rating: 4.9, color: '#D97706', popular: true },
];

const RECENTLY_ADDED = [
  { slug: 'write-on-pdf', icon: '✏️', title: 'Write on PDF', desc: 'Type text directly onto any scanned PDF form.', color: '#2566EB' },
  { slug: 'ocr-pdf', icon: '🤖', title: 'OCR PDF', desc: 'Extract text from scanned PDFs using AI.', color: '#BB5CF6' },
  { slug: 'summarize-pdf', icon: '📝', title: 'AI Summarizer', desc: 'Summarize any PDF document instantly.', color: '#22C55E' },
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

// ── Mini tool card widgets ─────────────────────────────────────────────────────

function PDFtoWordCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(37,99,235,0.12)', border: '1px solid #EFF6FF', width: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📄</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#1E3A5F' }}>PDF to Word</span>
      </div>
      <div style={{ background: '#F8FAFC', borderRadius: 8, padding: 8, marginBottom: 8 }}>
        {['Introduction', 'Chapter 1', 'Summary'].map((line, i) => (
          <div key={i} style={{ height: 6, background: i === 0 ? '#2566EB' : '#E2E8F0', borderRadius: 3, marginBottom: 4, width: i === 0 ? '60%' : i === 1 ? '80%' : '45%' }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 9, color: '#10B981', fontWeight: 600 }}>✓ Converted</span>
        <div style={{ flex: 1, height: 2, background: '#DCFCE7', borderRadius: 2 }}>
          <div style={{ width: '100%', height: 2, background: '#10B981', borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}

function InvoiceCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(34,197,94,0.12)', border: '1px solid #ECFDF5', width: 210 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🧾</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#065F46' }}>Invoice #001</span>
        </div>
        <span style={{ fontSize: 8, background: '#DCFCE7', color: '#16A34A', padding: '2px 6px', borderRadius: 99, fontWeight: 600 }}>PAID</span>
      </div>
      {[['Web Design', '₦45,000'], ['Hosting', '₦12,000'], ['Support', '₦8,000']].map(([item, price]) => (
        <div key={item} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: '#6B7280' }}>{item}</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: '#0F172A' }}>{price}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid #E5E7EB', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#0F172A' }}>Total</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: '#22C55E' }}>₦65,000</span>
      </div>
    </div>
  );
}

function OCRCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(187,92,246,0.12)', border: '1px solid #F5F3FF', width: 190 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🤖</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#4C1D95' }}>OCR PDF</span>
        <span style={{ fontSize: 8, background: '#F5F3FF', color: '#7C3AED', padding: '1px 5px', borderRadius: 99, fontWeight: 600, marginLeft: 'auto' }}>AI</span>
      </div>
      <div style={{ background: '#FAFAFA', borderRadius: 8, padding: 8, marginBottom: 8, fontFamily: 'monospace' }}>
        {['Name: Christopher', 'Date: 15/06/2026', 'Amount: ₦500,000'].map((line, i) => (
          <div key={i} style={{ fontSize: 8, color: i % 2 === 0 ? '#7C3AED' : '#374151', marginBottom: 3 }}>{line}</div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
        <span style={{ fontSize: 8, color: '#6B7280' }}>Text extracted successfully</span>
      </div>
    </div>
  );
}

function CompressCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(220,38,38,0.1)', border: '1px solid #FEF2F2', width: 185 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🗜️</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#991B1B' }}>Compress PDF</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 8, color: '#9CA3AF' }}>Original</span>
          <span style={{ fontSize: 8, fontWeight: 600, color: '#DC2626' }}>12.4 MB</span>
        </div>
        <div style={{ height: 4, background: '#FEE2E2', borderRadius: 2, marginBottom: 6 }}>
          <div style={{ height: 4, width: '100%', background: '#DC2626', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 8, color: '#9CA3AF' }}>Compressed</span>
          <span style={{ fontSize: 8, fontWeight: 600, color: '#10B981' }}>2.1 MB</span>
        </div>
        <div style={{ height: 4, background: '#DCFCE7', borderRadius: 2 }}>
          <div style={{ height: 4, width: '17%', background: '#10B981', borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#10B981', background: '#DCFCE7', padding: '4px 8px', borderRadius: 99 }}>
        83% smaller ✓
      </div>
    </div>
  );
}

function ResumeCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(217,119,6,0.12)', border: '1px solid #FFFBEB', width: 180 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#FFFBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📋</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#92400E' }}>Resume Builder</span>
      </div>
      <div style={{ background: '#FFFBEB', borderRadius: 8, padding: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FDE68A' }} />
          <div>
            <div style={{ height: 5, background: '#D97706', borderRadius: 2, width: 60, marginBottom: 2 }} />
            <div style={{ height: 3, background: '#FDE68A', borderRadius: 2, width: 40 }} />
          </div>
        </div>
        {['Experience', 'Education', 'Skills'].map((s, i) => (
          <div key={s} style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: '#D97706', marginBottom: 2 }}>{s}</div>
            <div style={{ height: 3, background: '#FDE68A', borderRadius: 2, width: ['80%', '65%', '70%'][i] }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryCard() {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 8px 32px rgba(8,145,178,0.12)', border: '1px solid #ECFEFF', width: 195 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ECFEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>📝</div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#164E63' }}>AI Summarizer</span>
        <span style={{ fontSize: 8, background: '#ECFEFF', color: '#0891B2', padding: '1px 5px', borderRadius: 99, fontWeight: 600, marginLeft: 'auto' }}>AI</span>
      </div>
      <div style={{ background: '#F0FDFE', borderRadius: 8, padding: 8 }}>
        <div style={{ fontSize: 8, color: '#164E63', fontWeight: 600, marginBottom: 4 }}>Key Points:</div>
        {['Document outlines the Q2 results', 'Revenue grew by 24% YoY', 'New markets identified in Africa'].map((point, i) => (
          <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 3 }}>
            <span style={{ color: '#0891B2', fontSize: 8 }}>•</span>
            <span style={{ fontSize: 8, color: '#374151', lineHeight: 1.3 }}>{point}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Floating cards composition ─────────────────────────────────────────────────
function HeroCards() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouse = (e) => {
      setMouse({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const cards = [
    { component: <PDFtoWordCard />, x: 0, y: 0, delay: '0s', depth: 1 },
    { component: <InvoiceCard />, x: 220, y: -20, delay: '0.5s', depth: 1.5, popular: true },
    { component: <OCRCard />, x: 440, y: 10, delay: '1s', depth: 1 },
    { component: <CompressCard />, x: 60, y: 220, delay: '1.5s', depth: 0.8 },
    { component: <ResumeCard />, x: 260, y: 210, delay: '2s', depth: 1.2 },
    { component: <SummaryCard />, x: 450, y: 200, delay: '0.8s', depth: 0.9 },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: 380 }}>
      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-10px)} }
        @keyframes float2 { 0%,100%{transform:translateY(-5px)} 50%{transform:translateY(8px)} }
        @keyframes float3 { 0%,100%{transform:translateY(4px)} 50%{transform:translateY(-8px)} }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.3)} }
        .hero-card-wrap { position: absolute; transition: transform 0.1s ease; }
        .hero-card-wrap:nth-child(1) { animation: float1 4s ease-in-out infinite; }
        .hero-card-wrap:nth-child(2) { animation: float2 5s ease-in-out infinite; }
        .hero-card-wrap:nth-child(3) { animation: float3 4.5s ease-in-out infinite; }
        .hero-card-wrap:nth-child(4) { animation: float2 3.5s ease-in-out infinite; }
        .hero-card-wrap:nth-child(5) { animation: float1 5.5s ease-in-out infinite; }
        .hero-card-wrap:nth-child(6) { animation: float3 4s ease-in-out infinite; }
      `}</style>

      {/* Dotted connector lines SVG */}
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <marker id="dot" viewBox="0 0 4 4" refX="2" refY="2" markerWidth="4" markerHeight="4">
            <circle cx="2" cy="2" r="1.5" fill="#CBD5E1" />
          </marker>
        </defs>
        {[
          [100, 80, 320, 60],
          [320, 60, 540, 80],
          [100, 80, 160, 260],
          [320, 60, 360, 250],
          [540, 80, 550, 250],
          [160, 260, 360, 250],
          [360, 250, 550, 250],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="4 4"
            opacity="0.6" />
        ))}
        {/* Glow dots at intersections */}
        {[[100,80],[320,60],[540,80],[160,260],[360,250],[550,250]].map(([cx,cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill="#2566EB" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.8;0.4" dur={`${2+i*0.5}s`} repeatCount="indefinite" />
            <animate attributeName="r" values="3;5;3" dur={`${2+i*0.5}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </svg>

      {cards.map(({ component, x, y, delay, depth, popular }, i) => (
        <div key={i} className="hero-card-wrap"
          style={{
            left: x,
            top: y,
            animationDelay: delay,
            transform: `translate(${mouse.x * depth * 0.3}px, ${mouse.y * depth * 0.3}px)`,
            zIndex: popular ? 10 : 1,
          }}>
          {popular && (
            <div style={{
              position: 'absolute', top: -10, right: 8, zIndex: 20,
              background: '#F59E0B', color: 'white',
              fontSize: 9, fontWeight: 700, padding: '3px 10px',
              borderRadius: 99, boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
            }}>Most Popular</div>
          )}
          {component}
        </div>
      ))}
    </div>
  );
}

function Stars({ rating }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#F59E0B' : '#E5E7EB', fontSize: '0.75rem' }}>★</span>
      ))}
      <span style={{ fontSize: '0.72rem', color: '#6B7280', marginLeft: 4 }}>{rating}</span>
    </div>
  );
}

export default function HomePage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', overflowX: 'hidden', background: '#FFFFFF' }}>
      <style>{`
        * { box-sizing: border-box; }
        .si { width: 100%; padding: 0 4%; }
        .st { font-size: clamp(1.2rem,2.5vw,1.5rem); font-weight: 800; color: #0F172A; margin: 0 0 6px; }
        .ss { font-size: 0.9rem; color: #64748B; margin: 0 0 40px; }
        .sh { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
        .va { font-size: 0.82rem; font-weight: 600; color: #2566EB; text-decoration: none; }
        .va:hover { text-decoration: underline; }

        /* Hero */
        .hero {
          width: 100%; min-height: auto;
          display: grid; grid-template-columns: 1fr 1fr;
          align-items: center; gap: 40px;
          padding: 60px 4% 40px;
          background: linear-gradient(160deg, #FFFFFF 0%, #F0F7FF 50%, #EEF5FF 100%);
          position: relative; overflow: hidden;
        }
        .hero::before {
          content: '';
          position: absolute; top: -200px; right: -200px;
          width: 600px; height: 600px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%);
          pointer-events: none;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 16px; border-radius: 99px; margin-bottom: 24px;
          background: #EFF6FF; border: 1px solid #BFDBFE;
        }
        .hero-title {
          font-size: clamp(1.8rem,3.5vw,3rem); font-weight: 900;
          line-height: 1.05; letter-spacing: -0.02em;
          color: #0F172A; margin: 0 0 16px;
        }
        .hero-sub {
          font-size: clamp(0.95rem,1.5vw,1.05rem); color: #475569;
          line-height: 1.7; margin: 0 0 32px; max-width: 480px;
        }
        .search-wrap {
          display: flex; align-items: center; background: white;
          border-radius: 14px; border: 1.5px solid #E2E8F0;
          box-shadow: 0 4px 24px rgba(37,99,235,0.08);
          overflow: hidden; margin-bottom: 16px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .search-wrap:hover { border-color: #BFDBFE; box-shadow: 0 8px 32px rgba(37,99,235,0.12); }
        .search-icon { padding: 0 14px; color: #94A3B8; }
        .search-fake { flex:1; padding: 14px 0; font-size: 0.88rem; color: #94A3B8; text-decoration: none; display: block; }
        .search-btn { padding: 14px 20px; background: #2566EB; color: white; font-size: 0.88rem; font-weight: 600; text-decoration: none; white-space: nowrap; }
        .search-btn:hover { background: #1D4ED8; }
        .trend-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .trend-label { font-size: 0.72rem; color: #94A3B8; white-space: nowrap; }
        .trend-chip {
          font-size: 0.7rem; font-weight: 500; padding: 4px 10px;
          border-radius: 99px; background: #F1F5F9; border: 1px solid #E2E8F0;
          color: #475569; text-decoration: none; transition: all 0.15s;
        }
        .trend-chip:hover { background: #EFF6FF; border-color: #BFDBFE; color: #2566EB; }

        /* Categories */
        .cat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
        .cat-card {
          border-radius: 16px; padding: 18px; border: 1px solid;
          text-decoration: none; transition: all 0.25s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .cat-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.1); }

        /* Audiences */
        .aud-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .aud-card {
          padding: 18px; border-radius: 14px; text-align: center;
          border: 1px solid #E5E7EB; background: #FAFAFA; transition: all 0.2s;
        }
        .aud-card:hover { border-color: #BFDBFE; background: #EFF6FF; transform: translateY(-2px); }

        /* Featured */
        .feat-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .feat-card {
          background: white; border-radius: 12px; padding: 14px;
          border: 1px solid #E5E7EB; transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); position: relative;
        }
        .feat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); border-color: #BFDBFE; }

        /* How */
        .how-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
        .stats-dark {
          background: linear-gradient(135deg,#0F172A,#1E3A5F);
          border-radius: 24px; padding: 32px;
          display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
        }

        /* Recent */
        .rec-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
        .rec-card {
          background: white; border-radius: 12px; padding: 14px;
          border: 1px solid #E5E7EB; text-decoration: none;
          transition: all 0.2s; box-shadow: 0 2px 6px rgba(0,0,0,0.04);
        }
        .rec-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.1); border-color: #BFDBFE; }

        /* Most used */
        .mu-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        .mu-card {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-radius: 10px; border: 1px solid #E5E7EB;
          text-decoration: none; background: #FAFAFA; transition: all 0.15s;
        }
        .mu-card:hover { background: #EFF6FF; border-color: #BFDBFE; transform: translateY(-1px); }

        /* Footer */
        .footer { background: #0F172A; padding: 32px 0 20px; }
        .foot-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr 1fr; gap: 40px; margin-bottom: 24px; }
        .foot-col-title { font-size: 0.72rem; font-weight: 700; color: white; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 14px; }
        .foot-link { display: block; font-size: 0.8rem; color: rgba(255,255,255,0.55); text-decoration: none; margin-bottom: 8px; transition: color 0.15s; }
        .foot-link:hover { color: white; }
        .foot-bottom { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .foot-copy { font-size: 0.75rem; color: rgba(255,255,255,0.35); }
        .social-btn {
          width: 34px; height: 34px; border-radius: 8px;
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
          display: flex; align-items: center; justify-content: center;
          text-decoration: none; font-size: 0.8rem; color: rgba(255,255,255,0.6);
          transition: all 0.15s;
        }
        .social-btn:hover { background: rgba(255,255,255,0.15); color: white; }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero { grid-template-columns: 1fr; min-height: auto; padding: 80px 5% 40px; }
          .hero-right-wrap { display: none; }
          .cat-grid { grid-template-columns: repeat(2,1fr); }
          .feat-grid { grid-template-columns: repeat(2,1fr); }
          .how-grid { grid-template-columns: 1fr; }
          .foot-grid { grid-template-columns: 1fr 1fr; }
        }
        @media (max-width: 768px) {
          .si { padding: 0 5%; }
          .cat-grid,.aud-grid { grid-template-columns: 1fr; }
          .feat-grid,.rec-grid { grid-template-columns: 1fr; }
          .mu-grid { grid-template-columns: repeat(2,1fr); }
          .stats-dark { grid-template-columns: 1fr 1fr; }
          .foot-grid { grid-template-columns: 1fr; gap: 24px; }
          .foot-bottom { flex-direction: column; text-align: center; }
        }
        @media (max-width: 480px) {
          .mu-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="hero">
        <div>
          <div className="hero-badge">
            <span style={{ width:7,height:7,borderRadius:'50%',background:'#10B981',display:'inline-block' }} />
            <span style={{ fontSize:'0.78rem',fontWeight:600,color:'#2566EB' }}>100% Free Forever</span>
          </div>
          <h1 className="hero-title">
            One platform.<br />
            <span style={{ color:'#2566EB' }}>Endless productivity.</span>
          </h1>
          <p className="hero-sub">
            Powerful tools for PDFs, AI-powered features, images, documents, and business essentials.
          </p>
          <div className="search-wrap">
            <span className="search-icon">🔍</span>
            <Link href="#categories" className="search-fake">
              Search for any tool... Try &quot;invoice&quot;, &quot;compress PDF&quot;, &quot;OCR&quot;...
            </Link>
            <Link href="#categories" className="search-btn">Search</Link>
          </div>
          <div className="trend-row">
            <span className="trend-label">Trending:</span>
            {TRENDING.map(t => (
              <Link key={t} href="#categories" className="trend-chip">{t}</Link>
            ))}
          </div>
        </div>
        <div className="hero-right-wrap">
          <HeroCards />
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section id="categories" style={{ padding:'40px 0', background:'#F8FAFC' }}>
        <div className="si">
          <h2 className="st">Browse by Category</h2>
          <p className="ss">Everything you need to work smarter — all in one place.</p>
          <div className="cat-grid">
            {CATEGORIES.map(({ slug, icon, title, color, bg, border, count, desc, examples }) => (
              <Link key={slug} href={`/${slug}`} className="cat-card" style={{ background:bg, borderColor:border }}>
                <div style={{ fontSize:'2rem', marginBottom:12 }}>{icon}</div>
                <div style={{ fontSize:'0.72rem', fontWeight:700, color, marginBottom:4 }}>{count} tools</div>
                <div style={{ fontSize:'1rem', fontWeight:700, color:'#0F172A', marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:'0.78rem', color:'#64748B', lineHeight:1.5, marginBottom:12 }}>{desc}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:14 }}>
                  {examples.map(ex => (
                    <div key={ex} style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.72rem', color:'#475569' }}>
                      <span style={{ color, fontSize:'0.55rem' }}>●</span>{ex}
                    </div>
                  ))}
                </div>
                <span style={{ fontSize:'0.78rem', fontWeight:600, color, display:'inline-flex', alignItems:'center', gap:4 }}>
                  Explore →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILT FOR EVERYONE ── */}
      <section style={{ padding:'40px 0', background:'white' }}>
        <div className="si">
          <h2 className="st">Built for everyone</h2>
          <p className="ss">Powerful tools for every need and every person.</p>
          <div className="aud-grid">
            {AUDIENCES.map(({ icon, title, desc }) => (
              <div key={title} className="aud-card">
                <div style={{ fontSize:'2rem', marginBottom:12 }}>{icon}</div>
                <div style={{ fontSize:'0.9rem', fontWeight:700, color:'#0F172A', marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:'0.78rem', color:'#64748B', lineHeight:1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED TOOLS ── */}
      <section style={{ padding:'40px 0', background:'#F8FAFC' }}>
        <div className="si">
          <div className="sh">
            <div>
              <h2 className="st">Featured Tools</h2>
              <p className="ss" style={{ marginBottom:0 }}>Hand-picked tools that our users love the most.</p>
            </div>
            <Link href="/pdf-tools" className="va">View all tools →</Link>
          </div>
          <div className="feat-grid">
            {FEATURED_TOOLS.map(({ slug, icon, title, desc, rating, color, popular }) => (
              <div key={slug} className="feat-card">
                {popular && (
                  <div style={{ position:'absolute', top:-8, right:12, background:'#F59E0B', color:'white', fontSize:9, fontWeight:700, padding:'2px 8px', borderRadius:99 }}>Popular</div>
                )}
                <div style={{ fontSize:'1.8rem', marginBottom:10 }}>{icon}</div>
                <div style={{ fontSize:'0.9rem', fontWeight:700, color:'#0F172A', marginBottom:4 }}>{title}</div>
                <div style={{ fontSize:'0.75rem', color:'#64748B', lineHeight:1.4, marginBottom:10 }}>{desc}</div>
                <Stars rating={rating} />
                <Link href={`/${slug}`} style={{ display:'block', width:'100%', textAlign:'center', padding:'8px', borderRadius:10, fontSize:'0.78rem', fontWeight:600, textDecoration:'none', color:'white', marginTop:12, background:color }}>
                  Launch Tool
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding:'40px 0', background:'white' }}>
        <div className="si">
          <div className="how-grid">
            <div>
              <h2 className="st">How Convertam Works</h2>
              <p className="ss">Three simple steps to get your work done.</p>
              <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
                {[
                  { n:'1', t:'Upload', d:'Upload your file securely from your device. No account needed.' },
                  { n:'2', t:'Choose Tool', d:'Select the right tool and customize it if needed.' },
                  { n:'3', t:'Download', d:'Get your result instantly. Fast, easy, secure.' },
                ].map(({ n, t, d }) => (
                  <div key={n} style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                    <div style={{ width:44, height:44, borderRadius:'50%', background:'#2566EB', color:'white', fontSize:'1.1rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{n}</div>
                    <div>
                      <div style={{ fontSize:'1rem', fontWeight:700, color:'#0F172A', marginBottom:4 }}>{t}</div>
                      <div style={{ fontSize:'0.82rem', color:'#64748B', lineHeight:1.5 }}>{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="stats-dark">
              {[
                { icon:'📁', value:'100,000+', label:'Files Processed', sub:'And counting every day' },
                { icon:'🛠️', value:'25+', label:'Free Tools', sub:'And more coming soon' },
                { icon:'📂', value:'12+', label:'Tool Categories', sub:'Everything in one place' },
                { icon:'✅', value:'99.9%', label:'Success Rate', sub:'Reliable and accurate' },
                { icon:'🗑️', value:'24 hrs', label:'Auto Deletion', sub:'Your files stay private' },
              ].map(({ icon, value, label, sub }) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:'1.4rem', marginBottom:8 }}>{icon}</div>
                  <div style={{ fontSize:'1.3rem', fontWeight:800, color:'white', marginBottom:4 }}>{value}</div>
                  <div style={{ fontSize:'0.75rem', fontWeight:600, color:'rgba(255,255,255,0.8)', marginBottom:2 }}>{label}</div>
                  <div style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.5)' }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── RECENTLY ADDED ── */}
      <section style={{ padding:'40px 0', background:'#F8FAFC' }}>
        <div className="si">
          <div className="sh">
            <div>
              <h2 className="st">Recently Added</h2>
              <p className="ss" style={{ marginBottom:0 }}>New tools to boost your productivity.</p>
            </div>
            <Link href="/pdf-tools" className="va">View all new tools →</Link>
          </div>
          <div className="rec-grid">
            {RECENTLY_ADDED.map(({ slug, icon, title, desc, color }) => (
              <Link key={slug} href={`/${slug}`} className="rec-card">
                <span style={{ display:'inline-block', fontSize:9, fontWeight:700, padding:'2px 7px', borderRadius:99, background:'#10B981', color:'white', marginBottom:8 }}>NEW</span>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <span style={{ fontSize:'1.4rem' }}>{icon}</span>
                  <span style={{ fontSize:'0.85rem', fontWeight:700, color:'#0F172A' }}>{title}</span>
                </div>
                <div style={{ fontSize:'0.72rem', color:'#64748B', lineHeight:1.4 }}>{desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── MOST USED ── */}
      <section style={{ padding:'40px 0', background:'white' }}>
        <div className="si">
          <div className="sh">
            <div>
              <h2 className="st">Most Used Tools</h2>
              <p className="ss" style={{ marginBottom:0 }}>See what others are using the most.</p>
            </div>
            <Link href="/pdf-tools" className="va">View all tools →</Link>
          </div>
          <div className="mu-grid">
            {MOST_USED.map(({ slug, icon, title }) => (
              <Link key={slug} href={`/${slug}`} className="mu-card">
                <span style={{ fontSize:'1.3rem', flexShrink:0 }}>{icon}</span>
                <span style={{ fontSize:'0.8rem', fontWeight:600, color:'#0F172A' }}>{title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="si">
          <div className="foot-grid">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Convertam" style={{ height:38, marginBottom:12, filter:'brightness(0) invert(1)' }} />
              <p style={{ fontSize:'0.8rem', color:'rgba(255,255,255,0.5)', lineHeight:1.6, margin:'0 0 20px' }}>
                Powerful tools for PDFs, AI, images, documents, and business essentials.
              </p>
              <div style={{ display:'flex', gap:10 }}>
                {[['𝕏','https://x.com/chrisndz'],['in','#'],['f','#']].map(([label, href]) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="social-btn">{label}</a>
                ))}
              </div>
            </div>
            <div>
              <div className="foot-col-title">Tools</div>
              {[['PDF Tools','pdf-tools'],['Business Tools','business'],['AI Tools','ai-tools'],['Image Tools','image-tools'],['Calculators','calculator'],['Utilities','utilities']].map(([t,s]) => (
                <Link key={t} href={`/${s}`} className="foot-link">{t}</Link>
              ))}
            </div>
            <div>
              <div className="foot-col-title">Resources</div>
              {['Blog','Guides','Templates','Use Cases','API'].map(t => (
                <span key={t} className="foot-link" style={{ cursor:'default' }}>{t}</span>
              ))}
            </div>
            <div>
              <div className="foot-col-title">Support</div>
              <Link href="/about" className="foot-link">Help Center</Link>
              <Link href="/about" className="foot-link">Contact Us</Link>
              <Link href="/about" className="foot-link">FAQ</Link>
              <Link href="/about" className="foot-link">Privacy</Link>
              <Link href="/about" className="foot-link">Report Issue</Link>
            </div>
            <div>
              <div className="foot-col-title">Company</div>
              <Link href="/about" className="foot-link">Our Story</Link>
              <Link href="/about" className="foot-link">Careers</Link>
              <span className="foot-link" style={{ cursor:'default' }}>Press</span>
              <div style={{ marginTop:24 }}>
                <div className="foot-col-title">Stay Updated</div>
                <p style={{ fontSize:'0.75rem', color:'rgba(255,255,255,0.45)', marginBottom:10, lineHeight:1.5 }}>
                  Get new tools and productivity tips straight to your inbox.
                </p>
                <div style={{ display:'flex', borderRadius:10, overflow:'hidden' }}>
                  <input style={{ flex:1, padding:'9px 12px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRight:'none', color:'white', fontSize:'0.78rem', fontFamily:'inherit', outline:'none', borderRadius:'10px 0 0 10px' }} type="email" placeholder="Enter your email" />
                  <button style={{ padding:'9px 14px', background:'#2566EB', color:'white', border:'none', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', fontFamily:'inherit', borderRadius:'0 10px 10px 0' }}>Subscribe</button>
                </div>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span className="foot-copy">© {new Date().getFullYear()} Convertam. All rights reserved.</span>
            <span className="foot-copy">Made with ❤️ in Nigeria</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
