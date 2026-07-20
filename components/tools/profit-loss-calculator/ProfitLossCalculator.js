'use client';

import { useMemo, useRef, useState } from 'react';
import NumberInput from '../salary-calculator/NumberInput';
import DoughnutChart from '../salary-calculator/DoughnutChart';
import ExportBar from '../salary-calculator/ExportBar';
import { POPULAR_CURRENCIES, OTHER_CURRENCIES, symbolForCode } from '../salary-calculator/currencies';
import { formatCurrency, formatPercent } from '../salary-calculator/format';
import CostRow from './CostRow';
import { buildPLSummaryText } from './exportText';
import { buildPLReportData } from './reportData';
import { generateFinancialReportPdf } from '../financial-shared/FinancialReport';
import {
  OPEX_FIELDS, computeSimple, computeDetailed, buildExpenseBreakdown, buildStatus,
  computeBreakEven, computePricing, comparePeriods, buildInsights, computeWhatIf, buildWhatIfInsight, num,
} from './calculations';

const INSIGHT_ICONS = { profit: '📈', loss: '📉', expense: '💸', percent: '➗', target: '🎯', tag: '🏷️' };
const STATUS_TONE_CLASS = { green: 'pl2-status-green', amber: 'pl2-status-amber', red: 'pl2-status-red' };

