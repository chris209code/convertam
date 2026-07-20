'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

// Only calculators that genuinely solve a financial/business decision make
// the cut — see the Phase 1 brief. BMI and Tip Calculator are deliberately
// excluded from this hub (their code still exists in CalculatorWorkspace.js,
// just unreferenced) since they no longer fit Convertam's direction.
const ACTIVE_CALCULATORS = [
  { id: 'salary', href: '/salary-calculator', icon: '💰', title: 'Salary Calculator', desc: 'Calculate gross salary, deductions and take-home pay instantly.', badge: 'POPULAR', category: 'financial' },
  { id: 'loan', href: '/calculators/loan-calculator', icon: '🏦', title: 'Loan Calculator', desc: 'Work out monthly repayments, total interest and total repayment.', category: 'financial' },
  { id: 'vat', href: '/calculators/vat-calculator', icon: '🧾', title: 'VAT Calculator', desc: 'Add VAT to an amount or extract it from a VAT-inclusive price.', category: 'financial' },
  { id: 'profit-margin', href: '/calculators/profit-margin', icon: '📈', title: 'Profit & Loss Calculator', desc: 'Calculate revenue, costs, profit, margins, pricing and break-even performance.', category: 'financial' },
  { id: 'discount', href: '/calculators/discount-calculator', icon: '🏷️', title: 'Discount Calculator', desc: 'Find the final price and total savings on any discounted item.', category: 'financial' },
  { id: 'age', href: '/calculators/age-calculator', icon: '🎂', title: 'Age Calculator', desc: 'Calculate exact age in years, months and days from a date of birth.', category: 'personal' },
  { id: 'expense-budget', href: '/calculators/expense-budget-calculator', icon: '💵', title: 'Expense & Budget Calculator', desc: 'Track income, expenses and savings, and see your remaining balance live.', category: 'financial' },
];

const FEATURED_ID = 'salary';

const COMING_SOON = [
  { icon: '📊', title: 'Profit & Loss Calculator', desc: 'Get a full profit and loss breakdown for your business.' },
  { icon: '🎯', title: 'Savings Goal Calculator', desc: 'Plan how much to save each month to hit a target.' },
  { icon: '⚖️', title: 'Break-even Calculator', desc: 'Find out how many sales you need to cover your costs.' },
];

const CATEGORIES = [
  { id: 'financial', label: 'Financial', title: 'Financial Calculators' },
  { id: 'personal', label: 'Personal', title: 'Personal Calculators' },
  { id: 'coming-soon', label: 'Coming Soon', title: 'Coming Soon' },
];

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function CalcCard({ calc }) {
  return (
    <Link href={calc.href} className="calc-card">
      <span className="calc-card-icon" aria-hidden="true">{calc.icon}</span>
      <div className="calc-card-body">
        <div className="calc-card-title-row">
          <span className="calc-card-title">{calc.title}</span>
          {calc.badge && <span className="calc-badge calc-badge-popular">{calc.badge}</span>}
        </div>
        <p className="calc-card-desc">{calc.desc}</p>
      </div>
    </Link>
  );
}

function ComingSoonCard({ item }) {
  return (
    <div className="calc-card calc-card-soon" aria-disabled="true">
      <span className="calc-card-icon" aria-hidden="true">{item.icon}</span>
      <div className="calc-card-body">
        <div className="calc-card-title-row">
          <span className="calc-card-title">{item.title}</span>
          <span className="calc-badge calc-badge-soon">COMING SOON</span>
        </div>
        <p className="calc-card-desc">{item.desc}</p>
      </div>
    </div>
  );
}

