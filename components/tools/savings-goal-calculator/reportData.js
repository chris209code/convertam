import { formatCurrency, formatPercent } from '../salary-calculator/format';

// Maps the Savings Goal Calculator's own state into the generic shape
// components/tools/financial-shared/FinancialReport.js renders.
export function buildSavingsGoalReportData({ result, mode, currency, goalAmount, currentSavings, insights, whatIf, compoundingNote }) {
  const goal = Number(goalAmount) || 0;
  const current = Number(currentSavings) || 0;

  if (result.alreadyAchieved) {
    return {
      toolName: 'Savings Goal Calculator',
      fileName: 'savings-goal-report.pdf',
      hero: { label: 'Goal Status', value: 'Goal Already Achieved', sub: `${formatCurrency(current, currency)} saved of ${formatCurrency(goal, currency)}` },
      statCards: [
        { label: 'Goal Amount', value: formatCurrency(goal, currency) },
        { label: 'Current Savings', value: formatCurrency(current, currency) },
      ],
      insights: insights.map((i) => ({ text: i.text, detail: i.detail })),
      tables: [],
      privacyNote: 'Your savings figures are processed locally and are not stored.',
    };
  }

  if (mode === 'goal-date' && !result.reachable) {
    return {
      toolName: 'Savings Goal Calculator',
      fileName: 'savings-goal-report.pdf',
      hero: { label: 'Estimated Goal Date', value: 'Not reachable', sub: 'Within a 100-year projection window', tone: 'loss' },
      statCards: [
        { label: 'Goal Amount', value: formatCurrency(goal, currency) },
        { label: 'Current Savings', value: formatCurrency(current, currency) },
      ],
      insights: insights.map((i) => ({ text: i.text, detail: i.detail })),
      tables: [],
      privacyNote: 'Your savings figures are processed locally and are not stored.',
    };
  }

  const progressPct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  const remaining = Math.max(0, goal - current);

  const statCards = [
    { label: 'Goal Amount', value: formatCurrency(goal, currency) },
    { label: 'Current Savings', value: formatCurrency(current, currency) },
    { label: 'Remaining Amount', value: formatCurrency(remaining, currency) },
    { label: 'Progress', value: formatPercent(progressPct) },
    { label: 'Total Contributions', value: formatCurrency(result.totalContributions, currency) },
    { label: 'Interest Earned', value: formatCurrency(result.totalInterest, currency) },
    { label: 'Projected Final Balance', value: formatCurrency(result.finalBalance, currency) },
  ];
  if (mode === 'required') {
    statCards.push(
      { label: 'Required Monthly', value: formatCurrency(result.requiredMonthly, currency) },
      { label: 'Required Weekly', value: formatCurrency(result.requiredWeekly, currency) },
      { label: 'Required Daily', value: formatCurrency(result.requiredDaily, currency) },
    );
  } else {
    statCards.push({ label: 'Time Remaining', value: `${result.months} month(s)` });
  }

  const tables = [];
  if (result.schedule && result.schedule.length > 1) {
    const rows = result.schedule.filter((_, i) => i % Math.max(1, Math.ceil(result.schedule.length / 24)) === 0 || i === result.schedule.length - 1);
    tables.push({
      title: 'Projected Growth (sampled)',
      head: ['Month', 'Balance', 'Total Contributions', 'Total Interest'],
      rows: rows.map((r) => [String(r.month), formatCurrency(r.balance, currency), formatCurrency(r.totalContributions, currency), formatCurrency(r.totalInterest, currency)]),
    });
  }

  const allInsights = insights.map((i) => ({ text: i.text, detail: i.detail }));
  if (compoundingNote) allInsights.push({ text: compoundingNote });
  if (whatIf?.hasResults) {
    allInsights.push({
      text: mode === 'required'
        ? `What-If Simulator — Projected required monthly: ${whatIf.alreadyAchieved ? 'Goal achieved' : formatCurrency(whatIf.requiredMonthly, currency)}`
        : `What-If Simulator — Projected time to goal: ${whatIf.reachable ? `${whatIf.months} month(s)` : 'not reachable'}`,
    });
  }

  return {
    toolName: 'Savings Goal Calculator',
    fileName: 'savings-goal-report.pdf',
    hero: mode === 'required'
      ? { label: 'Required Monthly Saving', value: formatCurrency(result.requiredMonthly, currency), sub: `${formatPercent(progressPct)} of the way there` }
      : { label: 'Estimated Time to Goal', value: `${result.months} month(s)`, sub: `${formatPercent(progressPct)} of the way there` },
    statCards,
    insights: allInsights,
    tables,
    privacyNote: 'Your savings figures are processed locally and are not stored.',
  };
}
