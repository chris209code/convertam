'use client';

import { useMemo, useRef, useState } from 'react';
import NumberInput from './NumberInput';
import DeductionRow from './DeductionRow';
import DoughnutChart from './DoughnutChart';
import ExportBar from './ExportBar';
import { getDeductionIcon } from './deductionIcons';
import { buildResultsText } from './exportText';
import { formatCurrency, formatCurrencyCompact, formatPercent } from './format';
import { FREQUENCIES, computeSalary, buildConversionTable, buildInsights, categorizeDeductions, perPeriod } from './calculations';

const TEMPLATES = [
  {
    name: '🇳🇬 Nigeria (PAYE)',
    deductions: [
      { id: 1, name: 'Income Tax (PAYE)', type: 'percent', value: '18', beforeTax: true },
      { id: 2, name: 'Pension', type: 'percent', value: '8', beforeTax: true },
      { id: 3, name: 'NHIS', type: 'percent', value: '1.75', beforeTax: false },
      { id: 4, name: 'NHF', type: 'percent', value: '2.5', beforeTax: false },
    ],
  },
  {
    name: '🇬🇧 United Kingdom',
    deductions: [
      { id: 1, name: 'Income Tax', type: 'percent', value: '20', beforeTax: true },
      { id: 2, name: 'National Insurance', type: 'percent', value: '12', beforeTax: false },
      { id: 3, name: 'Student Loan', type: 'percent', value: '9', beforeTax: false },
    ],
  },
  {
    name: '🇺🇸 United States',
    deductions: [
      { id: 1, name: 'Federal Income Tax', type: 'percent', value: '22', beforeTax: true },
      { id: 2, name: 'Social Security', type: 'percent', value: '6.2', beforeTax: false },
      { id: 3, name: 'Medicare', type: 'percent', value: '1.45', beforeTax: false },
      { id: 4, name: 'State Tax', type: 'percent', value: '5', beforeTax: false },
    ],
  },
  { name: '⚙️ Custom (Blank)', deductions: [] },
];

const QUICK_EARNINGS = ['Bonus', 'Allowance', 'Commission', 'Other Income'];

function SectionCard({ icon, title, action, children }) {
  return (
    <div className="sal2-card">
      <div className="sal2-card-head">
        <span className="sal2-card-title"><span aria-hidden="true">{icon}</span> {title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`sal2-stat sal2-stat-${tone || 'default'}`}>
      <div className="sal2-stat-label">{label}</div>
      <div className="sal2-stat-value">{value}</div>
    </div>
  );
}