export default function CalculatorHubClient() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const isSearching = q.length > 0;

  const matches = (title, desc) => title.toLowerCase().includes(q) || desc.toLowerCase().includes(q);

  const filteredActive = useMemo(
    () => (isSearching ? ACTIVE_CALCULATORS.filter((c) => matches(c.title, c.desc)) : ACTIVE_CALCULATORS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q]
  );
  const filteredComingSoon = useMemo(
    () => (isSearching ? COMING_SOON.filter((c) => matches(c.title, c.desc)) : COMING_SOON),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q]
  );

  const featured = ACTIVE_CALCULATORS.find((c) => c.id === FEATURED_ID);
  const byCategory = (catId) => filteredActive.filter((c) => c.category === catId);
  const noResults = isSearching && filteredActive.length === 0 && filteredComingSoon.length === 0;

  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #EFF6FF 0%, #F8FAFF 100%)' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
        .calc-search-wrap { position: relative; max-width: 480px; margin-bottom: 16px; }
        .calc-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94A3B8; }
        .calc-search {
          width: 100%; padding: 12px 16px 12px 42px; border-radius: 12px;
          border: 1px solid #BFDBFE; background: white;
          font-size: 0.9rem; font-family: inherit; outline: none; color: #0F172A; box-sizing: border-box;
        }
        .calc-search:focus { border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .calc-nav { display: flex; gap: 8px; flex-wrap: wrap; }
        .calc-nav-btn {
          padding: 8px 16px; border-radius: 999px; border: 1px solid #BFDBFE; background: white;
          color: #1D4ED8; font-size: 0.82rem; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: all 0.15s ease;
        }
        .calc-nav-btn:hover { background: #EFF6FF; border-color: #2563EB; }

        .calc-featured {
          display: flex; align-items: center; gap: 18px; padding: 20px 24px; border-radius: 16px;
          background: linear-gradient(120deg, #2563EB 0%, #1D4ED8 100%); color: white; text-decoration: none;
          box-shadow: 0 10px 30px rgba(37,99,235,0.25); margin-bottom: 40px; transition: transform 0.2s ease;
        }
        .calc-featured:hover { transform: translateY(-2px); }
        .calc-featured-icon { font-size: 2.2rem; flex-shrink: 0; }
        .calc-featured-eyebrow { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; margin: 0 0 4px; }
        .calc-featured-title { font-size: 1.25rem; font-weight: 800; margin: 0 0 4px; }
        .calc-featured-desc { font-size: 0.85rem; opacity: 0.92; margin: 0; }
        .calc-featured-cta { margin-left: auto; flex-shrink: 0; font-size: 0.85rem; font-weight: 700; white-space: nowrap; }

        .calc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .calc-card {
          display: flex; align-items: flex-start; gap: 12px; padding: 18px; border-radius: 16px;
          border: 1px solid #E2E8F0; background: white; text-decoration: none;
          box-shadow: 0 2px 8px rgba(15,23,42,0.04); transition: all 0.2s ease;
        }
        .calc-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(37,99,235,0.12); border-color: #BFDBFE; }
        .calc-card-icon { font-size: 1.6rem; flex-shrink: 0; line-height: 1; }
        .calc-card-body { flex: 1; min-width: 0; }
        .calc-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .calc-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; }
        .calc-card-desc { font-size: 0.78rem; color: #64748B; line-height: 1.45; margin: 0; }
        .calc-badge { font-size: 0.6rem; font-weight: 800; padding: 2px 8px; border-radius: 999px; white-space: nowrap; letter-spacing: 0.03em; }
        .calc-badge-popular { background: #FEF3C7; color: #92400E; }
        .calc-badge-soon { background: #E2E8F0; color: #64748B; }
        .calc-card-soon { cursor: default; opacity: 0.65; }
        .calc-card-soon:hover { transform: none; box-shadow: 0 2px 8px rgba(15,23,42,0.04); border-color: #E2E8F0; }

        .calc-section-title { display: flex; align-items: center; gap: 10px; margin: 0 0 16px; scroll-margin-top: 24px; }
        .calc-empty { text-align: center; padding: 48px 20px; color: #64748B; font-size: 0.9rem; }

        @media (max-width: 860px) {
          .calc-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .page-inner { padding: 0 5%; }
          .calc-grid { grid-template-columns: 1fr; }
          .calc-featured { flex-wrap: wrap; }
          .calc-featured-cta { margin-left: 0; }
          .calc-search-wrap { max-width: 100%; }
        }
      `}</style>

      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #DBEAFE', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#2563EB', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '2.5rem' }}>🧮</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>Calculator Hub</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>Calculators that help you make real financial and business decisions.</p>
            </div>
          </div>

          <div className="calc-search-wrap">
            <svg className="calc-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              className="calc-search"
              placeholder="Search calculators…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search calculators"
            />
          </div>

          <nav className="calc-nav" aria-label="Calculator categories">
            {CATEGORIES.map((c) => (
              <button key={c.id} className="calc-nav-btn" onClick={() => scrollToSection(c.id)}>{c.label}</button>
            ))}
          </nav>
        </div>
      </div>

      <div className="page-inner" style={{ padding: '40px 4% 64px' }}>
        {!isSearching && featured && (
          <Link href={featured.href} className="calc-featured">
            <span className="calc-featured-icon">{featured.icon}</span>
            <div>
              <p className="calc-featured-eyebrow">Featured Calculator</p>
              <p className="calc-featured-title">{featured.title}</p>
              <p className="calc-featured-desc">{featured.desc}</p>
            </div>
            <span className="calc-featured-cta">Open Calculator →</span>
          </Link>
        )}

        {noResults ? (
          <div className="calc-empty">No calculators match "{query}". Try a different search term.</div>
        ) : (
          <>
            {(isSearching ? byCategory('financial').length > 0 : true) && (
              <div style={{ marginBottom: 40 }}>
                <h2 id="financial" className="calc-section-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#152238' }}>💼 Financial Calculators</h2>
                <div className="calc-grid">
                  {byCategory('financial').map((c) => <CalcCard key={c.id} calc={c} />)}
                </div>
              </div>
            )}

            {(isSearching ? byCategory('personal').length > 0 : true) && (
              <div style={{ marginBottom: 40 }}>
                <h2 id="personal" className="calc-section-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#152238' }}>🙋 Personal Calculators</h2>
                <div className="calc-grid">
                  {byCategory('personal').map((c) => <CalcCard key={c.id} calc={c} />)}
                </div>
              </div>
            )}

            {filteredComingSoon.length > 0 && (
              <div>
                <h2 id="coming-soon" className="calc-section-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#152238' }}>🔜 Coming Soon</h2>
                <div className="calc-grid">
                  {filteredComingSoon.map((item) => <ComingSoonCard key={item.title} item={item} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
