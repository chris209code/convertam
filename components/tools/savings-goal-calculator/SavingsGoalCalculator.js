'use client';

import { useMemo, useRef, useState } from 'react';
import NumberInput from '../salary-calculator/NumberInput';
import DoughnutChart from '../salary-calculator/DoughnutChart';
import ExportBar from '../salary-calculator/ExportBar';
import { POPULAR_CURRENCIES, OTHER_CURRENCIES, symbolForCode } from '../salary-calculator/currencies';
import { formatCurrency, formatPercent } from '../salary-calculator/format';
import GrowthChart from './GrowthChart';
import {
  FREQUENCIES, frequencyById, monthsBetween, addMonths, toMonthlyAmount,
  computeRequiredContribution, computeGoalDate, computeWhatIf, buildWhatIfInsight, buildInsights,
} from './calculations';
import { buildSavingsGoalSummaryText } from './exportText';
import { buildSavingsGoalReportData } from './reportData';
import { generateFinancialReportPdf } from '../financial-shared/FinancialReport';

const INSIGHT_ICONS = { target: '🎯', warning: '⚠️', shield: '🛡️', trending: '📈', percent: '➗', chart: '📊' };
const COMPOUNDING_NOTE = 'Interest compounds monthly — an entered annual rate is applied as 1/12th each month.';

