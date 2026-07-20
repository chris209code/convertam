'use client';

import { useMemo, useRef, useState } from 'react';
import NumberInput from '../salary-calculator/NumberInput';
import DoughnutChart from '../salary-calculator/DoughnutChart';
import ExportBar from '../salary-calculator/ExportBar';
import { POPULAR_CURRENCIES, OTHER_CURRENCIES, symbolForCode } from '../salary-calculator/currencies';
import { formatCurrency, formatPercent } from '../salary-calculator/format';
import IncomeRow from './IncomeRow';
import ExpenseCategoryRow from './ExpenseCategoryRow';
import { buildBudgetSummaryText } from './exportText';
import { buildBudgetReportData } from './reportData';
import { generateFinancialReportPdf } from '../financial-shared/FinancialReport';
import {
  PERIODS, computeBudget, buildBudgetStatus, buildIncomeAllocation, build503020Comparison,
  buildRankedExpenses, buildPeriodTable, buildInsights, perPeriod,
} from './calculations';

const DEFAULT_INCOME_SOURCES = [
  { id: 1, name: 'Salary', amount: '' },
  { id: 2, name: 'Business Income', amount: '' },
  { id: 3, name: 'Freelance Income', amount: '' },
  { id: 4, name: 'Bonus', amount: '' },
  { id: 5, name: 'Other Income', amount: '' },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 1, name: 'Housing/Rent', mode: 'fixed', value: '' },
  { id: 2, name: 'Food', mode: 'fixed', value: '' },
  { id: 3, name: 'Transport', mode: 'fixed', value: '' },
  { id: 4, name: 'Utilities', mode: 'fixed', value: '' },
  { id: 5, name: 'Debt Repayment', mode: 'fixed', value: '' },
  { id: 6, name: 'Education', mode: 'fixed', value: '' },
  { id: 7, name: 'Healthcare', mode: 'fixed', value: '' },
  { id: 8, name: 'Family Support', mode: 'fixed', value: '' },
  { id: 9, name: 'Savings/Investment', mode: 'fixed', value: '' },
  { id: 10, name: 'Entertainment', mode: 'fixed', value: '' },
  { id: 11, name: 'Subscriptions', mode: 'fixed', value: '' },
  { id: 12, name: 'Personal Care', mode: 'fixed', value: '' },
  { id: 13, name: 'Other Expenses', mode: 'fixed', value: '' },
];

const CHART_COLORS = ['#2563EB', '#F59E0B', '#7C3AED', '#059669', '#DC2626', '#0EA5E9', '#DB2777', '#65A30D', '#EA580C', '#4F46E5', '#0D9488', '#B45309', '#94A3B8'];
const INSIGHT_ICONS = { chart: '📊', warning: '⚠️', percent: '📈', shield: '🛡️' };
const STATUS_TONE_CLASS = { green: 'exb-status-green', amber: 'exb-status-amber', red: 'exb-status-red' };

function SectionCard({ icon, title, action, children }) {
  return (
    <div className="exb-card">
      <div className="exb-card-head">
        <span className="exb-card-title"><span aria-hidden="true">{icon}</span> {title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`exb-stat exb-stat-${tone || 'default'}`}>
      <div className="exb-stat-label">{label}</div>
      <div className="exb-stat-value">{value}</div>
    </div>
  );
}

