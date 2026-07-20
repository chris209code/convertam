'use client';

import { useMemo, useRef, useState } from 'react';
import NumberInput from '../salary-calculator/NumberInput';
import DoughnutChart from '../salary-calculator/DoughnutChart';
import ExportBar from '../salary-calculator/ExportBar';
import { POPULAR_CURRENCIES, OTHER_CURRENCIES, symbolForCode } from '../salary-calculator/currencies';
import { formatCurrency, formatPercent } from '../salary-calculator/format';
import CostLineRow from './CostLineRow';
import BreakEvenChart from './BreakEvenChart';
import {
  defaultFixedCostRows, defaultVariableCostRows, computeBreakEven, buildChartSeries,
  computeWhatIf, buildWhatIfInsight, buildInsights,
} from './calculations';
import { buildBreakEvenSummaryText } from './exportText';
import { buildBreakEvenReportData } from './reportData';
import { generateFinancialReportPdf } from '../financial-shared/FinancialReport';

const INSIGHT_ICONS = { target: '🎯', warning: '⚠️', shield: '🛡️', trending: '📈', percent: '➗', chart: '📊' };
let rowSeq = 0;
const nextRowId = () => `custom-${Date.now()}-${rowSeq++}`;

function SectionCard({ icon, title, action, children }) {
  return (
    <div className="be2-card">
      <div className="be2-card-head">
        <span className="be2-card-title"><span aria-hidden="true">{icon}</span> {title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`be2-stat be2-stat-${tone || 'default'}`}>
      <div className="be2-stat-label">{label}</div>
      <div className="be2-stat-value">{value}</div>
    </div>
  );
}

