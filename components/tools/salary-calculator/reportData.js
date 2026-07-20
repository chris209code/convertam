import { formatCurrency, formatPercent } from './format';
import { perPeriod } from './calculations';

// Maps the Salary Calculator's own state into the generic shape
// components/tools/financial-shared/FinancialReport.js renders — kept in
// this calculator's own directory (not the shared module) since the
// mapping itself is Salary-specific, only the renderer is shared.
export function buildSalaryReportData({ result, frequency, freqLabel, currency, chartSegments, takeHomePct, conversionRows, insights }) {
  return {
    toolName: 'Salary Calculator',
    fileName: `${currency.replace(/[^A-Za-z0-9]/g, '') || 'salary'}-salary-report.pdf`,
    hero: {
      label: 'Take Home Pay',
      value: formatCurrency(perPeriod(result.annualNet, frequency), currency),
      sub: `Net Salary / ${freqLabel}`,
    },
    statCards: [
      { label: 'Gross Salary', value: formatCurrency(perPeriod(result.totalAnnualGross, frequency), currency) },
      { label: 'Total Deductions', value: formatCurrency(perPeriod(result.totalDeductions, frequency), currency) },
    ],
    chart: chartSegments.length > 0 ? { segments: chartSegments, centerLabel: formatPercent(takeHomePct), centerSubLabel: 'Take Home' } : null,
    insights: insights.map((i) => ({ text: i.text, detail: i.detail })),
    tables: [
      {
        title: 'Deductions Breakdown',
        head: ['Deduction', `Amount / ${freqLabel}`],
        rows: result.deductionAmounts.map((d) => [d.name || 'Deduction', formatCurrency(perPeriod(d.annualAmount, frequency), currency)]),
      },
      {
        title: 'Salary Conversion',
        head: ['Pay Period', 'Gross', 'Deductions', 'Take Home'],
        rows: conversionRows.map((r) => [r.label, formatCurrency(r.gross, currency), formatCurrency(r.deductions, currency), formatCurrency(r.net, currency)]),
        activeRowIndex: conversionRows.findIndex((r) => r.id === frequency),
      },
    ],
    privacyNote: 'Your salary information is processed locally and is not stored.',
  };
}