export default function ExpenseBudgetCalculator() {
  const [incomeSources, setIncomeSources] = useState(DEFAULT_INCOME_SOURCES);
  const [incomePeriod, setIncomePeriod] = useState('monthly');
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const currency = symbolForCode(currencyCode);
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);
  const [show503020, setShow503020] = useState(false);
  const [nextId, setNextId] = useState(100);
  const summaryRef = useRef(null);

  function addIncomeSource() {
    setIncomeSources((prev) => [...prev, { id: nextId, name: '', amount: '' }]);
    setNextId((n) => n + 1);
  }
  function updateIncomeSource(id, key, val) {
    setIncomeSources((prev) => prev.map((s) => (s.id === id ? { ...s, [key]: val } : s)));
  }
  function removeIncomeSource(id) {
    setIncomeSources((prev) => prev.filter((s) => s.id !== id));
  }
  function addExpenseCategory() {
    setExpenseCategories((prev) => [...prev, { id: nextId, name: '', mode: 'fixed', value: '' }]);
    setNextId((n) => n + 1);
  }
  function updateExpenseCategory(id, key, val) {
    setExpenseCategories((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: val } : c)));
  }
  function removeExpenseCategory(id) {
    setExpenseCategories((prev) => prev.filter((c) => c.id !== id));
  }
  function resetAll() {
    setIncomeSources(DEFAULT_INCOME_SOURCES);
    setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
    setIncomePeriod('monthly');
    setShow503020(false);
  }

  const result = useMemo(
    () => computeBudget({ incomeSources, incomePeriod, expenseCategories }),
    [incomeSources, incomePeriod, expenseCategories]
  );
  const periodLabel = result.periodData.label;
  const budgetStatus = useMemo(() => buildBudgetStatus(result), [result]);
  const allocation = useMemo(() => buildIncomeAllocation(result), [result]);
  const comparison503020 = useMemo(() => build503020Comparison(result), [result]);
  const ranked = useMemo(() => buildRankedExpenses(result), [result]);
  const periodTable = useMemo(() => buildPeriodTable(result), [result]);
  const insights = useMemo(() => buildInsights(result, incomePeriod), [result, incomePeriod]);

  const duplicateNames = useMemo(() => {
    const seen = new Map();
    for (const c of expenseCategories) {
      const key = (c.name || '').trim().toLowerCase();
      if (!key) continue;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    return [...seen.entries()].some(([, count]) => count > 1);
  }, [expenseCategories]);

  const chartSegments = ranked.map((c, i) => ({
    label: c.name || 'Category',
    value: c.annualAmount,
    color: CHART_COLORS[i % CHART_COLORS.length],
    displayValue: formatCurrency(perPeriod(c.annualAmount, incomePeriod), currency),
  }));

  return (
    <div className="exb-root">
      <style>{EXB_STYLES}</style>

      <div className="exb-topbar no-print">
        <span className="exb-privacy" title="Every calculation happens in your browser — nothing is sent to a server or stored.">
          🔒 100% Private <span className="exb-privacy-sub">Your income and expense information is processed locally and is not stored</span>
        </span>
      </div>

      <div className="exb-grid">
        {/* ---------------- LEFT: inputs ---------------- */}
        <div className="exb-col no-print">
          <SectionCard icon="💰" title="Income">
            <p className="exb-card-sub">Add every source of income you receive.</p>
            <div className="exb-field-row">
              <div style={{ width: 132, flexShrink: 0 }}>
                <label className="exb-label" htmlFor="exb-currency">Currency</label>
                <select id="exb-currency" className="exb-select" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} aria-label="Currency">
                  <optgroup label="Popular">
                    {POPULAR_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>
                    ))}
                  </optgroup>
                  <optgroup label="All Currencies">
                    {OTHER_CURRENCIES.map((c) => (
                      <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="exb-label" htmlFor="exb-period">Income Period</label>
                <select id="exb-period" className="exb-select" value={incomePeriod} onChange={(e) => setIncomePeriod(e.target.value)}>
                  {PERIODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              {incomeSources.map((s) => (
                <IncomeRow
                  key={s.id}
                  source={s}
                  currency={currency}
                  onChange={(key, val) => updateIncomeSource(s.id, key, val)}
                  onRemove={() => removeIncomeSource(s.id)}
                  showRemove={incomeSources.length > 0}
                />
              ))}
            </div>
            <button className="exb-add-btn" onClick={addIncomeSource}>➕ Add Income Source</button>
          </SectionCard>

          <SectionCard icon="💸" title="Expenses">
            <p className="exb-card-sub">Enter each category as a fixed amount or a percentage of your income — leave any category blank to skip it.</p>
            {duplicateNames && (
              <div role="alert" className="exb-warning-banner">
                ⚠️ Two or more expense categories share the same name — totals are still accurate, but the breakdown below may be easier to read if you rename them.
              </div>
            )}
            {expenseCategories.map((c) => (
              <ExpenseCategoryRow
                key={c.id}
                category={c}
                currency={currency}
                annualIncome={result.totalAnnualIncome}
                periodMultiplier={result.periodData.multiplier}
                periodLabel={periodLabel}
                onChange={(key, val) => updateExpenseCategory(c.id, key, val)}
                onRemove={() => removeExpenseCategory(c.id)}
                showRemove={expenseCategories.length > 0}
              />
            ))}
            <button className="exb-add-btn" onClick={addExpenseCategory}>➕ Add Expense Category</button>
          </SectionCard>

          <div className="exb-card">
            <label className="exb-checkbox-label">
              <input type="checkbox" checked={show503020} onChange={(e) => setShow503020(e.target.checked)} />
              Compare to the 50/30/20 budgeting rule
            </label>
            <p className="exb-card-sub" style={{ marginTop: 6, marginBottom: 0 }}>This is a general budgeting guideline, not a compulsory rule — shown for reference only.</p>
          </div>

          <button className="exb-reset-btn" onClick={resetAll}>↺ Reset All</button>
          <p className="exb-disclaimer">💡 These calculations are estimates based on the figures you enter. Actual results may vary.</p>
        </div>

        {/* ---------------- RIGHT: live summary ---------------- */}
        <div className="exb-col">
          <div ref={summaryRef} className="exb-summary-capture">
            {!result.hasResults ? (
              <div className="exb-empty-state">
                <span aria-hidden="true" style={{ fontSize: '2rem' }}>💵</span>
                <p>Enter your income to see your live budget breakdown.</p>
              </div>
            ) : (
              <>
                <SectionCard icon="📊" title="Your Budget Overview" action={<span className="exb-live-badge">● Live</span>}>
                  <p className="exb-card-sub">Live calculation based on your inputs</p>

                  <div className="exb-hero">
                    <div className="exb-hero-label">Remaining Balance</div>
                    <div className="exb-hero-value">{formatCurrency(perPeriod(result.remainingBalance, incomePeriod), currency)}{result.remainingBalance < 0 ? ' short' : ''}</div>
                    <div className="exb-hero-sub">{result.remainingBalance < 0 ? 'Over Budget' : 'Left over'} / {periodLabel}</div>
                  </div>

                  {budgetStatus && (
                    <div className={`exb-status-banner ${STATUS_TONE_CLASS[budgetStatus.tone]}`}>
                      <span className="exb-status-label">{budgetStatus.label}</span>
                      <span className="exb-status-detail">{budgetStatus.detail}</span>
                    </div>
                  )}

                  <div className="exb-stat-grid">
                    <StatCard label="Total Income" value={formatCurrency(perPeriod(result.totalAnnualIncome, incomePeriod), currency)} tone="blue" />
                    <StatCard label="Total Expenses" value={formatCurrency(perPeriod(result.totalAnnualExpenses, incomePeriod), currency)} tone="red" />
                    {result.savingsCategory && <StatCard label="Total Savings/Investment" value={formatCurrency(perPeriod(result.totalAnnualSavings, incomePeriod), currency)} tone="green" />}
                    <StatCard label="Disposable Income" value={formatCurrency(perPeriod(result.disposableIncome, incomePeriod), currency)} tone="purple" />
                    <StatCard label="Expense Ratio" value={formatPercent(result.expenseRatio)} tone="amber" />
                    <StatCard label="Savings Rate" value={formatPercent(result.savingsRate)} tone="green" />
                  </div>
                </SectionCard>

                {chartSegments.length > 0 && (
                  <SectionCard icon="🥧" title="Visual Breakdown">
                    <p className="exb-card-sub">Where your income goes, by category</p>
                    <div className="exb-chart-wrap">
                      <DoughnutChart segments={chartSegments} centerLabel={formatPercent(result.expenseRatio)} centerSubLabel="of Income" />
                    </div>

                    {allocation && (
                      <div className="exb-allocation">
                        <div className="exb-card-title" style={{ fontSize: '0.82rem', marginBottom: 10 }}>Income Allocation</div>
                        {allocation.map((a) => (
                          <div key={a.id} className="exb-allocation-row">
                            <span className="exb-allocation-label">
                              <span aria-hidden="true" className="exb-allocation-dot" style={{ background: a.color }} />
                              {a.label}
                            </span>
                            <span className="exb-allocation-value">
                              <span className="exb-allocation-pct">{a.pct.toFixed(1)}%</span>
                              <span className="exb-allocation-amt">{formatCurrency(perPeriod(a.value, incomePeriod), currency)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {show503020 && comparison503020 && (
                      <div className="exb-table-scroll" style={{ marginTop: 16 }}>
                        <table className="exb-table">
                          <thead>
                            <tr><th>50/30/20 Category</th><th>Guideline</th><th>Your Actual</th></tr>
                          </thead>
                          <tbody>
                            {comparison503020.map((row) => (
                              <tr key={row.id}>
                                <td>{row.label}</td>
                                <td>{row.guideline}%</td>
                                <td className={row.actual > row.guideline ? 'exb-over-cell' : 'exb-under-cell'}>{row.actual.toFixed(1)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </SectionCard>
                )}

                {ranked.length > 0 && (
                  <SectionCard icon="📋" title="Expense Breakdown">
                    <p className="exb-card-sub">Ranked from highest to lowest</p>
                    {ranked.map((c) => (
                      <div key={c.id} className="exb-rank-row">
                        <span className="exb-rank-num">{c.rank}</span>
                        <span className="exb-rank-name">{c.name || 'Category'} {c.isLargest && <span className="exb-badge">largest</span>}</span>
                        <span className="exb-rank-amount">{formatCurrency(perPeriod(c.annualAmount, incomePeriod), currency)}</span>
                        <span className="exb-rank-pct">{c.pctOfExpenses.toFixed(1)}%</span>
                      </div>
                    ))}
                  </SectionCard>
                )}

                <SectionCard icon="🔁" title="Period Conversion">
                  <p className="exb-card-sub">Weekly, monthly, and yearly view of your budget</p>
                  <div className="exb-table-scroll">
                    <table className="exb-table">
                      <thead>
                        <tr><th>Period</th><th>Income</th><th>Expenses</th><th>Balance</th></tr>
                      </thead>
                      <tbody>
                        {periodTable.map((row) => (
                          <tr key={row.id} className={row.id === incomePeriod ? 'exb-row-active' : ''}>
                            <td>{row.label}</td>
                            <td>{formatCurrency(row.income, currency)}</td>
                            <td>{formatCurrency(row.expenses, currency)}</td>
                            <td className={row.balance < 0 ? 'exb-negative-cell' : 'exb-net-cell'}>{formatCurrency(row.balance, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                {insights.length > 0 && (
                  <SectionCard icon="⭐" title="Budget Insights">
                    {insights.map((ins) => (
                      <div key={ins.id} className="exb-insight-row">
                        <span aria-hidden="true" className="exb-insight-icon">{INSIGHT_ICONS[ins.icon] || '💡'}</span>
                        <div>
                          <div className="exb-insight-text">{ins.text}</div>
                          <div className="exb-insight-detail">{ins.detail}</div>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                )}
              </>
            )}
          </div>

          {result.hasResults && (
            <ExportBar
              captureRef={summaryRef}
              fileNamePrefix={currency.replace(/[^A-Za-z0-9]/g, '') || 'budget'}
              fileNameSuffix="budget-summary"
              shareTitle="My Budget Summary"
              buildText={() => buildBudgetSummaryText(result, budgetStatus, incomePeriod, periodLabel, currency)}
              onDownloadPdf={() => generateFinancialReportPdf(buildBudgetReportData({ result, budgetStatus, allocation, ranked, periodTable, incomePeriod, periodLabel, currency, insights }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const EXB_STYLES = `
  .exb-root { --exb-blue: #2563EB; --exb-purple: #7C3AED; color: #0F172A; }
  .exb-topbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .exb-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; }
  .exb-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .exb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .exb-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .exb-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .exb-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .exb-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .exb-card-sub { font-size: 0.75rem; color: #94A3B8; margin: 2px 0 14px; }

  .exb-label { font-size: 0.72rem; font-weight: 600; color: #475569; display: block; margin-bottom: 5px; }
  .exb-field-row { display: flex; gap: 10px; }
  .exb-select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; background: #fff; text-overflow: ellipsis; }

  .exb-add-btn { margin-top: 4px; font-size: 0.8rem; color: #2563EB; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-weight: 600; }
  .exb-reset-btn { align-self: flex-start; font-size: 0.78rem; color: #64748B; background: #fff; border: 1px solid #E2E8F0; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-weight: 600; }
  .exb-warning-banner { font-size: 0.78rem; color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }

  .exb-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: #334155; font-weight: 600; }

  .exb-disclaimer { font-size: 0.75rem; color: #64748B; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; }

  .exb-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 60px 24px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; color: #64748B; font-size: 0.88rem; }

  .exb-live-badge { font-size: 0.68rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 999px; padding: 3px 10px; }

  .exb-hero { background: linear-gradient(135deg, #2563EB, #7C3AED); border-radius: 14px; padding: 22px 24px; margin-bottom: 14px; color: #fff; text-align: center; }
  .exb-hero-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.75); margin-bottom: 8px; }
  .exb-hero-value { font-size: 2.1rem; font-weight: 900; line-height: 1.1; }
  .exb-hero-sub { font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 6px; }

  .exb-status-banner { display: flex; flex-direction: column; gap: 2px; border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; }
  .exb-status-label { font-size: 0.82rem; font-weight: 800; }
  .exb-status-detail { font-size: 0.74rem; }
  .exb-status-green { background: #ECFDF5; border: 1px solid #A7F3D0; }
  .exb-status-green .exb-status-label { color: #059669; }
  .exb-status-green .exb-status-detail { color: #047857; }
  .exb-status-amber { background: #FFFBEB; border: 1px solid #FDE68A; }
  .exb-status-amber .exb-status-label { color: #B45309; }
  .exb-status-amber .exb-status-detail { color: #92400E; }
  .exb-status-red { background: #FEF2F2; border: 1px solid #FECACA; }
  .exb-status-red .exb-status-label { color: #DC2626; }
  .exb-status-red .exb-status-detail { color: #991B1B; }

  .exb-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .exb-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 14px; }
  .exb-stat-label { font-size: 0.7rem; color: #64748B; font-weight: 600; margin-bottom: 4px; }
  .exb-stat-value { font-size: 1.05rem; font-weight: 800; color: #0F172A; }
  .exb-stat-blue .exb-stat-value { color: #2563EB; }
  .exb-stat-red .exb-stat-value { color: #DC2626; }
  .exb-stat-amber .exb-stat-value { color: #D97706; }
  .exb-stat-purple .exb-stat-value { color: #7C3AED; }
  .exb-stat-green .exb-stat-value { color: #059669; }

  .exb-chart-wrap { padding-top: 4px; }

  .exb-allocation { border-top: 1px solid #F1F5F9; margin-top: 18px; padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
  .exb-allocation-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.82rem; }
  .exb-allocation-label { display: flex; align-items: center; gap: 8px; color: #334155; }
  .exb-allocation-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .exb-allocation-value { display: flex; gap: 10px; }
  .exb-allocation-pct { color: #94A3B8; font-variant-numeric: tabular-nums; }
  .exb-allocation-amt { font-weight: 600; color: #0F172A; font-variant-numeric: tabular-nums; }

  .exb-rank-row { display: grid; grid-template-columns: 24px 1fr auto auto; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 0.85rem; }
  .exb-rank-row:last-child { border-bottom: none; }
  .exb-rank-num { color: #94A3B8; font-weight: 700; font-size: 0.78rem; }
  .exb-rank-name { color: #0F172A; font-weight: 600; min-width: 0; }
  .exb-rank-amount { font-weight: 700; color: #0F172A; font-variant-numeric: tabular-nums; }
  .exb-rank-pct { color: #94A3B8; font-size: 0.78rem; width: 44px; text-align: right; }
  .exb-badge { font-size: 0.6rem; font-weight: 700; color: #7C3AED; background: #F5F3FF; border-radius: 999px; padding: 2px 8px; margin-left: 6px; text-transform: uppercase; letter-spacing: .04em; }

  .exb-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .exb-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 380px; }
  .exb-table th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94A3B8; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #E7EAF0; }
  .exb-table td { padding: 10px; border-bottom: 1px solid #F1F5F9; color: #334155; }
  .exb-table tr.exb-row-active { background: #EFF6FF; }
  .exb-table tr.exb-row-active td:first-child { color: #2563EB; font-weight: 700; border-left: 3px solid #2563EB; }
  .exb-net-cell { font-weight: 700; color: #059669; }
  .exb-negative-cell { font-weight: 700; color: #DC2626; }
  .exb-over-cell { font-weight: 700; color: #DC2626; }
  .exb-under-cell { font-weight: 700; color: #059669; }

  .exb-insight-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F1F5F9; }
  .exb-insight-row:last-child { border-bottom: none; padding-bottom: 0; }
  .exb-insight-icon { font-size: 1.2rem; flex-shrink: 0; }
  .exb-insight-text { font-size: 0.85rem; font-weight: 600; color: #0F172A; }
  .exb-insight-detail { font-size: 0.76rem; color: #64748B; margin-top: 2px; }

  @media (max-width: 860px) {
    .exb-grid { grid-template-columns: 1fr; }
    .exb-stat-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 480px) {
    .exb-stat-grid { grid-template-columns: 1fr; }
    .exb-hero-value { font-size: 1.7rem; }
    .exb-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
  }

  @media print {
    .exb-topbar { display: none; }
    .exb-hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .exb-root button:focus-visible, .exb-root input:focus-visible, .exb-root select:focus-visible {
    outline: 2px solid #2563EB; outline-offset: 2px;
  }
`;