function SectionCard({ icon, title, action, children }) {
  return (
    <div className="pl2-card">
      <div className="pl2-card-head">
        <span className="pl2-card-title"><span aria-hidden="true">{icon}</span> {title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

// formatCurrency() always shows an absolute value (correct for the stat
// cards, which pair it with an explicit "Net Profit"/"Net Loss" label) —
// the comparison table has no such separate label per cell, so a negative
// Gross/Net Profit needs its own minus sign here or it would silently
// display as if it were positive.
function formatSignedCurrency(amount, currency) {
  return `${amount < 0 ? '-' : ''}${formatCurrency(amount, currency)}`;
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`pl2-stat pl2-stat-${tone || 'default'}`}>
      <div className="pl2-stat-label">{label}</div>
      <div className="pl2-stat-value">{value}</div>
    </div>
  );
}

let nextExpenseId = 1;

const DEFAULT_OPEX_VALUES = Object.fromEntries(OPEX_FIELDS.map((f) => [f.id, { mode: 'fixed', value: '' }]));

export default function ProfitLossCalculator() {
  const [mode, setMode] = useState('simple');
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const currency = symbolForCode(currencyCode);

  // Simple mode
  const [revenue, setRevenue] = useState('');
  const [totalCost, setTotalCost] = useState('');

  // Detailed mode
  const [salesRevenue, setSalesRevenue] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [cogs, setCogs] = useState('');
  const [opexValues, setOpexValues] = useState(DEFAULT_OPEX_VALUES);
  const [customExpenses, setCustomExpenses] = useState([]);

  // Break-even (optional, independent of mode)
  const [breakEvenOpen, setBreakEvenOpen] = useState(false);
  const [fixedCosts, setFixedCosts] = useState('');
  const [sellingPriceUnit, setSellingPriceUnit] = useState('');
  const [variableCostUnit, setVariableCostUnit] = useState('');

  // Pricing insight (optional, independent of mode)
  const [pricingOpen, setPricingOpen] = useState(false);
  const [pricingSubMode, setPricingSubMode] = useState('margin');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [targetMarginPct, setTargetMarginPct] = useState('');
  const [pricingSellingPrice, setPricingSellingPrice] = useState('');

  // Comparison (optional, independent of mode)
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [prevRevenue, setPrevRevenue] = useState('');
  const [prevTotalCosts, setPrevTotalCosts] = useState('');
  const [prevGrossProfit, setPrevGrossProfit] = useState('');
  const [prevNetProfit, setPrevNetProfit] = useState('');

  // What-If Simulator (optional, independent of mode) — these never touch
  // the actual input state above; they're purely levers into computeWhatIf.
  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [revenueDeltaPct, setRevenueDeltaPct] = useState('');
  const [revenueDeltaDirection, setRevenueDeltaDirection] = useState('increase');
  const [priceDeltaPct, setPriceDeltaPct] = useState('');
  const [priceDeltaDirection, setPriceDeltaDirection] = useState('increase');
  const [expenseDeltaAmount, setExpenseDeltaAmount] = useState('');
  const [expenseDeltaDirection, setExpenseDeltaDirection] = useState('reduce');
  const [cogsDeltaPct, setCogsDeltaPct] = useState('');
  const [cogsDeltaDirection, setCogsDeltaDirection] = useState('reduce');

  const summaryRef = useRef(null);

  function updateOpex(id, key, val) {
    setOpexValues((prev) => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  }
  function addCustomExpense() {
    setCustomExpenses((prev) => [...prev, { id: nextExpenseId++, name: '', mode: 'fixed', value: '' }]);
  }
  function updateCustomExpense(id, key, val) {
    setCustomExpenses((prev) => prev.map((c) => (c.id === id ? { ...c, [key]: val } : c)));
  }
  function removeCustomExpense(id) {
    setCustomExpenses((prev) => prev.filter((c) => c.id !== id));
  }

  const duplicateExpenseNames = useMemo(() => {
    const seen = new Map();
    for (const c of customExpenses) {
      const key = (c.name || '').trim().toLowerCase();
      if (!key) continue;
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    return [...seen.values()].some((count) => count > 1);
  }, [customExpenses]);

  const result = useMemo(
    () => (mode === 'simple' ? computeSimple({ revenue, totalCost }) : computeDetailed({ salesRevenue, otherIncome, cogs, opexValues, customExpenses })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, revenue, totalCost, salesRevenue, otherIncome, cogs, opexValues, customExpenses]
  );

  const breakdown = useMemo(() => buildExpenseBreakdown(result), [result]);
  const status = useMemo(() => buildStatus(result), [result]);
  const breakEven = useMemo(
    () => (breakEvenOpen ? computeBreakEven({ fixedCosts, sellingPrice: sellingPriceUnit, variableCost: variableCostUnit }) : { hasResults: false }),
    [breakEvenOpen, fixedCosts, sellingPriceUnit, variableCostUnit]
  );
  const pricing = useMemo(
    () => (pricingOpen ? computePricing({ costPerUnit, targetMarginPct, sellingPrice: pricingSubMode === 'price' ? pricingSellingPrice : '' }) : { hasResults: false }),
    [pricingOpen, pricingSubMode, costPerUnit, targetMarginPct, pricingSellingPrice]
  );
  const comparison = useMemo(
    () => (comparisonOpen ? comparePeriods(result, { revenue: prevRevenue, totalCosts: prevTotalCosts, grossProfit: prevGrossProfit, netProfit: prevNetProfit }) : null),
    [comparisonOpen, result, prevRevenue, prevTotalCosts, prevGrossProfit, prevNetProfit]
  );
  // NumberInput strips any "-" a person types (an app-wide convention to
  // prevent stray negative entries), so every What-If lever pairs a
  // magnitude-only input with its own direction toggle here rather than
  // relying on the user typing a negative percentage directly.
  const whatIfDeltas = useMemo(() => ({
    revenueDeltaPct: revenueDeltaPct ? (revenueDeltaDirection === 'decrease' ? -Math.abs(num(revenueDeltaPct)) : Math.abs(num(revenueDeltaPct))) : '',
    priceDeltaPct: priceDeltaPct ? (priceDeltaDirection === 'decrease' ? -Math.abs(num(priceDeltaPct)) : Math.abs(num(priceDeltaPct))) : '',
    cogsDeltaPct: cogsDeltaPct ? (cogsDeltaDirection === 'decrease' ? -Math.abs(num(cogsDeltaPct)) : Math.abs(num(cogsDeltaPct))) : '',
    expenseDeltaAmount: expenseDeltaAmount ? (expenseDeltaDirection === 'reduce' ? -Math.abs(num(expenseDeltaAmount)) : Math.abs(num(expenseDeltaAmount))) : '',
  }), [revenueDeltaPct, revenueDeltaDirection, priceDeltaPct, priceDeltaDirection, cogsDeltaPct, cogsDeltaDirection, expenseDeltaAmount, expenseDeltaDirection]);
  const whatIfResult = useMemo(
    () => (whatIfOpen ? computeWhatIf(result, whatIfDeltas) : { hasResults: false }),
    [whatIfOpen, result, whatIfDeltas]
  );
  const whatIfInsight = useMemo(() => buildWhatIfInsight(result, whatIfResult, whatIfDeltas), [result, whatIfResult, whatIfDeltas]);

  const insights = useMemo(() => {
    const base = buildInsights(result, { breakdown, breakEven, pricing });
    return whatIfInsight ? [...base, whatIfInsight] : base;
  }, [result, breakdown, breakEven, pricing, whatIfInsight]);

  const totalCosts = result.totalCosts;
  const isLoss = result.netProfit < 0;

  const chartSegments = result.mode === 'detailed'
    ? (isLoss
        ? [result.cogs > 0 && { label: 'Cost of Goods Sold', value: result.cogs, color: '#F59E0B', displayValue: formatCurrency(result.cogs, currency) }, result.operatingExpensesTotal > 0 && { label: 'Operating Expenses', value: result.operatingExpensesTotal, color: '#DC2626', displayValue: formatCurrency(result.operatingExpensesTotal, currency) }].filter(Boolean)
        : [result.cogs > 0 && { label: 'Cost of Goods Sold', value: result.cogs, color: '#F59E0B', displayValue: formatCurrency(result.cogs, currency) }, result.operatingExpensesTotal > 0 && { label: 'Operating Expenses', value: result.operatingExpensesTotal, color: '#7C3AED', displayValue: formatCurrency(result.operatingExpensesTotal, currency) }, { label: 'Net Profit', value: result.netProfit, color: '#059669', displayValue: formatCurrency(result.netProfit, currency) }].filter(Boolean))
    : (isLoss
        ? [{ label: 'Total Costs', value: totalCosts, color: '#DC2626', displayValue: formatCurrency(totalCosts, currency) }]
        : [totalCosts > 0 && { label: 'Total Costs', value: totalCosts, color: '#F59E0B', displayValue: formatCurrency(totalCosts, currency) }, { label: 'Net Profit', value: result.netProfit, color: '#059669', displayValue: formatCurrency(result.netProfit, currency) }].filter(Boolean));

  const allocation = result.mode === 'detailed' && result.totalRevenue > 0 ? [
    result.cogs > 0 && { label: 'Direct Costs', value: result.cogs, pct: (result.cogs / result.totalRevenue) * 100, color: '#F59E0B' },
    result.operatingExpensesTotal > 0 && { label: 'Operating Costs', value: result.operatingExpensesTotal, pct: (result.operatingExpensesTotal / result.totalRevenue) * 100, color: '#7C3AED' },
    !isLoss && { label: 'Profit Retained', value: result.netProfit, pct: (result.netProfit / result.totalRevenue) * 100, color: '#059669' },
  ].filter(Boolean) : [];

  return (
    <div className="pl2-root">
      <style>{PL2_STYLES}</style>

      <div className="pl2-topbar no-print">
        <span className="pl2-privacy" title="Every calculation happens in your browser — nothing is sent to a server or stored.">
          🔒 100% Private <span className="pl2-privacy-sub">Your business figures are processed locally and are not stored</span>
        </span>
      </div>

      <div className="pl2-grid">
        {/* ---------------- LEFT: inputs ---------------- */}
        <div className="pl2-col no-print">
          <SectionCard icon="📒" title="Profit & Loss">
            <p className="pl2-card-sub">Choose Simple for a quick answer, or Detailed for a full breakdown.</p>
            <div role="radiogroup" aria-label="Calculation mode" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <button role="radio" aria-checked={mode === 'simple'} className={`pl2-pill ${mode === 'simple' ? 'active' : ''}`} onClick={() => setMode('simple')}>Simple</button>
              <button role="radio" aria-checked={mode === 'detailed'} className={`pl2-pill ${mode === 'detailed' ? 'active' : ''}`} onClick={() => setMode('detailed')}>Business</button>
            </div>

            <label className="pl2-label" htmlFor="pl2-currency">Currency</label>
            <select id="pl2-currency" className="pl2-select" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} aria-label="Currency" style={{ marginBottom: 12 }}>
              <optgroup label="Popular">{POPULAR_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}</optgroup>
              <optgroup label="All Currencies">{OTHER_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}</optgroup>
            </select>

            {mode === 'simple' ? (
              <div className="pl2-field-row">
                <div style={{ flex: 1 }}>
                  <label className="pl2-label">Revenue</label>
                  <NumberInput ariaLabel="Revenue" value={revenue} onChange={setRevenue} placeholder="e.g. 1,000,000" prefix={currency} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="pl2-label">Total Cost</label>
                  <NumberInput ariaLabel="Total cost" value={totalCost} onChange={setTotalCost} placeholder="e.g. 700,000" prefix={currency} />
                </div>
              </div>
            ) : (
              <>
                <div className="pl2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Revenue</label>
                    <NumberInput ariaLabel="Business revenue" value={salesRevenue} onChange={setSalesRevenue} placeholder="e.g. 1,000,000" prefix={currency} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Other Income</label>
                    <NumberInput ariaLabel="Other income" value={otherIncome} onChange={setOtherIncome} placeholder="0.00" prefix={currency} />
                  </div>
                </div>
                <label className="pl2-label" style={{ marginTop: 12 }}>Cost of Goods Sold</label>
                <NumberInput ariaLabel="Cost of goods sold" value={cogs} onChange={setCogs} placeholder="e.g. 400,000" prefix={currency} />

                <div className="pl2-subheading" style={{ marginTop: 18 }}>Operating Expenses</div>
                {OPEX_FIELDS.map((f) => (
                  <CostRow key={f.id} label={f.label} item={opexValues[f.id]} currency={currency} revenueBase={result.mode === 'detailed' ? result.totalRevenue : 0} onChange={(key, val) => updateOpex(f.id, key, val)} showRemove={false} />
                ))}

                {duplicateExpenseNames && (
                  <div role="alert" className="pl2-warning-banner">⚠️ Two or more custom expenses share the same name — totals are still accurate, but the breakdown below may be easier to read if you rename them.</div>
                )}
                {customExpenses.map((c) => (
                  <CostRow
                    key={c.id}
                    editableName={c.name}
                    onNameChange={(v) => updateCustomExpense(c.id, 'name', v)}
                    item={c}
                    currency={currency}
                    revenueBase={result.mode === 'detailed' ? result.totalRevenue : 0}
                    onChange={(key, val) => updateCustomExpense(c.id, key, val)}
                    onRemove={() => removeCustomExpense(c.id)}
                    showRemove
                  />
                ))}
                <button className="pl2-add-btn" onClick={addCustomExpense}>➕ Add Custom Expense</button>
              </>
            )}
          </SectionCard>

          <div className="pl2-card">
            <button className="pl2-collapsible-head" onClick={() => setBreakEvenOpen((v) => !v)} aria-expanded={breakEvenOpen}>
              <span className="pl2-card-title"><span aria-hidden="true">⚖️</span> Break-even Analysis {breakEven.hasResults && <span className="pl2-badge">active</span>}</span>
              <span aria-hidden="true" className={`pl2-chevron ${breakEvenOpen ? 'open' : ''}`}>▾</span>
            </button>
            {breakEvenOpen && (
              <div className="pl2-collapsible-body">
                <p className="pl2-card-sub">Precise, product-level break-even — separate from the revenue-based estimate above.</p>
                <label className="pl2-label">Fixed Costs</label>
                <NumberInput ariaLabel="Break-even fixed costs" value={fixedCosts} onChange={setFixedCosts} placeholder="0.00" prefix={currency} />
                <div className="pl2-field-row" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Selling Price / Unit</label>
                    <NumberInput ariaLabel="Selling price per unit" value={sellingPriceUnit} onChange={setSellingPriceUnit} placeholder="0.00" prefix={currency} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Variable Cost / Unit</label>
                    <NumberInput ariaLabel="Variable cost per unit" value={variableCostUnit} onChange={setVariableCostUnit} placeholder="0.00" prefix={currency} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pl2-card">
            <button className="pl2-collapsible-head" onClick={() => setPricingOpen((v) => !v)} aria-expanded={pricingOpen}>
              <span className="pl2-card-title"><span aria-hidden="true">🏷️</span> Pricing Insight {pricing.hasResults && <span className="pl2-badge">active</span>}</span>
              <span aria-hidden="true" className={`pl2-chevron ${pricingOpen ? 'open' : ''}`}>▾</span>
            </button>
            {pricingOpen && (
              <div className="pl2-collapsible-body">
                <p className="pl2-card-sub">Work out a selling price, or check the margin at a price you're considering.</p>
                <label className="pl2-label">Cost per Unit</label>
                <NumberInput ariaLabel="Cost per unit" value={costPerUnit} onChange={setCostPerUnit} placeholder="0.00" prefix={currency} />
                <div role="radiogroup" aria-label="Pricing insight mode" style={{ display: 'flex', gap: 6, margin: '12px 0' }}>
                  <button role="radio" aria-checked={pricingSubMode === 'margin'} className={`pl2-pill ${pricingSubMode === 'margin' ? 'active' : ''}`} onClick={() => setPricingSubMode('margin')}>I want a target margin</button>
                  <button role="radio" aria-checked={pricingSubMode === 'price'} className={`pl2-pill ${pricingSubMode === 'price' ? 'active' : ''}`} onClick={() => setPricingSubMode('price')}>I have a selling price</button>
                </div>
                {pricingSubMode === 'margin' ? (
                  <NumberInput ariaLabel="Desired profit margin" value={targetMarginPct} onChange={setTargetMarginPct} placeholder="e.g. 30" suffix="%" />
                ) : (
                  <NumberInput ariaLabel="Selling price to check" value={pricingSellingPrice} onChange={setPricingSellingPrice} placeholder="0.00" prefix={currency} />
                )}
              </div>
            )}
          </div>

          <div className="pl2-card">
            <button className="pl2-collapsible-head" onClick={() => setComparisonOpen((v) => !v)} aria-expanded={comparisonOpen}>
              <span className="pl2-card-title"><span aria-hidden="true">🔁</span> Compare to Previous Period {comparison && <span className="pl2-badge">active</span>}</span>
              <span aria-hidden="true" className={`pl2-chevron ${comparisonOpen ? 'open' : ''}`}>▾</span>
            </button>
            {comparisonOpen && (
              <div className="pl2-collapsible-body">
                <p className="pl2-card-sub">Enter your previous period's headline figures to compare against this one.</p>
                <div className="pl2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Previous Revenue</label>
                    <NumberInput ariaLabel="Previous period revenue" value={prevRevenue} onChange={setPrevRevenue} placeholder="0.00" prefix={currency} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Previous Total Costs</label>
                    <NumberInput ariaLabel="Previous period total costs" value={prevTotalCosts} onChange={setPrevTotalCosts} placeholder="0.00" prefix={currency} />
                  </div>
                </div>
                <div className="pl2-field-row" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Previous Gross Profit</label>
                    <NumberInput ariaLabel="Previous period gross profit" value={prevGrossProfit} onChange={setPrevGrossProfit} placeholder="0.00" prefix={currency} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Previous Net Profit</label>
                    <NumberInput ariaLabel="Previous period net profit" value={prevNetProfit} onChange={setPrevNetProfit} placeholder="0.00" prefix={currency} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pl2-card">
            <button className="pl2-collapsible-head" onClick={() => setWhatIfOpen((v) => !v)} aria-expanded={whatIfOpen}>
              <span className="pl2-card-title"><span aria-hidden="true">🧪</span> What-If Simulator {whatIfResult.hasResults && <span className="pl2-badge">active</span>}</span>
              <span aria-hidden="true" className={`pl2-chevron ${whatIfOpen ? 'open' : ''}`}>▾</span>
            </button>
            {whatIfOpen && (
              <div className="pl2-collapsible-body">
                <p className="pl2-card-sub">Test a scenario without changing your actual figures above — only Projected results move.</p>
                <div className="pl2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Revenue Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="pl2-select" style={{ width: 100, flexShrink: 0 }} value={revenueDeltaDirection} onChange={(e) => setRevenueDeltaDirection(e.target.value)} aria-label="Revenue change direction">
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                      <NumberInput ariaLabel="Revenue change percent" value={revenueDeltaPct} onChange={setRevenueDeltaPct} placeholder="e.g. 10" suffix="%" />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Selling Price Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="pl2-select" style={{ width: 100, flexShrink: 0 }} value={priceDeltaDirection} onChange={(e) => setPriceDeltaDirection(e.target.value)} aria-label="Selling price change direction">
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                      <NumberInput ariaLabel="Selling price change percent" value={priceDeltaPct} onChange={setPriceDeltaPct} placeholder="e.g. 5" suffix="%" />
                    </div>
                  </div>
                </div>
                <div className="pl2-field-row" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Cost of Goods Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="pl2-select" style={{ width: 100, flexShrink: 0 }} value={cogsDeltaDirection} onChange={(e) => setCogsDeltaDirection(e.target.value)} aria-label="Cost of goods change direction">
                        <option value="decrease">Decrease</option>
                        <option value="increase">Increase</option>
                      </select>
                      <NumberInput ariaLabel="Cost of goods change percent" value={cogsDeltaPct} onChange={setCogsDeltaPct} placeholder="e.g. 8" suffix="%" />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="pl2-label">Expense Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="pl2-select" style={{ width: 100, flexShrink: 0 }} value={expenseDeltaDirection} onChange={(e) => setExpenseDeltaDirection(e.target.value)} aria-label="Expense change direction">
                        <option value="reduce">Reduce</option>
                        <option value="increase">Increase</option>
                      </select>
                      <NumberInput ariaLabel="Expense change amount" value={expenseDeltaAmount} onChange={setExpenseDeltaAmount} placeholder="0.00" prefix={currency} />
                    </div>
                  </div>
                </div>
                <p className="pl2-card-sub" style={{ marginTop: 10, marginBottom: 0 }}>Selling Price Change applies only to Revenue (not Other Income) — Revenue Change applies to everything, so the two can be combined.</p>
              </div>
            )}
          </div>

          <p className="pl2-disclaimer">💡 These calculations are estimates based on the figures you enter. They are not accounting or tax advice.</p>
        </div>

        {/* ---------------- RIGHT: live summary ---------------- */}
        <div className="pl2-col">
          <div ref={summaryRef} className="pl2-summary-capture">
            {!result.hasResults ? (
              <div className="pl2-empty-state">
                <span aria-hidden="true" style={{ fontSize: '2rem' }}>📊</span>
                <p>Enter your revenue and costs to see your live profit & loss breakdown.</p>
              </div>
            ) : (
              <>
                <SectionCard icon="📊" title="Your P&L Overview" action={<span className="pl2-live-badge">● Live</span>}>
                  <p className="pl2-card-sub">Live calculation based on your inputs</p>

                  <div className={`pl2-hero ${isLoss ? 'pl2-hero-loss' : ''}`}>
                    <div className="pl2-hero-label">{isLoss ? 'Net Loss' : 'Net Profit'}</div>
                    <div className="pl2-hero-value">{formatCurrency(Math.abs(result.netProfit), currency)}</div>
                    <div className="pl2-hero-sub">Net Margin {formatPercent(result.netMargin)}</div>
                  </div>

                  {status && (
                    <div className={`pl2-status-banner ${STATUS_TONE_CLASS[status.tone]}`}>
                      <span className="pl2-status-label">{status.label}</span>
                      <span className="pl2-status-detail">{status.detail}</span>
                    </div>
                  )}

                  <div className="pl2-stat-grid">
                    <StatCard label="Total Revenue" value={formatCurrency(result.totalRevenue, currency)} tone="blue" />
                    <StatCard label="Total Costs" value={formatCurrency(totalCosts, currency)} tone="red" />
                    <StatCard label="Gross Profit" value={formatCurrency(result.grossProfit, currency)} tone={result.grossProfit < 0 ? 'red' : 'green'} />
                    <StatCard label={isLoss ? 'Net Loss' : 'Net Profit'} value={formatCurrency(Math.abs(result.netProfit), currency)} tone={isLoss ? 'red' : 'green'} />
                    <StatCard label="Gross Margin" value={formatPercent(result.grossMargin)} tone="purple" />
                    <StatCard label="Net Margin" value={formatPercent(result.netMargin)} tone="purple" />
                    <StatCard label="Markup" value={formatPercent(result.markup)} tone="amber" />
                    {result.mode === 'detailed' && <StatCard label="Expense Ratio" value={formatPercent(result.expenseRatio)} tone="amber" />}
                    {result.mode === 'detailed' && result.breakEvenRevenue != null && <StatCard label="Break-even Revenue (est.)" value={formatCurrency(result.breakEvenRevenue, currency)} tone="default" />}
                  </div>

                  {chartSegments.length > 0 && (
                    <div className="pl2-chart-wrap">
                      <div className="pl2-card-title" style={{ marginBottom: 12 }}>Where the Money Goes</div>
                      <DoughnutChart segments={chartSegments} centerLabel={isLoss ? 'Loss' : formatPercent(result.netMargin)} centerSubLabel={isLoss ? formatCurrency(Math.abs(result.netProfit), currency) : 'Net Margin'} />
                      {isLoss && <p className="pl2-chart-note">Costs exceeded revenue by {formatCurrency(Math.abs(result.netProfit), currency)} — there's no profit segment to show.</p>}
                    </div>
                  )}

                  {allocation.length > 0 && (
                    <div className="pl2-allocation">
                      <div className="pl2-card-title" style={{ fontSize: '0.82rem', marginBottom: 10 }}>Revenue Allocation</div>
                      {allocation.map((a) => (
                        <div key={a.label} className="pl2-allocation-row">
                          <span className="pl2-allocation-label"><span aria-hidden="true" className="pl2-allocation-dot" style={{ background: a.color }} />{a.label}</span>
                          <span className="pl2-allocation-value"><span className="pl2-allocation-pct">{a.pct.toFixed(1)}%</span><span className="pl2-allocation-amt">{formatCurrency(a.value, currency)}</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>

                {breakdown.length > 0 && (
                  <SectionCard icon="📋" title="Expense Breakdown">
                    <p className="pl2-card-sub">Ranked from highest to lowest</p>
                    {breakdown.map((l) => (
                      <div key={l.id} className="pl2-rank-row">
                        <span className="pl2-rank-num">{l.rank}</span>
                        <span className="pl2-rank-name">{l.name} {l.isLargest && <span className="pl2-badge">largest</span>}</span>
                        <span className="pl2-rank-amount">{formatCurrency(l.amount, currency)}</span>
                        <span className="pl2-rank-pct">{l.pctOfCosts.toFixed(1)}%</span>
                      </div>
                    ))}
                  </SectionCard>
                )}

                {breakEven.hasResults && (
                  <SectionCard icon="⚖️" title="Break-even Analysis">
                    <p className="pl2-card-sub">Based on your fixed costs, price, and variable cost per unit</p>
                    <div className="pl2-stat-grid">
                      <StatCard label="Contribution / Unit" value={formatCurrency(breakEven.contributionPerUnit, currency)} tone={breakEven.contributionPerUnit < 0 ? 'red' : 'green'} />
                      <StatCard label="Contribution Margin" value={formatPercent(breakEven.contributionMargin)} tone="purple" />
                      <StatCard label="Break-even Units" value={breakEven.breakEvenUnits != null ? Math.ceil(breakEven.breakEvenUnits).toLocaleString() : 'Not reachable'} tone="blue" />
                      <StatCard label="Break-even Revenue" value={breakEven.breakEvenRevenue != null ? formatCurrency(breakEven.breakEvenRevenue, currency) : '—'} tone="blue" />
                    </div>
                    {breakEven.contributionPerUnit <= 0 && <p className="pl2-chart-note">Your variable cost is at or above your selling price — this product can't break even by volume alone.</p>}
                  </SectionCard>
                )}

                {pricing.hasResults && (
                  <SectionCard icon="🏷️" title="Pricing Insight">
                    {pricing.mode === 'from-margin' ? (
                      <div className="pl2-stat-grid">
                        <StatCard label="Recommended Selling Price" value={formatCurrency(pricing.recommendedPrice, currency)} tone="blue" />
                        <StatCard label="Profit / Unit" value={formatCurrency(pricing.profitPerUnit, currency)} tone="green" />
                        <StatCard label="Markup Required" value={formatPercent(pricing.markupPct)} tone="purple" />
                      </div>
                    ) : (
                      <div className="pl2-stat-grid">
                        <StatCard label="Resulting Margin" value={formatPercent(pricing.resultingMargin)} tone="purple" />
                        <StatCard label="Profit / Unit" value={formatCurrency(pricing.profitPerUnit, currency)} tone={pricing.profitPerUnit < 0 ? 'red' : 'green'} />
                        <StatCard label="Markup" value={formatPercent(pricing.markupPct)} tone="amber" />
                      </div>
                    )}
                  </SectionCard>
                )}

                {comparison && (
                  <SectionCard icon="🔁" title="vs Previous Period">
                    <div className="pl2-table-scroll">
                      <table className="pl2-table">
                        <thead><tr><th></th><th>Current</th><th>Previous</th><th>Change</th></tr></thead>
                        <tbody>
                          {comparison.map((r) => (
                            <tr key={r.id}>
                              <td>{r.label}</td>
                              <td>{r.isPct ? formatPercent(r.current) : formatSignedCurrency(r.current, currency)}</td>
                              <td>{r.isPct ? formatPercent(r.previous) : formatSignedCurrency(r.previous, currency)}</td>
                              <td className={r.status === 'improved' ? 'pl2-improved-cell' : r.status === 'declined' ? 'pl2-declined-cell' : ''}>
                                {r.change > 0 ? '▲' : r.change < 0 ? '▼' : '—'} {r.isPct ? `${Math.abs(r.change).toFixed(1)}pp` : formatCurrency(Math.abs(r.change), currency)}
                                {r.pctChange != null && <span className="pl2-change-pct"> ({r.pctChange >= 0 ? '+' : ''}{r.pctChange.toFixed(1)}%)</span>}
                                <span className="pl2-change-word"> {r.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {whatIfResult.hasResults && (
                  <SectionCard icon="🧪" title="What-If Simulator">
                    <p className="pl2-card-sub">Current vs Projected — your actual figures are unchanged</p>
                    <div className="pl2-table-scroll">
                      <table className="pl2-table">
                        <thead><tr><th></th><th>Current</th><th>Projected</th></tr></thead>
                        <tbody>
                          <tr><td>Total Revenue</td><td>{formatCurrency(result.totalRevenue, currency)}</td><td className="pl2-projected-cell">{formatCurrency(whatIfResult.totalRevenue, currency)}</td></tr>
                          <tr><td>Total Costs</td><td>{formatCurrency(result.totalCosts, currency)}</td><td className="pl2-projected-cell">{formatCurrency(whatIfResult.totalCosts, currency)}</td></tr>
                          <tr><td>Gross Profit</td><td>{formatSignedCurrency(result.grossProfit, currency)}</td><td className="pl2-projected-cell">{formatSignedCurrency(whatIfResult.grossProfit, currency)}</td></tr>
                          <tr><td>Net Profit</td><td>{formatSignedCurrency(result.netProfit, currency)}</td><td className="pl2-projected-cell">{formatSignedCurrency(whatIfResult.netProfit, currency)}</td></tr>
                          <tr><td>Net Margin</td><td>{formatPercent(result.netMargin)}</td><td className="pl2-projected-cell">{formatPercent(whatIfResult.netMargin)}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {insights.length > 0 && (
                  <SectionCard icon="⭐" title="Insights">
                    {insights.map((ins) => (
                      <div key={ins.id} className="pl2-insight-row">
                        <span aria-hidden="true" className="pl2-insight-icon">{INSIGHT_ICONS[ins.icon] || '💡'}</span>
                        <div>
                          <div className="pl2-insight-text">{ins.text}</div>
                          <div className="pl2-insight-detail">{ins.detail}</div>
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
              fileNamePrefix={currency.replace(/[^A-Za-z0-9]/g, '') || 'profit-loss'}
              fileNameSuffix="profit-loss-summary"
              shareTitle="My Profit & Loss Summary"
              buildText={() => buildPLSummaryText(result, currency, status, breakdown, breakEven, pricing, comparison, insights, whatIfResult)}
              onDownloadPdf={() => generateFinancialReportPdf(buildPLReportData({ result, currency, status, breakdown, breakEven, pricing, comparison, insights, whatIf: whatIfResult, chartSegments, allocation, totalCosts, isLoss }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const PL2_STYLES = `
  .pl2-root { --pl2-blue: #2563EB; --pl2-purple: #7C3AED; color: #0F172A; }
  .pl2-topbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .pl2-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; }
  .pl2-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .pl2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .pl2-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .pl2-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .pl2-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .pl2-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .pl2-card-sub { font-size: 0.75rem; color: #94A3B8; margin: 2px 0 14px; }
  .pl2-subheading { font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 10px; }

  .pl2-label { font-size: 0.72rem; font-weight: 600; color: #475569; display: block; margin-bottom: 5px; }
  .pl2-field-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .pl2-select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; background: #fff; }

  .pl2-pill { padding: 8px 14px; border-radius: 999px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.8rem; }
  .pl2-pill.active { border-color: #2563EB; background: #EFF6FF; color: #2563EB; }

  .pl2-collapsible-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
  .pl2-chevron { transition: transform 0.15s ease; color: #94A3B8; }
  .pl2-chevron.open { transform: rotate(180deg); }
  .pl2-collapsible-body { margin-top: 14px; }
  .pl2-badge { font-size: 0.6rem; font-weight: 700; color: #7C3AED; background: #F5F3FF; border-radius: 999px; padding: 2px 8px; margin-left: 8px; text-transform: uppercase; letter-spacing: .04em; }

  .pl2-add-btn { margin-top: 4px; font-size: 0.8rem; color: #2563EB; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-weight: 600; }
  .pl2-warning-banner { font-size: 0.78rem; color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; }
  .pl2-disclaimer { font-size: 0.75rem; color: #64748B; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; }

  .pl2-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 60px 24px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; color: #64748B; font-size: 0.88rem; }
  .pl2-live-badge { font-size: 0.68rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 999px; padding: 3px 10px; }

  .pl2-hero { background: linear-gradient(135deg, #2563EB, #7C3AED); border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; color: #fff; text-align: center; }
  .pl2-hero-loss { background: linear-gradient(135deg, #DC2626, #991B1B); }
  .pl2-hero-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.75); margin-bottom: 8px; }
  .pl2-hero-value { font-size: 2.1rem; font-weight: 900; line-height: 1.1; }
  .pl2-hero-sub { font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 6px; }

  .pl2-status-banner { display: flex; flex-direction: column; gap: 2px; border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; }
  .pl2-status-label { font-size: 0.82rem; font-weight: 800; }
  .pl2-status-detail { font-size: 0.74rem; }
  .pl2-status-green { background: #ECFDF5; border: 1px solid #A7F3D0; } .pl2-status-green .pl2-status-label { color: #059669; } .pl2-status-green .pl2-status-detail { color: #047857; }
  .pl2-status-amber { background: #FFFBEB; border: 1px solid #FDE68A; } .pl2-status-amber .pl2-status-label { color: #B45309; } .pl2-status-amber .pl2-status-detail { color: #92400E; }
  .pl2-status-red { background: #FEF2F2; border: 1px solid #FECACA; } .pl2-status-red .pl2-status-label { color: #DC2626; } .pl2-status-red .pl2-status-detail { color: #991B1B; }

  .pl2-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 4px; }
  .pl2-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 14px; }
  .pl2-stat-label { font-size: 0.7rem; color: #64748B; font-weight: 600; margin-bottom: 4px; }
  .pl2-stat-value { font-size: 1.02rem; font-weight: 800; color: #0F172A; }
  .pl2-stat-blue .pl2-stat-value { color: #2563EB; } .pl2-stat-red .pl2-stat-value { color: #DC2626; } .pl2-stat-amber .pl2-stat-value { color: #D97706; }
  .pl2-stat-purple .pl2-stat-value { color: #7C3AED; } .pl2-stat-green .pl2-stat-value { color: #059669; }

  .pl2-chart-wrap { border-top: 1px solid #F1F5F9; padding-top: 16px; margin-top: 16px; }
  .pl2-chart-note { font-size: 0.76rem; color: #991B1B; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 8px 10px; margin-top: 12px; }

  .pl2-allocation { border-top: 1px solid #F1F5F9; margin-top: 18px; padding-top: 16px; display: flex; flex-direction: column; gap: 10px; }
  .pl2-allocation-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 0.82rem; }
  .pl2-allocation-label { display: flex; align-items: center; gap: 8px; color: #334155; }
  .pl2-allocation-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .pl2-allocation-value { display: flex; gap: 10px; }
  .pl2-allocation-pct { color: #94A3B8; font-variant-numeric: tabular-nums; }
  .pl2-allocation-amt { font-weight: 600; color: #0F172A; font-variant-numeric: tabular-nums; }

  .pl2-rank-row { display: grid; grid-template-columns: 24px 1fr auto auto; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #F1F5F9; font-size: 0.85rem; }
  .pl2-rank-row:last-child { border-bottom: none; }
  .pl2-rank-num { color: #94A3B8; font-weight: 700; font-size: 0.78rem; }
  .pl2-rank-name { color: #0F172A; font-weight: 600; min-width: 0; }
  .pl2-rank-amount { font-weight: 700; color: #0F172A; font-variant-numeric: tabular-nums; }
  .pl2-rank-pct { color: #94A3B8; font-size: 0.78rem; width: 44px; text-align: right; }

  .pl2-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .pl2-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; min-width: 420px; }
  .pl2-table th { text-align: left; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94A3B8; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #E7EAF0; }
  .pl2-table td { padding: 10px; border-bottom: 1px solid #F1F5F9; color: #334155; }
  .pl2-improved-cell { color: #059669; font-weight: 700; }
  .pl2-declined-cell { color: #DC2626; font-weight: 700; }
  .pl2-projected-cell { color: #2563EB; font-weight: 700; background: #EFF6FF; }
  .pl2-change-pct { font-weight: 500; opacity: 0.85; }
  .pl2-change-word { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.03em; opacity: 0.7; }

  .pl2-insight-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F1F5F9; }
  .pl2-insight-row:last-child { border-bottom: none; padding-bottom: 0; }
  .pl2-insight-icon { font-size: 1.2rem; flex-shrink: 0; }
  .pl2-insight-text { font-size: 0.85rem; font-weight: 600; color: #0F172A; }
  .pl2-insight-detail { font-size: 0.76rem; color: #64748B; margin-top: 2px; }

  @media (max-width: 860px) {
    .pl2-grid { grid-template-columns: 1fr; }
    .pl2-stat-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 480px) {
    .pl2-stat-grid { grid-template-columns: 1fr; }
    .pl2-hero-value { font-size: 1.7rem; }
    .pl2-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
  }

  @media print {
    .pl2-topbar { display: none; }
    .pl2-hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .pl2-root button:focus-visible, .pl2-root input:focus-visible, .pl2-root select:focus-visible {
    outline: 2px solid #2563EB; outline-offset: 2px;
  }
`;