function SectionCard({ icon, title, action, children }) {
  return (
    <div className="sg2-card">
      <div className="sg2-card-head">
        <span className="sg2-card-title"><span aria-hidden="true">{icon}</span> {title}</span>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  return (
    <div className={`sg2-stat sg2-stat-${tone || 'default'}`}>
      <div className="sg2-stat-label">{label}</div>
      <div className="sg2-stat-value">{value}</div>
    </div>
  );
}

function dateLabel(d) {
  return d ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export default function SavingsGoalCalculator() {
  const today = useMemo(() => new Date(), []);
  const [currencyCode, setCurrencyCode] = useState('NGN');
  const currency = symbolForCode(currencyCode);

  const [goalAmount, setGoalAmount] = useState('');
  const [currentSavings, setCurrentSavings] = useState('');
  const [mode, setMode] = useState('required'); // 'required' | 'goal-date'

  // Mode A (Required Contribution) — a target date, or a plain duration.
  const [dateMode, setDateMode] = useState('date'); // 'date' | 'duration'
  const [targetDate, setTargetDate] = useState('');
  const [durationYears, setDurationYears] = useState('');
  const [durationMonths, setDurationMonths] = useState('');

  // Mode B (Goal Date) — a regular contribution at a chosen frequency.
  const [contributionAmount, setContributionAmount] = useState('');
  const [frequencyId, setFrequencyId] = useState('monthly');

  const [annualRatePct, setAnnualRatePct] = useState('');
  const [lumpSumOpen, setLumpSumOpen] = useState(false);
  const [lumpSum, setLumpSum] = useState('');
  const [lumpSumDate, setLumpSumDate] = useState('');

  const [whatIfOpen, setWhatIfOpen] = useState(false);
  const [contributionDeltaAmount, setContributionDeltaAmount] = useState('');
  const [contributionDeltaDirection, setContributionDeltaDirection] = useState('increase');
  const [extraLumpSum, setExtraLumpSum] = useState('');
  const [monthsDeltaCount, setMonthsDeltaCount] = useState('');
  const [monthsDeltaDirection, setMonthsDeltaDirection] = useState('increase');
  const [rateDeltaPct, setRateDeltaPct] = useState('');
  const [rateDeltaDirection, setRateDeltaDirection] = useState('increase');

  const summaryRef = useRef(null);

  const requiredMonths = dateMode === 'date'
    ? (targetDate ? monthsBetween(today, new Date(targetDate)) : 0)
    : (Number(durationYears) || 0) * 12 + (Number(durationMonths) || 0);

  const targetDateInPast = dateMode === 'date' && targetDate && new Date(targetDate) <= today;

  const lumpSumMonthRaw = lumpSumDate ? monthsBetween(today, new Date(lumpSumDate)) : null;
  const lumpSumOutOfRange = lumpSumOpen && lumpSumDate && mode === 'required' && lumpSumMonthRaw != null && (lumpSumMonthRaw < 0 || lumpSumMonthRaw > requiredMonths);

  const modeAInputs = {
    goalAmount, currentSavings, months: requiredMonths, annualRatePct,
    lumpSum: lumpSumOpen ? lumpSum : 0, lumpSumMonth: lumpSumMonthRaw,
  };
  const modeBInputs = {
    goalAmount, currentSavings,
    monthlyContribution: toMonthlyAmount(contributionAmount, frequencyId),
    annualRatePct, lumpSum: lumpSumOpen ? lumpSum : 0, lumpSumMonth: lumpSumMonthRaw,
  };

  const result = useMemo(
    () => (mode === 'required' && !targetDateInPast ? computeRequiredContribution(modeAInputs) : mode === 'goal-date' ? computeGoalDate(modeBInputs) : { hasResults: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, goalAmount, currentSavings, requiredMonths, annualRatePct, lumpSumOpen, lumpSum, lumpSumMonthRaw, contributionAmount, frequencyId, targetDateInPast]
  );

  const whatIfDeltas = useMemo(() => ({
    contributionDeltaAmount: contributionDeltaAmount ? (contributionDeltaDirection === 'decrease' ? -Math.abs(Number(contributionDeltaAmount)) : Math.abs(Number(contributionDeltaAmount))) : '',
    extraLumpSum: Number(extraLumpSum) || 0,
    monthsDeltaCount: monthsDeltaCount ? (monthsDeltaDirection === 'decrease' ? -Math.abs(Number(monthsDeltaCount)) : Math.abs(Number(monthsDeltaCount))) : '',
    rateDeltaPct: rateDeltaPct ? (rateDeltaDirection === 'decrease' ? -Math.abs(Number(rateDeltaPct)) : Math.abs(Number(rateDeltaPct))) : '',
  }), [contributionDeltaAmount, contributionDeltaDirection, extraLumpSum, monthsDeltaCount, monthsDeltaDirection, rateDeltaPct, rateDeltaDirection]);

  const whatIfResult = useMemo(
    () => (whatIfOpen ? computeWhatIf(result, mode, mode === 'required' ? modeAInputs : modeBInputs, whatIfDeltas) : { hasResults: false }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [whatIfOpen, result, mode, whatIfDeltas]
  );
  const whatIfInsight = useMemo(() => buildWhatIfInsight(result, whatIfResult, mode, whatIfDeltas), [result, whatIfResult, mode, whatIfDeltas]);

  const insights = useMemo(() => {
    const base = buildInsights(result, mode, { goalAmount, currentSavings, frequencyId });
    return whatIfInsight ? [...base, whatIfInsight] : base;
  }, [result, mode, goalAmount, currentSavings, frequencyId, whatIfInsight]);

  const goal = Number(goalAmount) || 0;
  const current = Number(currentSavings) || 0;
  const progressPct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const remaining = Math.max(0, goal - current);

  const progressSegments = goal > 0 ? [
    { label: 'Current Savings', value: current, color: '#2563EB', displayValue: formatCurrency(current, currency) },
    { label: 'Remaining Goal', value: remaining, color: '#E2E8F0', displayValue: formatCurrency(remaining, currency) },
  ] : [];

  const estimatedDate = result.hasResults && !result.alreadyAchieved && result.months != null ? addMonths(today, result.months) : null;

  return (
    <div className="sg2-root">
      <style>{SG2_STYLES}</style>

      <div className="sg2-topbar no-print">
        <span className="sg2-privacy" title="Every calculation happens in your browser — nothing is sent to a server or stored.">
          🔒 100% Private <span className="sg2-privacy-sub">Your savings figures are processed locally and are not stored</span>
        </span>
      </div>

      <div className="sg2-grid">
        {/* ---------------- LEFT: inputs ---------------- */}
        <div className="sg2-col no-print">
          <SectionCard icon="🎯" title="Your Goal">
            <p className="sg2-card-sub">What you're saving for, and where you stand today.</p>
            <div className="sg2-field-row">
              <div style={{ width: 132, flexShrink: 0 }}>
                <label className="sg2-label" htmlFor="sg2-currency">Currency</label>
                <select id="sg2-currency" className="sg2-select" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} aria-label="Currency">
                  <optgroup label="Popular">
                    {POPULAR_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}
                  </optgroup>
                  <optgroup label="All Currencies">
                    {OTHER_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.country}</option>)}
                  </optgroup>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="sg2-label" htmlFor="sg2-goal">Savings Goal Amount</label>
                <NumberInput id="sg2-goal" ariaLabel="Savings goal amount" value={goalAmount} onChange={setGoalAmount} placeholder="e.g. 5,000,000" prefix={currency} />
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <label className="sg2-label" htmlFor="sg2-current">Current Savings</label>
              <NumberInput id="sg2-current" ariaLabel="Current savings" value={currentSavings} onChange={setCurrentSavings} placeholder="0.00" prefix={currency} />
            </div>
          </SectionCard>

          <SectionCard icon="📅" title="Plan">
            <p className="sg2-card-sub">Solve for the contribution you need, or for how long it'll take.</p>
            <div role="radiogroup" aria-label="Calculation mode" style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              <button role="radio" aria-checked={mode === 'required'} className={`sg2-pill ${mode === 'required' ? 'active' : ''}`} onClick={() => setMode('required')}>Required Contribution</button>
              <button role="radio" aria-checked={mode === 'goal-date'} className={`sg2-pill ${mode === 'goal-date' ? 'active' : ''}`} onClick={() => setMode('goal-date')}>Goal Date</button>
            </div>

            {mode === 'required' ? (
              <>
                <div role="radiogroup" aria-label="Target time input" style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  <button role="radio" aria-checked={dateMode === 'date'} className={`sg2-pill ${dateMode === 'date' ? 'active' : ''}`} onClick={() => setDateMode('date')}>Target Date</button>
                  <button role="radio" aria-checked={dateMode === 'duration'} className={`sg2-pill ${dateMode === 'duration' ? 'active' : ''}`} onClick={() => setDateMode('duration')}>Duration</button>
                </div>
                {dateMode === 'date' ? (
                  <div>
                    <label className="sg2-label" htmlFor="sg2-target-date">Target Date</label>
                    <input id="sg2-target-date" type="date" className="sg2-select" aria-label="Target date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
                    {targetDateInPast && <div role="alert" className="sg2-warning-banner" style={{ marginTop: 8 }}>Target date must be in the future.</div>}
                  </div>
                ) : (
                  <div className="sg2-field-row">
                    <div style={{ flex: 1 }}>
                      <label className="sg2-label" htmlFor="sg2-duration-years">Years</label>
                      <NumberInput id="sg2-duration-years" ariaLabel="Duration years" value={durationYears} onChange={setDurationYears} placeholder="e.g. 2" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="sg2-label" htmlFor="sg2-duration-months">Months</label>
                      <NumberInput id="sg2-duration-months" ariaLabel="Duration months" value={durationMonths} onChange={setDurationMonths} placeholder="e.g. 0" />
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <label className="sg2-label" htmlFor="sg2-highlight-freq">Highlight Frequency</label>
                  <select id="sg2-highlight-freq" className="sg2-select" value={frequencyId} onChange={(e) => setFrequencyId(e.target.value)}>
                    {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div className="sg2-field-row">
                <div style={{ flex: 1 }}>
                  <label className="sg2-label" htmlFor="sg2-contribution">Regular Contribution</label>
                  <NumberInput id="sg2-contribution" ariaLabel="Regular contribution" value={contributionAmount} onChange={setContributionAmount} placeholder="0.00" prefix={currency} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="sg2-label" htmlFor="sg2-frequency">Contribution Frequency</label>
                  <select id="sg2-frequency" className="sg2-select" value={frequencyId} onChange={(e) => setFrequencyId(e.target.value)}>
                    {FREQUENCIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label className="sg2-label" htmlFor="sg2-rate">Expected Annual Interest Rate (optional)</label>
              <NumberInput id="sg2-rate" ariaLabel="Expected annual interest rate" value={annualRatePct} onChange={setAnnualRatePct} placeholder="e.g. 5" suffix="%" />
              <p className="sg2-card-sub" style={{ marginTop: 4, marginBottom: 0 }}>{COMPOUNDING_NOTE}</p>
            </div>
          </SectionCard>

          <div className="sg2-card">
            <label className="sg2-checkbox-label">
              <input type="checkbox" checked={lumpSumOpen} onChange={(e) => setLumpSumOpen(e.target.checked)} />
              Add a one-time lump sum
            </label>
            {lumpSumOpen && (
              <div className="sg2-collapsible-body">
                <div className="sg2-field-row">
                  <div style={{ flex: 1 }}>
                    <label className="sg2-label" htmlFor="sg2-lump">Lump Sum Amount</label>
                    <NumberInput id="sg2-lump" ariaLabel="Lump sum amount" value={lumpSum} onChange={setLumpSum} placeholder="0.00" prefix={currency} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="sg2-label" htmlFor="sg2-lump-date">Lump Sum Date</label>
                    <input id="sg2-lump-date" type="date" className="sg2-select" aria-label="Lump sum date" value={lumpSumDate} onChange={(e) => setLumpSumDate(e.target.value)} />
                  </div>
                </div>
                {lumpSumOutOfRange && <div role="alert" className="sg2-warning-banner" style={{ marginTop: 8 }}>This date falls outside your savings plan — it won't affect the result.</div>}
              </div>
            )}
          </div>

          <div className="sg2-card">
            <button className="sg2-collapsible-head" onClick={() => setWhatIfOpen((v) => !v)} aria-expanded={whatIfOpen}>
              <span className="sg2-card-title"><span aria-hidden="true">🧪</span> What-If Simulator {whatIfResult.hasResults && <span className="sg2-badge">active</span>}</span>
              <span aria-hidden="true" className={`sg2-chevron ${whatIfOpen ? 'open' : ''}`}>▾</span>
            </button>
            {whatIfOpen && (
              <div className="sg2-collapsible-body">
                <p className="sg2-card-sub">Test a scenario without changing your actual plan above — only Projected results move.</p>
                <div className="sg2-field-row">
                  {mode === 'goal-date' ? (
                    <div style={{ flex: 1 }}>
                      <label className="sg2-label">Contribution Change (monthly)</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select className="sg2-select" style={{ width: 100, flexShrink: 0 }} value={contributionDeltaDirection} onChange={(e) => setContributionDeltaDirection(e.target.value)} aria-label="Contribution change direction">
                          <option value="increase">Increase</option>
                          <option value="decrease">Decrease</option>
                        </select>
                        <NumberInput ariaLabel="Contribution change amount" value={contributionDeltaAmount} onChange={setContributionDeltaAmount} placeholder="0.00" prefix={currency} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <label className="sg2-label">Target Change (months)</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <select className="sg2-select" style={{ width: 100, flexShrink: 0 }} value={monthsDeltaDirection} onChange={(e) => setMonthsDeltaDirection(e.target.value)} aria-label="Target date change direction">
                          <option value="increase">Extend</option>
                          <option value="decrease">Shorten</option>
                        </select>
                        <NumberInput ariaLabel="Target change in months" value={monthsDeltaCount} onChange={setMonthsDeltaCount} placeholder="e.g. 3" />
                      </div>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <label className="sg2-label">Interest Rate Change</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <select className="sg2-select" style={{ width: 100, flexShrink: 0 }} value={rateDeltaDirection} onChange={(e) => setRateDeltaDirection(e.target.value)} aria-label="Interest rate change direction">
                        <option value="increase">Increase</option>
                        <option value="decrease">Decrease</option>
                      </select>
                      <NumberInput ariaLabel="Interest rate change percentage points" value={rateDeltaPct} onChange={setRateDeltaPct} placeholder="e.g. 1" suffix="pp" />
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label className="sg2-label">Extra Lump Sum</label>
                  <NumberInput ariaLabel="Extra lump sum" value={extraLumpSum} onChange={setExtraLumpSum} placeholder="0.00" prefix={currency} />
                </div>
              </div>
            )}
          </div>

          <p className="sg2-disclaimer">💡 These calculations are estimates based on the figures you enter. They are not financial advice.</p>
        </div>

        {/* ---------------- RIGHT: live summary ---------------- */}
        <div className="sg2-col">
          <div ref={summaryRef} className="sg2-summary-capture">
            {!result.hasResults ? (
              <div className="sg2-empty-state">
                <span aria-hidden="true" style={{ fontSize: '2rem' }}>🎯</span>
                <p>Enter your goal, current savings, and a target date or duration to see your live plan.</p>
              </div>
            ) : (
              <>
                <SectionCard icon="📊" title="Your Savings Plan" action={<span className="sg2-live-badge">● Live</span>}>
                  <p className="sg2-card-sub">Live calculation based on your inputs</p>

                  {result.alreadyAchieved ? (
                    <div className="sg2-hero sg2-hero-success">
                      <div className="sg2-hero-label">Goal Status</div>
                      <div className="sg2-hero-message">Goal already achieved.</div>
                    </div>
                  ) : mode === 'goal-date' && !result.reachable ? (
                    <div className="sg2-hero sg2-hero-loss">
                      <div className="sg2-hero-label">Estimated Goal Date</div>
                      <div className="sg2-hero-message">Not reachable within a 100-year projection at this contribution and interest rate.</div>
                    </div>
                  ) : mode === 'required' ? (
                    <div className="sg2-hero">
                      <div className="sg2-hero-label">Required Monthly Saving</div>
                      <div className="sg2-hero-value">{formatCurrency(result[`required${frequencyId === 'daily' ? 'Daily' : frequencyId === 'weekly' ? 'Weekly' : 'Monthly'}`], currency)}</div>
                      <div className="sg2-hero-sub">{frequencyById(frequencyId).label} contribution — {result.months} month(s) to go</div>
                    </div>
                  ) : (
                    <div className="sg2-hero">
                      <div className="sg2-hero-label">Estimated Goal Date</div>
                      <div className="sg2-hero-value">{dateLabel(estimatedDate)}</div>
                      <div className="sg2-hero-sub">{result.months} month(s) from today</div>
                    </div>
                  )}

                  {!result.alreadyAchieved && !(mode === 'goal-date' && !result.reachable) && (
                    <div className="sg2-stat-grid">
                      <StatCard label="Goal Amount" value={formatCurrency(goal, currency)} tone="default" />
                      <StatCard label="Current Savings" value={formatCurrency(current, currency)} tone="blue" />
                      <StatCard label="Remaining Amount" value={formatCurrency(remaining, currency)} tone="amber" />
                      <StatCard label="Progress" value={formatPercent(progressPct)} tone="purple" />
                      <StatCard label="Total Contributions" value={formatCurrency(result.totalContributions, currency)} tone="blue" />
                      <StatCard label="Interest Earned" value={formatCurrency(result.totalInterest, currency)} tone="green" />
                      <StatCard label="Projected Final Balance" value={formatCurrency(result.finalBalance, currency)} tone="green" />
                      <StatCard label="Time Remaining" value={`${result.months} month(s)`} tone="default" />
                    </div>
                  )}

                  {goal > 0 && (
                    <div className="sg2-chart-wrap">
                      <div className="sg2-card-title" style={{ marginBottom: 12 }}>Progress</div>
                      <DoughnutChart segments={progressSegments} centerLabel={formatPercent(progressPct, 0)} centerSubLabel="of goal" />
                    </div>
                  )}

                  {result.schedule && result.schedule.length > 1 && !(mode === 'goal-date' && !result.reachable) && (
                    <div className="sg2-chart-wrap">
                      <div className="sg2-card-title" style={{ marginBottom: 12 }}>Projected Growth</div>
                      <GrowthChart schedule={result.schedule} goalAmount={goal} presentValue={current} />
                    </div>
                  )}
                </SectionCard>

                {mode === 'required' && !result.alreadyAchieved && (
                  <SectionCard icon="⏱️" title="Required Saving — By Frequency">
                    <p className="sg2-card-sub">The same target, three ways</p>
                    <div className="sg2-period-grid">
                      {FREQUENCIES.map((f) => (
                        <div key={f.id} className={`sg2-period-cell ${f.id === frequencyId ? 'sg2-period-cell-active' : ''}`}>
                          <div className="sg2-period-label">{f.label}</div>
                          <div className="sg2-period-value">{formatCurrency(result[`required${f.id === 'daily' ? 'Daily' : f.id === 'weekly' ? 'Weekly' : 'Monthly'}`], currency)}</div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {whatIfResult.hasResults && (
                  <SectionCard icon="🧪" title="What-If Simulator">
                    <p className="sg2-card-sub">Current Plan vs Projected Plan — your actual inputs are unchanged</p>
                    <div className="sg2-table-scroll">
                      <table className="sg2-table">
                        <thead><tr><th></th><th>Current Plan</th><th>Projected Plan</th></tr></thead>
                        <tbody>
                          {mode === 'required' ? (
                            <tr>
                              <td>Required Monthly</td>
                              <td>{result.alreadyAchieved ? 'Achieved' : formatCurrency(result.requiredMonthly, currency)}</td>
                              <td className="sg2-projected-cell">{whatIfResult.alreadyAchieved ? 'Achieved' : formatCurrency(whatIfResult.requiredMonthly, currency)}</td>
                            </tr>
                          ) : (
                            <tr>
                              <td>Time to Goal</td>
                              <td>{result.reachable ? `${result.months} mo` : 'Not reachable'}</td>
                              <td className="sg2-projected-cell">{whatIfResult.reachable ? `${whatIfResult.months} mo` : 'Not reachable'}</td>
                            </tr>
                          )}
                          <tr>
                            <td>Interest Earned</td>
                            <td>{formatCurrency(result.totalInterest, currency)}</td>
                            <td className="sg2-projected-cell">{formatCurrency(whatIfResult.totalInterest, currency)}</td>
                          </tr>
                          <tr>
                            <td>Final Balance</td>
                            <td>{formatCurrency(result.finalBalance, currency)}</td>
                            <td className="sg2-projected-cell">{formatCurrency(whatIfResult.finalBalance, currency)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </SectionCard>
                )}

                {insights.length > 0 && (
                  <SectionCard icon="⭐" title="Insights">
                    {insights.map((ins) => (
                      <div key={ins.id} className="sg2-insight-row">
                        <span aria-hidden="true" className="sg2-insight-icon">{INSIGHT_ICONS[ins.icon] || '💡'}</span>
                        <div>
                          <div className="sg2-insight-text">{ins.text}</div>
                          {ins.detail && <div className="sg2-insight-detail">{ins.detail}</div>}
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
              fileNamePrefix="savings-goal"
              fileNameSuffix="savings-goal-summary"
              shareTitle="My Savings Goal Summary"
              buildText={() => buildSavingsGoalSummaryText(result, mode, currency, goalAmount, currentSavings, insights)}
              onDownloadPdf={() => generateFinancialReportPdf(buildSavingsGoalReportData({ result, mode, currency, goalAmount, currentSavings, insights, whatIf: whatIfResult, compoundingNote: COMPOUNDING_NOTE }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}

const SG2_STYLES = `
  .sg2-root { --sg2-blue: #2563EB; --sg2-purple: #7C3AED; color: #0F172A; }
  .sg2-topbar { display: flex; justify-content: flex-end; margin-bottom: 16px; }
  .sg2-privacy { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; font-size: 0.78rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 8px 14px; max-width: 320px; text-align: right; }
  .sg2-privacy-sub { font-size: 0.65rem; font-weight: 500; color: #64748B; }

  .sg2-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
  .sg2-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .sg2-card { background: #fff; border: 1px solid #E7EAF0; border-radius: 16px; padding: 20px; box-shadow: 0 1px 2px rgba(15,23,42,.03); }
  .sg2-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .sg2-card-title { font-size: 0.92rem; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px; }
  .sg2-card-sub { font-size: 0.75rem; color: #94A3B8; margin: 2px 0 14px; }

  .sg2-label { font-size: 0.72rem; font-weight: 600; color: #475569; display: block; margin-bottom: 5px; }
  .sg2-field-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .sg2-select { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #E2E8F0; font-size: 0.85rem; font-family: inherit; outline: none; background: #fff; text-overflow: ellipsis; }

  .sg2-pill { padding: 7px 12px; border-radius: 999px; border: 1px solid #E2E8F0; background: #fff; color: #64748B; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.78rem; }
  .sg2-pill.active { border-color: #2563EB; background: #EFF6FF; color: #2563EB; }

  .sg2-collapsible-head { width: 100%; display: flex; align-items: center; justify-content: space-between; background: none; border: none; cursor: pointer; padding: 0; font-family: inherit; }
  .sg2-chevron { transition: transform 0.15s ease; color: #94A3B8; }
  .sg2-chevron.open { transform: rotate(180deg); }
  .sg2-collapsible-body { margin-top: 14px; }
  .sg2-badge { font-size: 0.6rem; font-weight: 700; color: #7C3AED; background: #F5F3FF; border-radius: 999px; padding: 2px 8px; margin-left: 8px; text-transform: uppercase; letter-spacing: .04em; }
  .sg2-checkbox-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.85rem; color: #334155; font-weight: 600; }
  .sg2-warning-banner { font-size: 0.72rem; color: #92400E; background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 8px 10px; }

  .sg2-disclaimer { font-size: 0.75rem; color: #64748B; background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 10px 14px; }
  .sg2-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; padding: 60px 24px; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 16px; color: #64748B; font-size: 0.88rem; }

  .sg2-live-badge { font-size: 0.68rem; font-weight: 700; color: #059669; background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 999px; padding: 3px 10px; }

  .sg2-hero { background: linear-gradient(135deg, #2563EB, #7C3AED); border-radius: 14px; padding: 22px 24px; margin-bottom: 16px; color: #fff; text-align: center; }
  .sg2-hero-label { font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(255,255,255,0.75); margin-bottom: 8px; }
  .sg2-hero-value { font-size: 1.85rem; font-weight: 900; line-height: 1.15; }
  .sg2-hero-sub { font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 6px; }
  .sg2-hero-loss { background: linear-gradient(135deg, #DC2626, #B91C1C); }
  .sg2-hero-success { background: linear-gradient(135deg, #059669, #047857); }
  .sg2-hero-message { font-size: 0.9rem; font-weight: 600; line-height: 1.4; max-width: 380px; margin: 0 auto; }

  .sg2-stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 4px; }
  .sg2-stat { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 14px; }
  .sg2-stat-label { font-size: 0.7rem; color: #64748B; font-weight: 600; margin-bottom: 4px; }
  .sg2-stat-value { font-size: 1.02rem; font-weight: 800; color: #0F172A; }
  .sg2-stat-blue .sg2-stat-value { color: #2563EB; }
  .sg2-stat-red .sg2-stat-value { color: #DC2626; }
  .sg2-stat-amber .sg2-stat-value { color: #D97706; }
  .sg2-stat-purple .sg2-stat-value { color: #7C3AED; }
  .sg2-stat-green .sg2-stat-value { color: #059669; }

  .sg2-chart-wrap { border-top: 1px solid #F1F5F9; padding-top: 16px; margin-top: 16px; }

  .sg2-period-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .sg2-period-cell { background: #F8FAFC; border: 1px solid #F1F5F9; border-radius: 12px; padding: 12px 10px; text-align: center; }
  .sg2-period-cell-active { background: #EFF6FF; border-color: #BFDBFE; }
  .sg2-period-label { font-size: 0.68rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 4px; }
  .sg2-period-value { font-size: 0.92rem; font-weight: 800; color: #0F172A; }
  .sg2-period-cell-active .sg2-period-value { color: #2563EB; }

  .sg2-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .sg2-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; min-width: 320px; }
  .sg2-table th { text-align: left; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.04em; color: #94A3B8; font-weight: 700; padding: 8px 10px; border-bottom: 1px solid #E7EAF0; }
  .sg2-table td { padding: 10px; border-bottom: 1px solid #F1F5F9; color: #334155; }
  .sg2-projected-cell { font-weight: 700; color: #7C3AED; background: #F5F3FF; }

  .sg2-insight-row { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #F1F5F9; }
  .sg2-insight-row:last-child { border-bottom: none; padding-bottom: 0; }
  .sg2-insight-icon { font-size: 1.2rem; flex-shrink: 0; }
  .sg2-insight-text { font-size: 0.85rem; font-weight: 600; color: #0F172A; }
  .sg2-insight-detail { font-size: 0.76rem; color: #64748B; margin-top: 2px; }

  @media (max-width: 860px) {
    .sg2-grid { grid-template-columns: 1fr; }
    .sg2-stat-grid { grid-template-columns: 1fr 1fr; }
  }
  @media (max-width: 480px) {
    .sg2-stat-grid { grid-template-columns: 1fr; }
    .sg2-period-grid { grid-template-columns: 1fr; }
    .sg2-hero-value { font-size: 1.5rem; }
    .sg2-privacy { max-width: 100%; align-items: flex-start; text-align: left; }
  }

  @media print {
    .sg2-topbar { display: none; }
    .sg2-hero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }

  .sg2-root button:focus-visible, .sg2-root input:focus-visible, .sg2-root select:focus-visible {
    outline: 2px solid #2563EB; outline-offset: 2px;
  }
`;