export default function SalaryCalculator() {
  const [gross, setGross] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [currency, setCurrency] = useState('₦');
  const [deductions, setDeductions] = useState([
    { id: 1, name: 'Tax', type: 'percent', value: '', beforeTax: true },
    { id: 2, name: 'Pension', type: 'percent', value: '', beforeTax: true },
  ]);
  const [overtime, setOvertime] = useState({ enabled: false, hourlyRate: '', hoursWorked: '', standardHours: '40', multiplier: '1.5' });
  const [bonuses, setBonuses] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [nextId, setNextId] = useState(10);
  const summaryRef = useRef(null);

  function addDeduction() {
    setDeductions((prev) => [...prev, { id: nextId, name: '', type: 'percent', value: '', beforeTax: false }]);
    setNextId((n) => n + 1);
  }
  function removeDeduction(id) {
    setDeductions((prev) => prev.filter((d) => d.id !== id));
  }
  function updateDeduction(id, key, val) {
    setDeductions((prev) => prev.map((d) => (d.id === id ? { ...d, [key]: val } : d)));
  }
  function applyTemplate(template) {
    setDeductions(template.deductions.map((d, i) => ({ ...d, id: i + 1 })));
    setNextId(template.deductions.length + 10);
    setShowTemplates(false);
  }
  function addBonus(name = '') {
    setBonuses((prev) => [...prev, { id: nextId, name, amount: '' }]);
    setNextId((n) => n + 1);
    setOptionalOpen(true);
  }
  function updateBonus(id, key, val) {
    setBonuses((prev) => prev.map((b) => (b.id === id ? { ...b, [key]: val } : b)));
  }
  function removeBonus(id) {
    setBonuses((prev) => prev.filter((b) => b.id !== id));
  }

  // computeSalary is a pure function of these five inputs, so recomputing
  // it is cheap — useMemo just avoids doing it twice within the same
  // render pass (once here, effectively, since this is the only call site).
  const result = useMemo(
    () => computeSalary({ gross, frequency, deductions, overtime, bonuses }),
    [gross, frequency, deductions, overtime, bonuses]
  );
  const freqLabel = result.freqData.label;
  const { tax, pension, other, otherAnnual } = useMemo(() => categorizeDeductions(result.deductionAmounts), [result.deductionAmounts]);
  const conversionRows = useMemo(() => buildConversionTable(result), [result]);
  const insights = useMemo(() => buildInsights(result, frequency), [result, frequency]);
  const hasOvertimeOrBonus = overtime.enabled || bonuses.length > 0;

  const chartSegments = [
    { label: 'Take Home', value: result.annualNet, color: '#2563EB', displayValue: formatCurrency(perPeriod(result.annualNet, frequency), currency) },
    tax && { label: tax.name || 'Tax', value: tax.annualAmount, color: '#F59E0B', displayValue: formatCurrency(perPeriod(tax.annualAmount, frequency), currency) },
    pension && { label: pension.name || 'Pension', value: pension.annualAmount, color: '#7C3AED', displayValue: formatCurrency(perPeriod(pension.annualAmount, frequency), currency) },
    otherAnnual > 0 && { label: 'Other Deductions', value: otherAnnual, color: '#10B981', displayValue: formatCurrency(perPeriod(otherAnnual, frequency), currency) },
  ].filter(Boolean);

  const takeHomePct = result.totalAnnualGross > 0 ? (result.annualNet / result.totalAnnualGross) * 100 : 0;

  return (
    <div className="sal2-root">
      <style>{SAL2_STYLES}</style>

      <div className="sal2-topbar no-print">
        <span className="sal2-privacy" title="Every calculation happens in your browser — nothing is sent to a server or stored.">
          🔒 100% Private <span className="sal2-privacy-sub">No salary information is stored</span>
        </span>
      </div>

      <div className="sal2-grid">
        {/* ---------------- LEFT: inputs ---------------- */}
        <div className="sal2-col no-print">
          <SectionCard icon="👤" title="Salary Details">
            <p className="sal2-card-sub">Enter your salary information</p>
            <div className="sal2-field-row">
              <div style={{ width: 74 }}>
                <label className="sal2-label" htmlFor="sal2-currency">Currency</label>
                <input id="sal2-currency" className="sal2-plain-input" value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} aria-label="Currency symbol" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="sal2-label" htmlFor="sal2-gross">Gross Salary</label>
                <NumberInput id="sal2-gross" ariaLabel="Gross salary" value={gross} onChange={setGross} placeholder="e.g. 500,000" prefix={currency} />
              </div>
            </div>
            <label className="sal2-label" htmlFor="sal2-frequency" style={{ marginTop: 12 }}>Pay Period</label>
            <select id="sal2-frequency" className="sal2-select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          </SectionCard>

          <SectionCard
            icon="✂️"
            title="Deductions"
            action={
              <button className="sal2-ghost-btn" onClick={() => setShowTemplates((v) => !v)}>📋 Load Template</button>
            }
          >
            <p className="sal2-card-sub">Enter a percentage, an amount, or both — we'll work out the other side automatically.</p>
            {showTemplates && (
              <div className="sal2-template-grid">
                {TEMPLATES.map((t) => (
                  <button key={t.name} className="sal2-template-btn" onClick={() => applyTemplate(t)}>{t.name}</button>
                ))}
              </div>
            )}
            {deductions.map((d) => (
              <DeductionRow
                key={d.id}
                deduction={d}
                currency={currency}
                base={d.beforeTax ? result.totalAnnualGross : result.taxableIncome}
                freqMultiplier={result.freqData.multiplier}
                freqLabel={freqLabel}
                onChange={(key, val) => updateDeduction(d.id, key, val)}
                onRemove={() => removeDeduction(d.id)}
                showRemove={deductions.length > 0}
              />
            ))}
            <button className="sal2-add-btn" onClick={addDeduction}>➕ Add Deduction</button>
          </SectionCard>

          <div className="sal2-card">
            <button className="sal2-collapsible-head" onClick={() => setOptionalOpen((v) => !v)} aria-expanded={optionalOpen}>
              <span className="sal2-card-title"><span aria-hidden="true">🎁</span> Optional Earnings {hasOvertimeOrBonus && <span className="sal2-badge">active</span>}</span>
              <span aria-hidden="true" className={`sal2-chevron ${optionalOpen ? 'open' : ''}`}>▾</span>
            </button>
            {optionalOpen && (
              <div className="sal2-collapsible-body">
                <p className="sal2-card-sub">Bonus, allowance, commission, overtime, or other one-off income.</p>

                <div className="sal2-quickadd">
                  {QUICK_EARNINGS.map((name) => (
                    <button key={name} className="sal2-chip-btn" onClick={() => addBonus(name)}>+ {name}</button>
                  ))}
                </div>

                {bonuses.map((b) => (
                  <div key={b.id} className="sal2-bonus-row">
                    <input className="sal2-plain-input" value={b.name} onChange={(e) => updateBonus(b.id, 'name', e.target.value)} placeholder="e.g. Performance Bonus, 13th Month" aria-label="Earning name" />
                    <NumberInput ariaLabel="Earning amount" value={b.amount} onChange={(v) => updateBonus(b.id, 'amount', v)} placeholder="0.00" prefix={currency} />
                    <button className="sal2-remove-btn" onClick={() => removeBonus(b.id)} aria-label={`Remove ${b.name || 'earning'}`}>×</button>
                  </div>
                ))}

                <div className="sal2-overtime-toggle">
                  <label className="sal2-checkbox-label">
                    <input type="checkbox" checked={overtime.enabled} onChange={(e) => setOvertime((o) => ({ ...o, enabled: e.target.checked }))} />
                    Include overtime pay
                  </label>
                </div>
                {overtime.enabled && (
                  <div className="sal2-overtime-grid">
                    {[['Hourly Rate', 'hourlyRate', 'e.g. 2500'], ['Hours Worked', 'hoursWorked', 'e.g. 45'], ['Standard Hours', 'standardHours', '40'], ['OT Multiplier', 'multiplier', '1.5']].map(([label, key, ph]) => (
                      <div key={key}>
                        <label className="sal2-label">{label}</label>
                        <NumberInput ariaLabel={label} value={overtime[key]} onChange={(v) => setOvertime((o) => ({ ...o, [key]: v }))} placeholder={ph} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <p className="sal2-disclaimer">💡 These calculations are estimates. Actual values may vary.</p>
        </div>

        {/* ---------------- RIGHT: live summary ---------------- */}
        <div className="sal2-col">
          <div ref={summaryRef} className="sal2-summary-capture">
            {!result.hasResults ? (
              <div className="sal2-empty-state">
                <span aria-hidden="true" style={{ fontSize: '2rem' }}>💰</span>
                <p>Enter your gross salary to see your live take-home breakdown.</p>
              </div>
            ) : (
              <>
                <SectionCard icon="📊" title="Your Salary Overview" action={<span className="sal2-live-badge">● Live</span>}>
                  <p className="sal2-card-sub">Live calculation based on your inputs</p>

                  <div className="sal2-hero">
                    <div className="sal2-hero-label">Take Home Pay</div>
                    <div className="sal2-hero-value">{formatCurrency(perPeriod(result.annualNet, frequency), currency)}</div>
                    <div className="sal2-hero-sub">Net Salary / {freqLabel}</div>
                  </div>

                  <div className="sal2-stat-grid">
                    <StatCard label="Gross Salary" value={formatCurrency(perPeriod(result.totalAnnualGross, frequency), currency)} tone="blue" />
                    <StatCard label="Total Deductions" value={formatCurrency(perPeriod(result.totalDeductions, frequency), currency)} tone="red" />
                    {tax && <StatCard label={`${tax.name} (${formatPercent((tax.annualAmount / result.totalAnnualGross) * 100)})`} value={formatCurrency(perPeriod(tax.annualAmount, frequency), currency)} tone="amber" />}
                    {pension && <StatCard label={`${pension.name} (${formatPercent((pension.annualAmount / result.totalAnnualGross) * 100)})`} value={formatCurrency(perPeriod(pension.annualAmount, frequency), currency)} tone="purple" />}
                    {otherAnnual > 0 && <StatCard label="Other Deductions" value={formatCurrency(perPeriod(otherAnnual, frequency), currency)} tone="green" />}
                  </div>

                  <div className="sal2-chart-wrap">
                    <div className="sal2-card-title" style={{ marginBottom: 12 }}>Deductions Breakdown</div>
                    <DoughnutChart segments={chartSegments} centerLabel={formatPercent(takeHomePct)} centerSubLabel="Take Home" />
                  </div>
                </SectionCard>

                <SectionCard icon="🔁" title="Salary Conversion">
                  <p className="sal2-card-sub">See your salary breakdown across different pay periods</p>
                  <div className="sal2-table-scroll">
                    <table className="sal2-table">
                      <thead>
                        <tr><th>Pay Period</th><th>Gross</th><th>Deductions</th><th>Take Home</th></tr>
                      </thead>
                      <tbody>
                        {conversionRows.map((row) => (
                          <tr key={row.id} className={row.id === frequency ? 'sal2-row-active' : ''}>
                            <td>{row.label}</td>
                            <td>{formatCurrency(row.gross, currency)}</td>
                            <td>{formatCurrency(row.deductions, currency)}</td>
                            <td className="sal2-net-cell">{formatCurrency(row.net, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionCard>

                {insights.length > 0 && (
                  <SectionCard icon="⭐" title="Salary Insights">
                    {insights.map((ins) => (
                      <div key={ins.id} className="sal2-insight-row">
                        <span aria-hidden="true" className="sal2-insight-icon">{INSIGHT_ICONS[ins.icon] || '💡'}</span>
                        <div>
                          <div className="sal2-insight-text">{ins.text}</div>
                          <div className="sal2-insight-detail">{ins.detail}</div>
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
              fileNamePrefix={currency.replace(/[^A-Za-z0-9]/g, '') || 'salary'}
              buildText={() => buildResultsText(result, frequency, freqLabel, currency, result.deductionAmounts)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const INSIGHT_ICONS = { percent: '📊', tax: '🏛️', trending: '📈', shield: '🛡️' };

const SAL2_STYLES = `
  .sal2-root { --sal2-blue: #2563EB; --sal2-purple: #7C3AED; color: #0F172A; }
  .sal2-topbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .sal2-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 8px 14px; }
  .sal2-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .sal2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .sal2-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .sal2-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .sal2-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .sal2-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .sal2-card-sub { font-size: 0.75rem; color: #94A3B8; margin: 2px 0 14px; }

  .sal2-label { font-size: 0.72rem; font-weight: 600; color: #475569; display: block; margin-bottom: 5px; }
  .sal2-field-row { display: flex; gap: 10px; }
  .sal2-plain-input { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; }
  .sal2-select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; background: #fff; }

  .sal2-ghost-btn { font-size: 0.75rem; padding: 6px 12px; border-radius: 8px; border: 1px solid #DDD6FE; background: #F5F3FF; color: #7C3AED; cursor: pointer; font-family: inherit; font-weight: 600; white-space: nowrap; }
  .sal2-template-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 14px; }
  .sal2-template-btn { padding: 8px 12px; border-radius: 10px; border: 1px solid #E2E8F0; background: #fff; cursor: pointer; font-family: inherit; font-size: 0.78rem; color: #475569; text-align: left; }
  .sal2-template-btn:hover { border-color: #7C3AED; color: #7C3AED; background: #F5F3FF; }
  .sal2-add-btn { margin-top: 4px; font-size: 0.8rem; color: #7C3AED; background: #F5F3FF; border: 1px solid #DDD6FE; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-weight: 600; }

  .sal2-collapsible-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
  .sal2-chevron { transition: transform 0.15s ease; color: #94A3B8; }
  .sal2-chevron.open { transform: rotate(180deg); }
  .sal2-collapsible-body { margin-top: 14px; }
  .sal2-badge { font-size: 0.6rem; font-weight: 700; color: #7C3AED; background: #F5F3FF; border-radius: 999px; padding: 2px 8px; margin-left: 8px; text-transform: uppercase; letter-spacing: .04em; }
  .sal2-quickadd { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .sal2-chip-btn { font-size: 0.76rem; padding: 6px 12px; border-radius: 999px; border: 1px solid #A7F3D0; background: #ECFDF5; color: #059669; cursor: pointer; font-family: inherit; font-weight: 600; }
  .sal2-bonus-row { display: grid; grid-template-columns: 1fr 150px 30px; gap: 8px; margin-bottom: 10px; align-items: center; }
  .sal2-remove-btn { width: 28px; height: 28px; border-radius: 50%; background: #FEF2F2; border: 1px solid #FECACA; color: #DC2626; cursor: pointer; font-size: 0.9rem; }
  .sal2-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.82rem; color: #334155; font-weight: 600; }
  .sal2-overtime-toggle { margin: 6px 0 10px; padding-top: 10px; border-top: 1px solid #F1F5F9; }
  .sal2-overtime-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }

  .sal2-disclaimer { font-size: 0.75rem; color: #64748B; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; }

  .sal2-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 60px 24px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; color: #64748B; font-size: 0.88rem; }

  .sal2-live-badge { font-size: 0.68rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 999px; padding: 3px 10px; }

  .sal2-hero { background: linear-gradient(135deg, #2563EB, #7C3AED); border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; color: #fff; text-align: center; }
  .sal2-hero-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.75); margin-bottom: 8px; }
  .sal2-hero-value { font-size: 2.1rem; font-weight: 900; line-height: 1.1; }
  .sal2-hero-sub { font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 6px; }

  .sal2-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
  .sal2-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 14px; }
  .sal2-stat-label { font-size: 0.7rem; color: #64748B; font-weight: 600; margin-bottom: 4px; }
  .sal2-stat-value { font-size: 1.05rem; font-weight: 800; color: #0F172A; }
  .sal2-stat-blue .sal2-stat-value { color: #2563EB; }
  .sal2-stat-red .sal2-stat-value { color: #DC2626; }
  .sal2-stat-amber .sal2-stat-value { color: #D97706; }
  .sal2-stat-purple .sal2-stat-value { color: #7C3AED; }
  .sal2-stat-green .sal2-stat-value { color: #059669; }

  .sal2-chart-wrap { border-top: 1px solid #F1F5F9; padding-top: 16px; }

  .sal2-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .sal2-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 420px; }
  .sal2-table th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94A3B8; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #E7EAF0; }
  .sal2-table td { padding: 10px; border-bottom: 1px solid #F1F5F9; color: #334155; }
  .sal2-table tr.sal2-row-active { background: #F5F3FF; }
  .sal2-table tr.sal2-row-active td:first-child { color: #7C3AED; font-weight: 700; border-left: 3px solid #7C3AED; }
  .sal2-net-cell { font-weight: 700; color: #059669; }

  .sal2-insight-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F1F5F9; }
  .sal2-insight-row:last-child { border-bottom: none; padding-bottom: 0; }
  .sal2-insight-icon { font-size: 1.2rem; flex-shrink: 0; }
  .sal2-insight-text { font-size: 0.85rem; font-weight: 600; color: #0F172A; }
  .sal2-insight-detail { font-size: 0.76rem; color: #64748B; margin-top: 2px; }

  @media (max-width: 860px) {
    .sal2-grid { grid-template-columns: 1fr; }
    .sal2-stat-grid { grid-template-columns: 1fr 1fr; }
    .sal2-overtime-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 480px) {
    .sal2-stat-grid { grid-template-columns: 1fr; }
    .sal2-bonus-row { grid-template-columns: 1fr; }
    .sal2-hero-value { font-size: 1.7rem; }
  }

  @media print {
    .sal2-topbar { display: none; }
    .sal2-hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .sal2-root button:focus-visible, .sal2-root input:focus-visible, .sal2-root select:focus-visible {
    outline: 2px solid #2563EB; outline-offset: 2px;
  }
`;
