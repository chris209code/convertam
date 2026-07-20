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
  { id: 'profit-margin', href: '/calculators/profit-margin', icon: '📈', title: 'Profit & Loss Calculator', desc: 'Analyse revenue, expenses, margins, pricing and business performance.', category: 'financial' },
  { id: 'discount', href: '/calculators/discount-calculator', icon: '🏷️', title: 'Discount Calculator', desc: 'Find the final price and total savings on any discounted item.', category: 'financial' },
  { id: 'age', href: '/calculators/age-calculator', icon: '🎂', title: 'Age Calculator', desc: 'Calculate exact age in years, months and days from a date of birth.', category: 'personal' },
  { id: 'expense-budget', href: '/calculators/expense-budget-calculator', icon: '💵', title: 'Expense & Budget Calculator', desc: 'Track income, expenses and savings, and see your remaining balance live.', category: 'financial' },
  { id: 'break-even', href: '/calculators/break-even-calculator', icon: '⚖️', title: 'Break-even Calculator', desc: 'Find out how many units you need to sell to cover your costs.', category: 'financial' },
  { id: 'savings-goal', href: '/calculators/savings-goal-calculator', icon: '🎯', title: 'Savings Goal Calculator', desc: 'Plan how much to save regularly to hit a target, interest included.', category: 'financial' },
];

const FEATURED_ID = 'salary';

// This was the last pair of calculators on the roadmap — the suite is now
// complete, so there is no longer a Coming Soon section or category.
const CATEGORIES = [
  { id: 'financial', label: 'Business & Finance', title: 'Business & Finance' },
  { id: 'personal', label: 'Everyday', title: 'Everyday' },
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
      <span className="calc-card-arrow" aria-hidden="true">→</span>
    </Link>
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
  const featured = ACTIVE_CALCULATORS.find((c) => c.id === FEATURED_ID);
  const byCategory = (catId) => filteredActive.filter((c) => c.category === catId);
  const noResults = isSearching && filteredActive.length === 0;

  return (
    <main style={{ width: '100%', minHeight: '100vh', background: '#ffffff' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
        .calc-search-wrap { position: relative; max-width: 480px; margin-bottom: 16px; }
        .calc-search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: #94A3B8; }
        .calc-search {
          width: 100%; padding: 12px 16px 12px 42px; border-radius: 12px;
          border: 1.5px solid #E5E7EB; background: #FAFAFA;
          font-size: 0.9rem; font-family: inherit; outline: none; color: #0F172A; box-sizing: border-box;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .calc-search:focus { border-color: #2563EB; background: white; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .calc-nav { display: flex; gap: 8px; flex-wrap: wrap; }
        .calc-nav-btn {
          padding: 7px 15px; border-radius: 999px; border: 1.5px solid #E5E7EB; background: white;
          color: #475569; font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit;
          transition: all 0.15s ease;
        }
        .calc-nav-btn:hover { color: #1D4ED8; border-color: #BFDBFE; background: #EFF6FF; }

        .calc-featured {
          display: flex; align-items: center; gap: 18px; padding: 18px 22px; border-radius: 16px;
          background: white; border: 1.5px solid #EEF0F3; text-decoration: none;
          box-shadow: 0 2px 10px rgba(15,23,42,0.04); margin-bottom: 40px; transition: all 0.2s ease;
        }
        .calc-featured:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(15,23,42,0.08); border-color: #BFDBFE; }
        .calc-featured-icon {
          font-size: 1.7rem; flex-shrink: 0; width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center; background: #DBEAFE;
        }
        .calc-featured-eyebrow { font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #1D4ED8; margin: 0 0 4px; }
        .calc-featured-title { font-size: 1.15rem; font-weight: 800; margin: 0 0 3px; color: #0F172A; }
        .calc-featured-desc { font-size: 0.83rem; color: #64748B; margin: 0; }
        .calc-featured-cta {
          margin-left: auto; flex-shrink: 0; font-size: 0.8rem; font-weight: 700; white-space: nowrap;
          color: white; background: linear-gradient(120deg, #2563EB 0%, #1D4ED8 100%); padding: 9px 18px; border-radius: 999px;
        }

        .calc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .calc-card {
          position: relative; display: flex; align-items: flex-start; gap: 14px; padding: 18px; border-radius: 16px;
          border: 1.5px solid #EEF0F3; background: white; text-decoration: none;
          box-shadow: 0 1px 2px rgba(15,23,42,0.03); transition: all 0.18s ease;
        }
        .calc-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(15,23,42,0.08); border-color: #BFDBFE; }
        .calc-card:hover .calc-card-arrow { opacity: 1; transform: translateX(0); }
        .calc-card-icon {
          font-size: 1.3rem; flex-shrink: 0; line-height: 1; width: 40px; height: 40px; border-radius: 11px;
          display: flex; align-items: center; justify-content: center; background: #EFF6FF;
        }
        .calc-card-body { flex: 1; min-width: 0; padding-right: 14px; }
        .calc-card-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
        .calc-card-title { font-size: 0.9rem; font-weight: 700; color: #0F172A; }
        .calc-card-desc { font-size: 0.78rem; color: #64748B; line-height: 1.45; margin: 0; }
        .calc-card-arrow { position: absolute; right: 16px; top: 18px; color: #1D4ED8; font-size: 0.9rem; opacity: 0; transform: translateX(-4px); transition: all 0.18s ease; }
        .calc-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 0.63rem; font-weight: 700; letter-spacing: 0.02em; color: #B45309; white-space: nowrap; }
        .calc-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

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
      <div style={{ background: 'white', borderBottom: '1px solid #EEF0F3', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#2563EB', textDecoration: 'none', marginBottom: 12, display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(120deg, #2563EB 0%, #1D4ED8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 8px 20px rgba(37,99,235,0.25)', fontSize: '1.6rem' }} aria-hidden="true">🧮</span>
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
                <h2 id="financial" className="calc-section-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#152238' }}>💼 Business & Finance</h2>
                <div className="calc-grid">
                  {byCategory('financial').map((c) => <CalcCard key={c.id} calc={c} />)}
                </div>
              </div>
            )}

            {(isSearching ? byCategory('personal').length > 0 : true) && (
              <div style={{ marginBottom: 40 }}>
                <h2 id="personal" className="calc-section-title" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#152238' }}>🙋 Everyday</h2>
                <div className="calc-grid">
                  {byCategory('personal').map((c) => <CalcCard key={c.id} calc={c} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
