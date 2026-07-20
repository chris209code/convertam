import { formatCurrency, formatPercent } from '../salary-calculator/format';
import { perPeriod } from './calculations';

// Maps the Expense & Budget Calculator's own state into the generic
// shape components/tools/financial-shared/FinancialReport.js renders.
export function buildBudgetReportData({ result, budgetStatus, allocation, ranked, periodTable, incomePeriod, periodLabel, currency, insights }) {
  const chartSegments = ranked.map((c, i) => ({
    label: c.name || 'Category',
    value: c.annualAmount,
    color: ['#2563EB', '#F59E0B', '#7C3AED', '#059669', '#DC2626', '#0EA5E9', '#DB2777', '#65A30D'][i % 8],
    displayValue: formatCurrency(perPeriod(c.annualAmount, incomePeriod), currency),
  }));

  const statCards = [
    { label: 'Total Income', value: formatCurrency(perPeriod(result.totalAnnualIncome, incomePeriod), currency) },
    { label: 'Total Expenses', value: formatCurrency(perPeriod(result.totalAnnualExpenses, incomePeriod), currency) },
    { label: 'Disposable Income', value: formatCurrency(perPeriod(result.disposableIncome, incomePeriod), currency) },
    { label: 'Expense Ratio', value: formatPercent(result.expenseRatio) },
    { label: 'Savings Rate', value: formatPercent(result.savingsRate) },
  ];
  if (result.savingsCategory) statCards.splice(3, 0, { label: 'Total Savings/Investment', value: formatCurrency(perPeriod(result.totalAnnualSavings, incomePeriod), currency) });

  const tables = [
    {
      title: 'Expense Breakdown',
      head: ['Category', `Amount / ${periodLabel}`, '% of Expenses'],
      rows: ranked.map((c) => [c.name || 'Category', formatCurrency(perPeriod(c.annualAmount, incomePeriod), currency), `${c.pctOfExpenses.toFixed(1)}%`]),
    },
    {
      title: 'Period Conversion',
      head: ['Period', 'Income', 'Expenses', 'Balance'],
      rows: periodTable.map((r) => [r.label, formatCurrency(r.income, currency), formatCurrency(r.expenses, currency), formatCurrency(r.balance, currency)]),
      activeRowIndex: periodTable.findIndex((r) => r.id === incomePeriod),
    },
  ];

  const allocationInsights = allocation
    ? allocation.map((a) => ({ text: `${a.label}: ${a.pct.toFixed(1)}% of income (${formatCurrency(perPeriod(a.value, incomePeriod), currency)})` }))
    : [];

  return {
    toolName: 'Expense & Budget Calculator',
    fileName: `${currency.replace(/[^A-Za-z0-9]/g, '') || 'budget'}-budget-report.pdf`,
    hero: { label: 'Remaining Balance', value: formatCurrency(perPeriod(result.remainingBalance, incomePeriod), currency), sub: `${result.remainingBalance < 0 ? 'Over Budget' : 'Left over'} / ${periodLabel}` },
    statCards,
    chart: chartSegments.length > 0 ? { segments: chartSegments, centerLabel: formatPercent(result.expenseRatio), centerSubLabel: 'of Income' } : null,
    insights: [
      ...(budgetStatus ? [{ text: `Budget Status: ${budgetStatus.label}`, detail: budgetStatus.detail }] : []),
      ...insights.map((i) => ({ text: i.text, detail: i.detail })),
      ...allocationInsights,
    ],
    tables,
    privacyNote: 'Your income and expense information is processed locally and is not stored.',
  };
}