export default function BreakEvenCalculator() {
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const currency = symbolForCode(currencyCode);

  const [sellingPrice, setSellingPrice] = useState('');
  const [expectedUnits, setExpectedUnits] = useState('');
  const [fixedCostRows, setFixedCostRows] = useState(defaultFixedCostRows);
  const [variableCostRows, setVariableCostRows] = useState(defaultVariableCostRows);

  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [priceDeltaPct, setPriceDeltaPct] = useState('');
  const [priceDeltaDirection, setPriceDeltaDirection] = useState('increase');
  const [variableCostDeltaPct, setVariableCostDeltaPct] = useState('');
  const [variableCostDeltaDirection, setVariableCostDeltaDirection] = useState('decrease');
  const [fixedCostDeltaPct, setFixedCostDeltaPct] = useState('');
  const [fixedCostDeltaDirection, setFixedCostDeltaDirection] = useState('decrease');
  const [projectedUnits, setProjectedUnits] = useState('');

  const summaryRef = useRef(null);

  function updateRow(setter, id, field, value) {
    setter((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }
  function removeRow(setter, id) {
    setter((rows) => rows.filter((r) => r.id !== id));
  }
  function addRow(setter, placeholder) {
    setter((rows) => [...rows, { id: nextRowId(), name: '', value: '' }]);
  }

  const result = useMemo(
    () => computeBreakEven({ fixedCostRows, variableCostRows, sellingPrice, expectedUnits }),
    [fixedCostRows, variableCostRows, sellingPrice, expectedUnits]
  );

  const whatIfDeltas = useMemo(() => ({
    priceDeltaPct: priceDeltaPct ? (priceDeltaDirection === 'decrease' ? -Math.abs(Number(priceDeltaPct)) : Math.abs(Number(priceDeltaPct))) : '',
    variableCostDeltaPct: variableCostDeltaPct ? (variableCostDeltaDirection === 'decrease' ? -Math.abs(Number(variableCostDeltaPct)) : Math.abs(Number(variableCostDeltaPct))) : '',
    fixedCostDeltaPct: fixedCostDeltaPct ? (fixedCostDeltaDirection === 'decrease' ? -Math.abs(Number(fixedCostDeltaPct)) : Math.abs(Number(fixedCostDeltaPct))) : '',
    projectedUnits,
  }), [priceDeltaPct, priceDeltaDirection, variableCostDeltaPct, variableCostDeltaDirection, fixedCostDeltaPct, fixedCostDeltaDirection, projectedUnits]);

  const whatIfResult = useMemo(
    () => (whatIfOpen ? computeWhatIf(result, whatIfDeltas) : { hasResults: false }),
    [whatIfOpen, result, whatIfDeltas]
  );
  const whatIfInsight = useMemo(() => buildWhatIfInsight(result, whatIfResult, whatIfDeltas), [result, whatIfResult, whatIfDeltas]);

  const insights = useMemo(() => {
    const base = buildInsights(result, { fixedCostRows, variableCostRows });
    return whatIfInsight ? [...base, whatIfInsight] : base;
  }, [result, fixedCostRows, variableCostRows, whatIfInsight]);

  const chartData = useMemo(() => buildChartSeries(result), [result]);

  const summarySegments = useMemo(() => {
    if (!result.hasResults || !result.canBreakEven) return [];
    const totalVariable = result.expectedUnits * result.variableCostPerUnit;
    return [
      result.fixedCosts > 0 && { label: 'Fixed Costs', value: result.fixedCosts, color: '#7C3AED', displayValue: formatCurrency(result.fixedCosts, currency) },
      totalVariable > 0 && { label: 'Variable Costs', value: totalVariable, color: '#F59E0B', displayValue: formatCurrency(totalVariable, currency) },
      result.expectedProfit > 0 && { label: 'Profit', value: result.expectedProfit, color: '#059669', displayValue: formatCurrency(result.expectedProfit, currency) },
    ].filter(Boolean);
  }, [result, currency]);

  return (
    <div className="be2-root">
      <style>{BE2_STYLES}</style>

      <div className="be2-topbar no-print">
        <span className="be2-privacy" title="Every calculation happens in your browser — nothing is sent to a server or stored.">
          🔒 100% Private <span className="be2-privacy-sub">Your business figures are processed locally and are not stored</span>
        </span>
      </div>

      <div className="be2-grid">
        {/* ---------------- LEFT: inputs ---------------- */}
        <div className="be2-col no-print">
          <SectionCard icon="📐" title="Core Inputs">
            <p className="be2-card-sub">Selling price, expected volume, and currency.</p>
            <div className="be2-field-row">
              <div style={{ width: 132, flexShrink: 0 }}>
                <label className="be2-label" htmlFor="be2-currency">Currency</label>
                <select id="be2-currency" className="be2-select" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} aria-label="Currency">
                  <optgroup label="Popular">
                    {POPULAR_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}
                  </optgroup>
                  <optgroup label="All Currencies">
                    {OTHER_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}
                  </optgroup>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="be2-label" htmlFor="be2-price">Selling Price per Unit</label>
                <NumberInput id="be2-price" ariaLabel="Selling price per unit" value={sellingPrice} onChange={setSellingPrice} placeholder="e.g. 5,000" prefix={currency} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="be2-label" htmlFor="be2-units">Expected Units Sold</label>
              <NumberInput id="be2-units" ariaLabel="Expected units sold" value={expectedUnits} onChange={setExpectedUnits} placeholder="e.g. 600" />
            </div>
            {Number(sellingPrice) > 0 && result.variableCostPerUnit > Number(sellingPrice) && (
              <div role="alert" className="be2-warning-banner" style={{ marginTop: 10 }}>
                Your variable cost per unit is higher than your selling price — break-even can't be reached until that changes.
              </div>
            )}
          </SectionCard>

          <SectionCard icon="🏢" title="Fixed Costs" action={<span className="be2-total-chip">{formatCurrency(result.fixedCosts, currency)}</span>}>
            <p className="be2-card-sub">Costs that stay the same regardless of how many units you sell.</p>
            {fixedCostRows.map((row) => (
              <CostLineRow key={row.id} row={row} currency={currency} onChange={(f, v) => updateRow(setFixedCostRows, row.id, f, v)} onRemove={() => removeRow(setFixedCostRows, row.id)} showRemove />
            ))}
            <button className="be2-add-btn" onClick={() => addRow(setFixedCostRows)}>+ Add Fixed Cost</button>
          </SectionCard>

          <SectionCard icon="📦" title="Variable Costs" action={<span className="be2-total-chip">{formatCurrency(result.variableCostPerUnit, currency)} / unit</span>}>
            <p className="be2-card-sub">Costs that scale with each unit produced or sold.</p>
            {variableCostRows.map((row) => (
              <CostLineRow key={row.id} row={row} currency={currency} unitLabel="/ unit" onChange={(f, v) => updateRow(setVariableCostRows, row.id, f, v)} onRemove={() => removeRow(setVariableCostRows, row.id)} showRemove />
            ))}
            <button className="be2-add-btn" onClick={() => addRow(setVariableCostRows)}>+ Add Variable Cost</button>
          </SectionCard>

          <div className="be2-card">
            <button className="be2-collapsible-head" onClick={() => setWhatIfOpen((v) => !v)} aria-expanded={whatIfOpen}>
              <span className="be2-card-title"><span aria-hidden="true">🧪</span> What-If Simulator {whatIfResult.hasResults && <span className="be2-badge">active</span>}</span>
              <span aria-hidden="true" className={`be2-chevron ${whatIfOpen ? 'open' : ''}`}>▾</span>
            </button>
            {whatIfOpen && (
              <div className="be2-collapsible-body">
                <p className="be2-card-sub">Test a scenario without changing your actual figures above — only Projected results move.</p>
                <div className="be2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="be2-label">Selling Price Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="be2-select" style={{ width: 100, flexShrink: 0 }} value={priceDeltaDirection} onChange={(e) => setPriceDeltaDirection(e.target.value)} aria-label="Selling price change direction">
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                      <NumberInput ariaLabel="Selling price change percent" value={priceDeltaPct} onChange={setPriceDeltaPct} placeholder="e.g. 5" suffix="%" />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="be2-label">Variable Cost Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="be2-select" style={{ width: 100, flexShrink: 0 }} value={variableCostDeltaDirection} onChange={(e) => setVariableCostDeltaDirection(e.target.value)} aria-label="Variable cost change direction">
                        <option value="decrease">Decrease</option>
                        <option value="increase">Increase</option>
                      </select>
                      <NumberInput ariaLabel="Variable cost change percent" value={variableCostDeltaPct} onChange={setVariableCostDeltaPct} placeholder="e.g. 8" suffix="%" />
                    </div>
                  </div>
                </div>
                <div className="be2-field-row" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="be2-label">Fixed Cost Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="be2-select" style={{ width: 100, flexShrink: 0 }} value={fixedCostDeltaDirection} onChange={(e) => setFixedCostDeltaDirection(e.target.value)} aria-label="Fixed cost change direction">
                        <option value="decrease">Decrease</option>
                        <option value="increase">Increase</option>
                      </select>
                      <NumberInput ariaLabel="Fixed cost change percent" value={fixedCostDeltaPct} onChange={setFixedCostDeltaPct} placeholder="e.g. 10" suffix="%" />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="be2-label">Projected Units Sold</label>
                    <NumberInput ariaLabel="Projected units sold" value={projectedUnits} onChange={setProjectedUnits} placeholder={expectedUnits || 'e.g. 800'} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="be2-disclaimer">💡 These calculations are estimates based on the figures you enter. They are not accounting or tax advice.</p>
        </div>

        {/* ---------------- RIGHT: live summary ---------------- */}
        <div className="be2-col">
          <div ref={summaryRef} className="be2-summary-capture">
            {!result.hasResults ? (
              <div className="be2-empty-state">
                <span aria-hidden="true" style={{ fontSize: '2rem' }}>📐</span>
                <p>Enter your selling price and costs to see your live break-even breakdown.</p>
              </div>
            ) : (
              <>
                <SectionCard icon="📊" title="Your Break-even Overview" action={<span className="be2-live-badge">● Live</span>}>
                  <p className="be2-card-sub">Live calculation based on your inputs</p>

                  {!result.canBreakEven ? (
                    <div className="be2-hero be2-hero-loss">
                      <div className="be2-hero-label">Break-even Not Reachable</div>
                      <div className="be2-hero-message">Break-even cannot be reached at the current selling price and variable cost.</div>
                    </div>
                  ) : (
                    <>
                      <div className="be2-hero">
                        <div className="be2-hero-label">Break-even Units</div>
                        <div className="be2-hero-value">{Math.ceil(result.breakEvenUnits).toLocaleString()}</div>
                        <div className="be2-hero-sub">{formatCurrency(result.breakEvenRevenue, currency)} in revenue</div>
                      </div>

                      <div className="be2-stat-grid">
                        <StatCard label="Contribution per Unit" value={formatCurrency(result.contributionPerUnit, currency)} tone="blue" />
                        <StatCard label="Contribution Margin" value={formatPercent(result.contributionMarginRatio)} tone="purple" />
                        <StatCard label="Total Fixed Costs" value={formatCurrency(result.fixedCosts, currency)} tone="default" />
                        <StatCard label="Variable Cost Ratio" value={formatPercent(result.variableCostRatio)} tone="amber" />
                        {result.expectedUnits > 0 && (
                          <>
                            <StatCard label="Expected Revenue" value={formatCurrency(result.expectedRevenue, currency)} tone="blue" />
                            <StatCard label="Expected Profit/Loss" value={`${result.expectedProfit < 0 ? '-' : ''}${formatCurrency(Math.abs(result.expectedProfit), currency)}`} tone={result.expectedProfit < 0 ? 'red' : 'green'} />
                            <StatCard label="Margin of Safety (units)" value={result.marginOfSafetyUnits != null ? Math.round(result.marginOfSafetyUnits).toLocaleString() : '—'} tone={result.marginOfSafetyUnits < 0 ? 'red' : 'green'} />
                            <StatCard label="Margin of Safety (%)" value={result.marginOfSafetyPct != null ? formatPercent(result.marginOfSafetyPct) : '—'} tone={result.marginOfSafetyPct < 0 ? 'red' : 'green'} />
                          </>
                        )}
                      </div>

                      {chartData && (
                        <div className="be2-chart-wrap">
                          <div className="be2-card-title" style={{ marginBottom: 12 }}>Cost vs Revenue</div>
                          <BreakEvenChart data={chartData} currency={currency} />
                        </div>
                      )}

                      {summarySegments.length > 0 && (
                        <div className="be2-chart-wrap">
                          <div className="be2-card-title" style={{ marginBottom: 12 }}>At Expected Sales</div>
                          <DoughnutChart segments={summarySegments} centerLabel={formatCurrency(result.expectedRevenue, currency)} centerSubLabel="Expected Revenue" />
                        </div>
                      )}
                    </>
                  )}
                </SectionCard>

                {whatIfResult.hasResults && (
                  <SectionCard icon="🧪" title="What-If Simulator">
                    <p className="be2-card-sub">Current vs Projected — your actual figures are unchanged</p>
                    <div className="be2-table-scroll">
                      <table className="be2-table">
                        <thead><tr><th></th><th>Current</th><th>Projected</th></tr></thead>
                        <tbody>
                          <tr>
                            <td>Break-even Units</td>
                            <td>{result.canBreakEven ? Math.ceil(result.breakEvenUnits).toLocaleString() : 'Not reachable'}</td>
                            <td className="be2-projected-cell">{whatIfResult.canBreakEven ? Math.ceil(whatIfResult.breakEvenUnits).toLocaleString() : 'Not reachable'}</td>
                          </tr>
                          <tr>
                            <td>Break-even Revenue</td>
                            <td>{result.canBreakEven ? formatCurrency(result.breakEvenRevenue, currency) : '—'}</td>
                            <td className="be2-projected-cell">{whatIfResult.canBreakEven ? formatCurrency(whatIfResult.breakEvenRevenue, currency) : '—'}</td>
                          </tr>
                          <tr>
                            <td>Expected Profit/Loss</td>
                            <td>{`${result.expectedProfit < 0 ? '-' : ''}${formatCurrency(Math.abs(result.expectedProfit), currency)}`}</td>
                            <td className="be2-projected-cell">{`${whatIfResult.expectedProfit < 0 ? '-' : ''}${formatCurrency(Math.abs(whatIfResult.expectedProfit), currency)}`}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {insights.length > 0 && (
                  <SectionCard icon="⭐" title="Insights">
                    {insights.map((ins) => (
                      <div key={ins.id} className="be2-insight-row">
                        <span aria-hidden="true" className="be2-insight-icon">{INSIGHT_ICONS[ins.icon] || '💡'}</span>
                        <div>
                          <div className="be2-insight-text">{ins.text}</div>
                          {ins.detail && <div className="be2-insight-detail">{ins.detail}</div>}
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
              fileNamePrefix={currency.replace(/[^A-Za-z0-9]/g, '') || 'break-even'}
              fileNameSuffix="break-even-summary"
              shareTitle="My Break-even Summary"
              buildText={() => buildBreakEvenSummaryText(result, currency, insights)}
              onDownloadPdf={() => generateFinancialReportPdf(buildBreakEvenReportData({ result, currency, insights, fixedCostRows, variableCostRows, whatIf: whatIfResult }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const BE2_STYLES = `
  .be2-root { --be2-blue: #2563EB; --be2-purple: #7C3AED; color: #0F172A; }
  .be2-topbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .be2-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; }
  .be2-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .be2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .be2-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .be2-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .be2-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .be2-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .be2-card-sub { font-size: 0.75rem; color: #94A3B8; margin: 2px 0 14px; }
  .be2-total-chip { font-size: 0.75rem; font-weight: 700; color: #2563EB; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 999px; padding: 4px 10px; white-space: nowrap; }

  .be2-label { font-size: 0.72rem; font-weight: 600; color: #475569; display: block; margin-bottom: 5px; }
  .be2-field-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .be2-select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; background: #fff; text-overflow: ellipsis; }

  .be2-collapsible-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
  .be2-chevron { transition: transform 0.15s ease; color: #94A3B8; }
  .be2-chevron.open { transform: rotate(180deg); }
  .be2-collapsible-body { margin-top: 14px; }
  .be2-badge { font-size: 0.6rem; font-weight: 700; color: #7C3AED; background: #F5F3FF; border-radius: 999px; padding: 2px 8px; margin-left: 8px; text-transform: uppercase; letter-spacing: .04em; }

  .be2-add-btn { margin-top: 4px; font-size: 0.8rem; color: #2563EB; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-weight: 600; }
  .be2-warning-banner { font-size: 0.78rem; color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 10px 12px; }

  .be2-disclaimer { font-size: 0.75rem; color: #64748B; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; }
  .be2-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 60px 24px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; color: #64748B; font-size: 0.88rem; }

  .be2-live-badge { font-size: 0.68rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 999px; padding: 3px 10px; }

  .be2-hero { background: linear-gradient(135deg, #2563EB, #7C3AED); border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; color: #fff; text-align: center; }
  .be2-hero-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.75); margin-bottom: 8px; }
  .be2-hero-value { font-size: 2.1rem; font-weight: 900; line-height: 1.1; }
  .be2-hero-sub { font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 6px; }
  .be2-hero-loss { background: linear-gradient(135deg, #DC2626, #B91C1C); }
  .be2-hero-message { font-size: 0.9rem; font-weight: 600; line-height: 1.4; max-width: 380px; margin: 0 auto; }

  .be2-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 4px; }
  .be2-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 14px; }
  .be2-stat-label { font-size: 0.7rem; color: #64748B; font-weight: 600; margin-bottom: 4px; }
  .be2-stat-value { font-size: 1.05rem; font-weight: 800; color: #0F172A; }
  .be2-stat-blue .be2-stat-value { color: #2563EB; }
  .be2-stat-red .be2-stat-value { color: #DC2626; }
  .be2-stat-amber .be2-stat-value { color: #D97706; }
  .be2-stat-purple .be2-stat-value { color: #7C3AED; }
  .be2-stat-green .be2-stat-value { color: #059669; }

  .be2-chart-wrap { border-top: 1px solid #F1F5F9; padding-top: 16px; margin-top: 16px; }

  .be2-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .be2-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 320px; }
  .be2-table th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94A3B8; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #E7EAF0; }
  .be2-table td { padding: 10px; border-bottom: 1px solid #F1F5F9; color: #334155; }
  .be2-projected-cell { font-weight: 700; color: #7C3AED; background: #F5F3FF; }

  .be2-insight-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F1F5F9; }
  .be2-insight-row:last-child { border-bottom: none; padding-bottom: 0; }
  .be2-insight-icon { font-size: 1.2rem; flex-shrink: 0; }
  .be2-insight-text { font-size: 0.85rem; font-weight: 600; color: #0F172A; }
  .be2-insight-detail { font-size: 0.76rem; color: #64748B; margin-top: 2px; }

  @media (max-width: 860px) {
    .be2-grid { grid-template-columns: 1fr; }
    .be2-stat-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 480px) {
    .be2-stat-grid { grid-template-columns: 1fr; }
    .be2-hero-value { font-size: 1.7rem; }
    .be2-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
  }

  @media print {
    .be2-topbar { display: none; }
    .be2-hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .be2-root button:focus-visible, .be2-root input:focus-visible, .be2-root select:focus-visible {
    outline: 2px solid #2563EB; outline-offset: 2px;
  }
`;
