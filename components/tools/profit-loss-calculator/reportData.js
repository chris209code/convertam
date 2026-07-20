import { formatCurrency, formatPercent } from '../salary-calculator/format';

function signed(amount, currency) {
  return `${amount < 0 ? '-' : ''}${formatCurrency(amount, currency)}`;
}

// Maps the Profit & Loss Calculator's own state into the generic shape
// components/tools/financial-shared/FinancialReport.js renders.
export function buildPLReportData({ result, currency, status, breakdown, breakEven, pricing, comparison, insights, whatIf, chartSegments, allocation, totalCosts, isLoss }) {
  const statCards = [
    { label: 'Total Revenue', value: formatCurrency(result.totalRevenue, currency) },
    { label: 'Total Costs', value: formatCurrency(totalCosts, currency) },
    { label: 'Gross Profit', value: signed(result.grossProfit, currency) },
    { label: isLoss ? 'Net Loss' : 'Net Profit', value: formatCurrency(Math.abs(result.netProfit), currency) },
    { label: 'Gross Margin', value: formatPercent(result.grossMargin) },
    { label: 'Net Margin', value: formatPercent(result.netMargin) },
    { label: 'Markup', value: formatPercent(result.markup) },
  ];
  if (result.mode === 'detailed') statCards.push({ label: 'Expense Ratio', value: formatPercent(result.expenseRatio) });
  if (result.mode === 'detailed' && result.breakEvenRevenue != null) statCards.push({ label: 'Break-even Revenue (est.)', value: formatCurrency(result.breakEvenRevenue, currency) });

  const tables = [];
  if (breakdown && breakdown.length > 0) {
    tables.push({
      title: 'Expense Breakdown',
      head: ['Category', 'Amount', '% of Costs'],
      rows: breakdown.map((l) => [l.name, formatCurrency(l.amount, currency), `${l.pctOfCosts.toFixed(1)}%`]),
    });
  }
  if (comparison && comparison.length > 0) {
    tables.push({
      title: 'vs Previous Period',
      head: ['Metric', 'Current', 'Previous', 'Change'],
      rows: comparison.map((r) => [
        r.label,
        r.isPct ? formatPercent(r.current) : signed(r.current, currency),
        r.isPct ? formatPercent(r.previous) : signed(r.previous, currency),
        `${r.status} (${r.isPct ? `${Math.abs(r.change).toFixed(1)}pp` : formatCurrency(Math.abs(r.change), currency)})`,
      ]),
    });
  }

  const extraInsights = [];
  if (allocation) {
    for (const a of allocation) extraInsights.push({ text: `${a.label}: ${formatCurrency(a.value, currency)} (${a.pct.toFixed(1)}% of revenue)` });
  }
  if (breakEven?.hasResults) {
    extraInsights.push({
      text: `Break-even (unit economics): ${breakEven.breakEvenUnits != null ? `${Math.ceil(breakEven.breakEvenUnits).toLocaleString()} units` : 'not reachable at this price'}`,
      detail: breakEven.breakEvenRevenue != null ? `Break-even revenue: ${formatCurrency(breakEven.breakEvenRevenue, currency)}` : undefined,
    });
  }
  if (pricing?.hasResults) {
    extraInsights.push(pricing.mode === 'from-margin'
      ? { text: `Recommended selling price: ${formatCurrency(pricing.recommendedPrice, currency)}`, detail: `Profit/unit: ${formatCurrency(pricing.profitPerUnit, currency)}, markup ${formatPercent(pricing.markupPct)}` }
      : { text: `At ${formatCurrency(pricing.price, currency)}, your margin is ${formatPercent(pricing.resultingMargin)}`, detail: `Profit/unit: ${formatCurrency(pricing.profitPerUnit, currency)}` });
  }
  if (whatIf?.hasResults) {
    extraInsights.push({
      text: `What-If Simulator — Projected Net Margin: ${formatPercent(whatIf.netMargin)} (currently ${formatPercent(result.netMargin)})`,
      detail: `Projected ${whatIf.netProfit >= 0 ? 'profit' : 'loss'}: ${formatCurrency(Math.abs(whatIf.netProfit), currency)}`,
    });
  }

  return {
    toolName: 'Profit & Loss Calculator',
    fileName: `${currency.replace(/[^A-Za-z0-9]/g, '') || 'profit-loss'}-profit-loss-report.pdf`,
    hero: { label: isLoss ? 'Net Loss' : 'Net Profit', value: formatCurrency(Math.abs(result.netProfit), currency), sub: `Net Margin ${formatPercent(result.netMargin)}`, tone: isLoss ? 'loss' : 'default' },
    statCards,
    chart: chartSegments.length > 0 ? { segments: chartSegments, centerLabel: isLoss ? 'Loss' : formatPercent(result.netMargin), centerSubLabel: isLoss ? formatCurrency(Math.abs(result.netProfit), currency) : 'Net Margin' } : null,
    insights: [
      ...(status ? [{ text: `Business Health: ${status.label}`, detail: status.detail }] : []),
      ...insights.map((i) => ({ text: i.text, detail: i.detail })),
      ...extraInsights,
    ],
    tables,
    privacyNote: 'Your business figures are processed locally and are not stored.',
  };
}
