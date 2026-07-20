'use client';

import { useMemo, useRef, useState } from 'react';
import NumberInput from '../salary-calculator/NumberInput';
import DoughnutChart from '../salary-calculator/DoughnutChart';
import ExportBar from '../salary-calculator/ExportBar';
import { POPULAR_CURRENCIES, OTHER_CURRENCIES, symbolForCode } from '../salary-calculator/currencies';
import { formatCurrency, formatPercent } from '../salary-calculator/format';
import AmortizationTable from './AmortizationTable';
import { buildLoanSummaryText } from './exportText';
import {
  FREQUENCIES, computeLoan, buildEarlyRepaymentSavings, buildAffordability, buildInsights, compareLoans,
} from './calculations';

const INSIGHT_ICONS = { interest: '📊', warning: '⚠️', shield: '🛡️', trending: '📈', percent: '➗' };

function SectionCard({ icon, title, action, children }) {
  return (
    <div className="ln2-card">
      <div className="ln2-card-head">
        <span className="ln2-card-title"><span aria-hidden="true">{icon}</span> {title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`ln2-stat ln2-stat-${tone || 'default'}`}>
      <div className="ln2-stat-label">{label}</div>
      <div className="ln2-stat-value">{value}</div>
    </div>
  );
}

function dateLabel(d) {
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function LoanCalculator() {
  const [principal, setPrincipal] = useState('');
  const [ratePct, setRatePct] = useState('');
  const [termYears, setTermYears] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const currency = symbolForCode(currencyCode);

  const [downPayment, setDownPayment] = useState('');
  const [processingFee, setProcessingFee] = useState('');
  const [insuranceFee, setInsuranceFee] = useState('');
  const [extraPayment, setExtraPayment] = useState('');
  const [optionalOpen, setOptionalOpen] = useState(false);

  const [showCompare, setShowCompare] = useState(false);
  const [altPrincipal, setAltPrincipal] = useState('');
  const [altRatePct, setAltRatePct] = useState('');
  const [altTermYears, setAltTermYears] = useState('');
  const [altTermMonths, setAltTermMonths] = useState('');
  const [altFrequency, setAltFrequency] = useState('monthly');

  const [showAffordability, setShowAffordability] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [monthlyExpenses, setMonthlyExpenses] = useState('');

  const summaryRef = useRef(null);

  const baseInputs = { principal, downPayment, ratePct, termYears, termMonths, frequency, processingFee, insuranceFee };

  const result = useMemo(
    () => computeLoan({ ...baseInputs, extraPayment }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [principal, downPayment, ratePct, termYears, termMonths, frequency, processingFee, insuranceFee, extraPayment]
  );
  const baselineResult = useMemo(
    () => (extraPayment && Number(extraPayment) > 0 ? computeLoan({ ...baseInputs, extraPayment: 0 }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [principal, downPayment, ratePct, termYears, termMonths, frequency, processingFee, insuranceFee, extraPayment]
  );
  const earlyRepayment = useMemo(
    () => (baselineResult ? buildEarlyRepaymentSavings(result, baselineResult) : null),
    [result, baselineResult]
  );

  const freqLabel = result.freqData.label;
  const hasOptional = [downPayment, processingFee, insuranceFee, extraPayment].some((v) => v !== '' && Number(v) > 0);

  const altResult = useMemo(
    () => (showCompare ? computeLoan({ principal: altPrincipal, downPayment: '', ratePct: altRatePct, termYears: altTermYears, termMonths: altTermMonths, frequency: altFrequency, processingFee: '', insuranceFee: '' }) : null),
    [showCompare, altPrincipal, altRatePct, altTermYears, altTermMonths, altFrequency]
  );
  const comparison = useMemo(() => (altResult ? compareLoans(result, altResult) : null), [result, altResult]);

  const affordability = useMemo(
    () => (showAffordability ? buildAffordability({ monthlyIncome, monthlyExpenses, monthlyLoanPayment: result.monthlyEquivalentPayment }) : null),
    [showAffordability, monthlyIncome, monthlyExpenses, result.monthlyEquivalentPayment]
  );

  const insights = useMemo(
    () => buildInsights(result, { earlyRepayment, downPaymentAmt: result.downPaymentAmt, extraPayment, ratePct }),
    [result, earlyRepayment, extraPayment, ratePct]
  );

  const chartSegments = [
    { label: 'Principal', value: result.financedPrincipal, color: '#2563EB', displayValue: formatCurrency(result.financedPrincipal, currency) },
    result.totalInterestPaid > 0 && { label: 'Interest', value: result.totalInterestPaid, color: '#F59E0B', displayValue: formatCurrency(result.totalInterestPaid, currency) },
    result.fees > 0 && { label: 'Fees', value: result.fees, color: '#7C3AED', displayValue: formatCurrency(result.fees, currency) },
  ].filter(Boolean);

  return (
    <div className="ln2-root">
      <style>{LN2_STYLES}</style>

      <div className="ln2-topbar no-print">
        <span className="ln2-privacy" title="Every calculation happens in your browser — nothing is sent to a server or stored.">
          🔒 100% Private <span className="ln2-privacy-sub">Your loan information is processed locally and is not stored</span>
        </span>
      </div>

      <div className="ln2-grid">
        {/* ---------------- LEFT: inputs ---------------- */}
        <div className="ln2-col no-print">
          <SectionCard icon="🏦" title="Loan Details">
            <p className="ln2-card-sub">Enter the loan amount, rate, and term.</p>
            <div className="ln2-field-row">
              <div style={{ width: 132, flexShrink: 0 }}>
                <label className="ln2-label" htmlFor="ln2-currency">Currency</label>
                <select id="ln2-currency" className="ln2-select" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} aria-label="Currency">
                  <optgroup label="Popular">
                    {POPULAR_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}
                  </optgroup>
                  <optgroup label="All Currencies">
                    {OTHER_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}
                  </optgroup>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="ln2-label" htmlFor="ln2-principal">Loan Amount</label>
                <NumberInput id="ln2-principal" ariaLabel="Loan amount" value={principal} onChange={setPrincipal} placeholder="e.g. 5,000,000" prefix={currency} />
              </div>
            </div>

            <div className="ln2-field-row" style={{ marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="ln2-label" htmlFor="ln2-rate">Interest Rate (annual)</label>
                <NumberInput id="ln2-rate" ariaLabel="Annual interest rate" value={ratePct} onChange={setRatePct} placeholder="e.g. 18" suffix="%" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="ln2-label" htmlFor="ln2-frequency">Repayment Frequency</label>
                <select id="ln2-frequency" className="ln2-select" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
            </div>

            <div className="ln2-field-row" style={{ marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label className="ln2-label" htmlFor="ln2-term-years">Loan Term — Years</label>
                <NumberInput id="ln2-term-years" ariaLabel="Loan term years" value={termYears} onChange={setTermYears} placeholder="e.g. 3" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="ln2-label" htmlFor="ln2-term-months">Loan Term — Months</label>
                <NumberInput id="ln2-term-months" ariaLabel="Loan term months" value={termMonths} onChange={setTermMonths} placeholder="e.g. 0" />
              </div>
            </div>
          </SectionCard>

          <div className="ln2-card">
            <button className="ln2-collapsible-head" onClick={() => setOptionalOpen((v) => !v)} aria-expanded={optionalOpen}>
              <span className="ln2-card-title"><span aria-hidden="true">➕</span> Optional Details {hasOptional && <span className="ln2-badge">active</span>}</span>
              <span aria-hidden="true" className={`ln2-chevron ${optionalOpen ? 'open' : ''}`}>▾</span>
            </button>
            {optionalOpen && (
              <div className="ln2-collapsible-body">
                <p className="ln2-card-sub">Down payment, fees, and extra payments — all optional.</p>
                <div className="ln2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Down Payment</label>
                    <NumberInput ariaLabel="Down payment" value={downPayment} onChange={setDownPayment} placeholder="0.00" prefix={currency} />
                    {Number(downPayment) > 0 && Number(downPayment) >= Number(principal) && (
                      <div role="alert" className="ln2-warning-banner">Down payment cannot exceed the loan amount.</div>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Processing Fee (one-time)</label>
                    <NumberInput ariaLabel="Processing fee" value={processingFee} onChange={setProcessingFee} placeholder="0.00" prefix={currency} />
                  </div>
                </div>
                <div className="ln2-field-row" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Insurance Fee (one-time)</label>
                    <NumberInput ariaLabel="Insurance fee" value={insuranceFee} onChange={setInsuranceFee} placeholder="0.00" prefix={currency} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Extra Payment (each period)</label>
                    <NumberInput ariaLabel="Extra payment" value={extraPayment} onChange={setExtraPayment} placeholder="0.00" prefix={currency} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="ln2-card">
            <label className="ln2-checkbox-label">
              <input type="checkbox" checked={showCompare} onChange={(e) => setShowCompare(e.target.checked)} />
              Compare with another loan
            </label>
            {showCompare && (
              <div className="ln2-collapsible-body">
                <p className="ln2-card-sub">Enter an alternative loan to compare against your current one.</p>
                <div className="ln2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Alternative Amount</label>
                    <NumberInput ariaLabel="Alternative loan amount" value={altPrincipal} onChange={setAltPrincipal} placeholder="e.g. 5,000,000" prefix={currency} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Alternative Rate</label>
                    <NumberInput ariaLabel="Alternative interest rate" value={altRatePct} onChange={setAltRatePct} placeholder="e.g. 15" suffix="%" />
                  </div>
                </div>
                <div className="ln2-field-row" style={{ marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Alt. Term — Years</label>
                    <NumberInput ariaLabel="Alternative term years" value={altTermYears} onChange={setAltTermYears} placeholder="e.g. 3" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Alt. Term — Months</label>
                    <NumberInput ariaLabel="Alternative term months" value={altTermMonths} onChange={setAltTermMonths} placeholder="e.g. 0" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Alt. Frequency</label>
                    <select className="ln2-select" value={altFrequency} onChange={(e) => setAltFrequency(e.target.value)} aria-label="Alternative repayment frequency">
                      {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="ln2-card">
            <label className="ln2-checkbox-label">
              <input type="checkbox" checked={showAffordability} onChange={(e) => setShowAffordability(e.target.checked)} />
              Check affordability
            </label>
            {showAffordability && (
              <div className="ln2-collapsible-body">
                <p className="ln2-card-sub">See how this loan fits your monthly budget.</p>
                <div className="ln2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Monthly Income</label>
                    <NumberInput ariaLabel="Monthly income" value={monthlyIncome} onChange={setMonthlyIncome} placeholder="0.00" prefix={currency} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="ln2-label">Monthly Expenses</label>
                    <NumberInput ariaLabel="Monthly expenses" value={monthlyExpenses} onChange={setMonthlyExpenses} placeholder="0.00" prefix={currency} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="ln2-disclaimer">💡 These calculations are estimates based on the figures you enter. Actual loan terms may vary by lender.</p>
        </div>

        {/* ---------------- RIGHT: live summary ---------------- */}
        <div className="ln2-col">
          <div ref={summaryRef} className="ln2-summary-capture">
            {!result.hasResults ? (
              <div className="ln2-empty-state">
                <span aria-hidden="true" style={{ fontSize: '2rem' }}>🏦</span>
                <p>Enter a loan amount, interest rate, and term to see your live repayment breakdown.</p>
              </div>
            ) : (
              <>
                <SectionCard icon="📊" title="Your Loan Overview" action={<span className="ln2-live-badge">● Live</span>}>
                  <p className="ln2-card-sub">Live calculation based on your inputs</p>

                  <div className="ln2-hero">
                    <div className="ln2-hero-label">{freqLabel} Repayment</div>
                    <div className="ln2-hero-value">{formatCurrency(result.payment, currency)}</div>
                    <div className="ln2-hero-sub">{result.numPayments} payments</div>
                  </div>

                  <div className="ln2-stat-grid">
                    <StatCard label="Loan Amount" value={formatCurrency(result.principalAmt, currency)} tone="blue" />
                    <StatCard label="Interest Paid" value={formatCurrency(result.totalInterestPaid, currency)} tone="amber" />
                    <StatCard label="Total Repayment" value={formatCurrency(result.totalRepayment, currency)} tone="red" />
                    <StatCard label="Effective Interest" value={formatPercent(result.effectiveInterestPct)} tone="purple" />
                    <StatCard label="Loan End Date" value={dateLabel(result.loanEndDate)} tone="green" />
                    {result.downPaymentAmt > 0 && <StatCard label="Amount Financed" value={formatCurrency(result.financedPrincipal, currency)} tone="default" />}
                  </div>

                  {chartSegments.length > 0 && (
                    <div className="ln2-chart-wrap">
                      <div className="ln2-card-title" style={{ marginBottom: 12 }}>Cost Breakdown</div>
                      <DoughnutChart segments={chartSegments} centerLabel={formatCurrency(result.totalRepayment, currency)} centerSubLabel="Total Cost" />
                    </div>
                  )}
                </SectionCard>

                {earlyRepayment && (
                  <SectionCard icon="🚀" title="Early Repayment">
                    <p className="ln2-card-sub">The effect of your extra {freqLabel.toLowerCase()} payment</p>
                    <div className="ln2-stat-grid">
                      <StatCard label="Payments Saved" value={earlyRepayment.monthsSaved} tone="green" />
                      <StatCard label="Interest Saved" value={formatCurrency(earlyRepayment.interestSaved, currency)} tone="green" />
                      <StatCard label="New Payoff Date" value={dateLabel(earlyRepayment.newPayoffDate)} tone="blue" />
                    </div>
                  </SectionCard>
                )}

                {altResult && (
                  <SectionCard icon="⚖️" title="Compare Scenarios">
                    <p className="ln2-card-sub">Current Loan vs Alternative Loan</p>
                    <div className="ln2-table-scroll">
                      <table className="ln2-table">
                        <thead>
                          <tr><th></th><th>Current Loan</th><th>Alternative Loan</th></tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>{freqLabel} Payment</td>
                            <td className={comparison?.cheaperId === 'current' ? 'ln2-cheaper-cell' : ''}>{formatCurrency(result.payment, currency)}</td>
                            <td className={comparison?.cheaperId === 'alternative' ? 'ln2-cheaper-cell' : ''}>{altResult.hasResults ? formatCurrency(altResult.payment, currency) : '—'}</td>
                          </tr>
                          <tr>
                            <td>Interest</td>
                            <td className={comparison?.cheaperId === 'current' ? 'ln2-cheaper-cell' : ''}>{formatCurrency(result.totalInterestPaid, currency)}</td>
                            <td className={comparison?.cheaperId === 'alternative' ? 'ln2-cheaper-cell' : ''}>{altResult.hasResults ? formatCurrency(altResult.totalInterestPaid, currency) : '—'}</td>
                          </tr>
                          <tr>
                            <td>Total Cost</td>
                            <td className={comparison?.cheaperId === 'current' ? 'ln2-cheaper-cell' : ''}>{formatCurrency(result.totalRepayment, currency)}</td>
                            <td className={comparison?.cheaperId === 'alternative' ? 'ln2-cheaper-cell' : ''}>{altResult.hasResults ? formatCurrency(altResult.totalRepayment, currency) : '—'}</td>
                          </tr>
                          <tr>
                            <td>Payoff Date</td>
                            <td className={comparison?.cheaperId === 'current' ? 'ln2-cheaper-cell' : ''}>{dateLabel(result.loanEndDate)}</td>
                            <td className={comparison?.cheaperId === 'alternative' ? 'ln2-cheaper-cell' : ''}>{altResult.hasResults ? dateLabel(altResult.loanEndDate) : '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {comparison && (
                      <p className="ln2-compare-note">
                        {comparison.cheaperId === 'current' ? 'Your current loan' : 'The alternative loan'} costs {formatCurrency(comparison.difference, currency)} less overall.
                      </p>
                    )}
                  </SectionCard>
                )}

                {affordability && (
                  <SectionCard icon="🧮" title="Affordability">
                    <p className="ln2-card-sub">How this loan fits your monthly budget</p>
                    <div className={`ln2-status-banner ln2-status-${affordability.tone}`}>
                      <span className="ln2-status-label">{affordability.indicator}</span>
                      <span className="ln2-status-detail">Debt-to-income ratio: {formatPercent(affordability.dtiPct)}</span>
                    </div>
                    <div className="ln2-stat-grid">
                      <StatCard label="Debt-to-Income Ratio" value={formatPercent(affordability.dtiPct)} tone={affordability.tone === 'red' ? 'red' : affordability.tone === 'amber' ? 'amber' : 'green'} />
                      <StatCard label="Monthly Cash Remaining" value={formatCurrency(affordability.cashRemaining, currency)} tone={affordability.cashRemaining < 0 ? 'red' : 'blue'} />
                    </div>
                  </SectionCard>
                )}

                {insights.length > 0 && (
                  <SectionCard icon="⭐" title="Loan Insights">
                    {insights.map((ins) => (
                      <div key={ins.id} className="ln2-insight-row">
                        <span aria-hidden="true" className="ln2-insight-icon">{INSIGHT_ICONS[ins.icon] || '💡'}</span>
                        <div>
                          <div className="ln2-insight-text">{ins.text}</div>
                          <div className="ln2-insight-detail">{ins.detail}</div>
                        </div>
                      </div>
                    ))}
                  </SectionCard>
                )}

                <SectionCard icon="📅" title="Amortization Schedule">
                  <p className="ln2-card-sub">Every payment, from first to last</p>
                  <AmortizationTable schedule={result.schedule} currency={currency} fileNamePrefix={currency.replace(/[^A-Za-z0-9]/g, '') || 'loan'} />
                </SectionCard>
              </>
            )}
          </div>

          {result.hasResults && (
            <ExportBar
              captureRef={summaryRef}
              fileNamePrefix={currency.replace(/[^A-Za-z0-9]/g, '') || 'loan'}
              fileNameSuffix="loan-summary"
              buildText={() => buildLoanSummaryText(result, currency, freqLabel, earlyRepayment, insights)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const LN2_STYLES = `
  .ln2-root { --ln2-blue: #2563EB; --ln2-purple: #7C3AED; color: #0F172A; }
  .ln2-topbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .ln2-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; }
  .ln2-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .ln2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .ln2-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .ln2-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .ln2-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .ln2-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .ln2-card-sub { font-size: 0.75rem; color: #94A3B8; margin: 2px 0 14px; }

  .ln2-label { font-size: 0.72rem; font-weight: 600; color: #475569; display: block; margin-bottom: 5px; }
  .ln2-field-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .ln2-select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; background: #fff; text-overflow: ellipsis; }

  .ln2-collapsible-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
  .ln2-chevron { transition: transform 0.15s ease; color: #94A3B8; }
  .ln2-chevron.open { transform: rotate(180deg); }
  .ln2-collapsible-body { margin-top: 14px; }
  .ln2-badge { font-size: 0.6rem; font-weight: 700; color: #7C3AED; background: #F5F3FF; border-radius: 999px; padding: 2px 8px; margin-left: 8px; text-transform: uppercase; letter-spacing: .04em; }
  .ln2-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: #334155; font-weight: 600; }
  .ln2-warning-banner { font-size: 0.72rem; color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 6px 10px; margin-top: 6px; }

  .ln2-ghost-btn { font-size: 0.75rem; padding: 6px 12px; border-radius: 8px; border: 1px solid #DDD6FE; background: #F5F3FF; color: #7C3AED; cursor: pointer; font-family: inherit; font-weight: 600; white-space: nowrap; }
  .ln2-add-btn { margin-top: 4px; font-size: 0.8rem; color: #2563EB; background: #EFF6FF; border: 1px solid #BFDBFE; padding: 8px 14px; border-radius: 10px; cursor: pointer; font-family: inherit; font-weight: 600; }

  .ln2-disclaimer { font-size: 0.75rem; color: #64748B; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; }

  .ln2-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 60px 24px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; color: #64748B; font-size: 0.88rem; }

  .ln2-live-badge { font-size: 0.68rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 999px; padding: 3px 10px; }

  .ln2-hero { background: linear-gradient(135deg, #2563EB, #7C3AED); border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; color: #fff; text-align: center; }
  .ln2-hero-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.75); margin-bottom: 8px; }
  .ln2-hero-value { font-size: 2.1rem; font-weight: 900; line-height: 1.1; }
  .ln2-hero-sub { font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 6px; }

  .ln2-status-banner { display: flex; flex-direction: column; gap: 2px; border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; }
  .ln2-status-label { font-size: 0.82rem; font-weight: 800; }
  .ln2-status-detail { font-size: 0.74rem; }
  .ln2-status-green { background: #ECFDF5; border: 1px solid #A7F3D0; }
  .ln2-status-green .ln2-status-label { color: #059669; }
  .ln2-status-green .ln2-status-detail { color: #047857; }
  .ln2-status-amber { background: #FFFBEB; border: 1px solid #FDE68A; }
  .ln2-status-amber .ln2-status-label { color: #B45309; }
  .ln2-status-amber .ln2-status-detail { color: #92400E; }
  .ln2-status-red { background: #FEF2F2; border: 1px solid #FECACA; }
  .ln2-status-red .ln2-status-label { color: #DC2626; }
  .ln2-status-red .ln2-status-detail { color: #991B1B; }

  .ln2-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 4px; }
  .ln2-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 14px; }
  .ln2-stat-label { font-size: 0.7rem; color: #64748B; font-weight: 600; margin-bottom: 4px; }
  .ln2-stat-value { font-size: 1.05rem; font-weight: 800; color: #0F172A; }
  .ln2-stat-blue .ln2-stat-value { color: #2563EB; }
  .ln2-stat-red .ln2-stat-value { color: #DC2626; }
  .ln2-stat-amber .ln2-stat-value { color: #D97706; }
  .ln2-stat-purple .ln2-stat-value { color: #7C3AED; }
  .ln2-stat-green .ln2-stat-value { color: #059669; }

  .ln2-chart-wrap { border-top: 1px solid #F1F5F9; padding-top: 16px; margin-top: 16px; }

  .ln2-table-scroll, .ln2-amort-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .ln2-amort-scroll-tall { max-height: 480px; overflow-y: auto; border: 1px solid #F1F5F9; border-radius: 10px; }
  .ln2-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 380px; }
  .ln2-table th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94A3B8; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #E7EAF0; position: sticky; top: 0; background: #fff; }
  .ln2-table td { padding: 10px; border-bottom: 1px solid #F1F5F9; color: #334155; }
  .ln2-net-cell { font-weight: 700; color: #0F172A; }
  .ln2-cheaper-cell { font-weight: 700; color: #059669; background: #ECFDF5; }
  .ln2-compare-note { font-size: 0.8rem; color: #059669; font-weight: 600; margin-top: 12px; }
  .ln2-row-highlight { background: #FEF3C7 !important; }

  .ln2-amort-controls { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .ln2-amort-search { flex: 1 1 160px; padding: 8px 12px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.8rem; font-family: inherit; outline: none; }
  .ln2-amort-jump { display: flex; gap: 6px; }
  .ln2-amort-jump-input { width: 90px; padding: 8px 10px; border-radius: 8px; border: 1px solid #E2E8F0; font-size: 0.8rem; font-family: inherit; outline: none; }
  .ln2-amort-empty { padding: 20px; text-align: center; color: #94A3B8; font-size: 0.82rem; }

  .ln2-insight-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F1F5F9; }
  .ln2-insight-row:last-child { border-bottom: none; padding-bottom: 0; }
  .ln2-insight-icon { font-size: 1.2rem; flex-shrink: 0; }
  .ln2-insight-text { font-size: 0.85rem; font-weight: 600; color: #0F172A; }
  .ln2-insight-detail { font-size: 0.76rem; color: #64748B; margin-top: 2px; }

  @media (max-width: 860px) {
    .ln2-grid { grid-template-columns: 1fr; }
    .ln2-stat-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 480px) {
    .ln2-stat-grid { grid-template-columns: 1fr; }
    .ln2-hero-value { font-size: 1.7rem; }
    .ln2-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
  }

  @media print {
    .ln2-topbar { display: none; }
    .ln2-hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .ln2-root button:focus-visible, .ln2-root input:focus-visible, .ln2-root select:focus-visible {
    outline: 2px solid #2563EB; outline-offset: 2px;
  }
`;
