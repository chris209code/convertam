import { formatCurrency, formatPercent } from '../salary-calculator/format';

function signed(amount, currency) {
  return `${amount < 0 ? '-' : ''}${formatCurrency(Math.abs(amount), currency)}`;
}

// Maps the Break-even Calculator's own state into the generic shape
// components/tools/financial-shared/FinancialReport.js renders.
export function buildBreakEvenReportData({ result, currency, insights, fixedCostRows, variableCostRows, whatIf }) {
  if (!result.canBreakEven) {
    return {
      toolName: 'Break-even Calculator',
      fileName: `${currency.replace(/[^A-Za-z0-9]/g, '') || 'break-even'}-break-even-report.pdf`,
      hero: { label: 'Break-even Units', value: 'Not reachable', sub: 'Selling price does not cover variable cost', tone: 'loss' },
      statCards: [
        { label: 'Selling Price', value: formatCurrency(result.price, currency) },
        { label: 'Variable Cost / Unit', value: formatCurrency(result.variableCostPerUnit, currency) },
        { label: 'Total Fixed Costs', value: formatCurrency(result.fixedCosts, currency) },
      ],
      insights: insights.map((i) => ({ text: i.text, detail: i.detail })),
      tables: [],
      privacyNote: 'Your business figures are processed locally and are not stored.',
    };
  }

  const statCards = [
    { label: 'Break-even Revenue', value: formatCurrency(result.breakEvenRevenue, currency) },
    { label: 'Contribution per Unit', value: formatCurrency(result.contributionPerUnit, currency) },
    { label: 'Contribution Margin', value: formatPercent(result.contributionMarginRatio) },
    { label: 'Total Fixed Costs', value: formatCurrency(result.fixedCosts, currency) },
    { label: 'Variable Cost Ratio', value: formatPercent(result.variableCostRatio) },
  ];
  if (result.expectedUnits > 0) {
    statCards.push(
      { label: 'Expected Revenue', value: formatCurrency(result.expectedRevenue, currency) },
      { label: 'Expected Profit/Loss', value: signed(result.expectedProfit, currency) },
      { label: 'Margin of Safety', value: result.marginOfSafetyPct != null ? formatPercent(result.marginOfSafetyPct) : '—' },
    );
  }

  const tables = [];
  const activeFixed = (fixedCostRows || []).filter((r) => Number(r.value) > 0);
  if (activeFixed.length > 0) {
    tables.push({
      title: 'Fixed Cost Breakdown',
      head: ['Item', 'Amount'],
      rows: activeFixed.map((r) => [r.name || 'Fixed Cost', formatCurrency(Number(r.value), currency)]),
    });
  }
  const activeVariable = (variableCostRows || []).filter((r) => Number(r.value) > 0);
  if (activeVariable.length > 0) {
    tables.push({
      title: 'Variable Cost Breakdown (per unit)',
      head: ['Item', 'Amount per Unit'],
      rows: activeVariable.map((r) => [r.name || 'Variable Cost', formatCurrency(Number(r.value), currency)]),
    });
  }

  const allInsights = insights.map((i) => ({ text: i.text, detail: i.detail }));
  if (whatIf?.hasResults) {
    allInsights.push({
      text: `What-If Simulator — Projected break-even: ${whatIf.canBreakEven ? `${Math.ceil(whatIf.breakEvenUnits).toLocaleString()} units` : 'not reachable'}`,
      detail: `Currently ${Math.ceil(result.breakEvenUnits).toLocaleString()} units.`,
    });
  }

  return {
    toolName: 'Break-even Calculator',
    fileName: `${currency.replace(/[^A-Za-z0-9]/g, '') || 'break-even'}-break-even-report.pdf`,
    hero: { label: 'Break-even Units', value: Math.ceil(result.breakEvenUnits).toLocaleString(), sub: `${formatCurrency(result.breakEvenRevenue, currency)} in revenue` },
    statCards,
    insights: allInsights,
    tables,
    privacyNote: 'Your business figures are processed locally and are not stored.',
  };
}
