import { formatCurrency, formatPercent } from '../salary-calculator/format';

// Plain-text summary used by both Copy Results and Share — mirrors the
// other calculators' exportText.js so Copy/Share can never disagree.
export function buildLoanSummaryText(result, currency, freqLabel, earlyRepayment, insights) {
  const lines = [
    `Loan Summary (${freqLabel} payments)`,
    '',
    `Amount Financed: ${formatCurrency(result.financedPrincipal, currency)}`,
    `${freqLabel} Repayment: ${formatCurrency(result.payment, currency)}`,
    `Interest Paid: ${formatCurrency(result.totalInterestPaid, currency)}`,
    `Total Repayment: ${formatCurrency(result.totalRepayment, currency)}`,
    `Effective Interest: ${formatPercent(result.effectiveInterestPct)}`,
    `Loan End Date: ${result.loanEndDate ? result.loanEndDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}`,
  ];

  if (earlyRepayment) {
    lines.push('');
    lines.push(`With your extra payment: ${earlyRepayment.monthsSaved} payment(s) saved, ${formatCurrency(earlyRepayment.interestSaved, currency)} interest saved.`);
  }

  if (insights.length > 0) {
    lines.push('');
    lines.push('Insights:');
    for (const ins of insights) lines.push(`  - ${ins.text}`);
  }

  lines.push('');
  lines.push('Calculated with Convertam Loan Calculator — convertam.app/calculators/loan-calculator');
  return lines.join('\n');
}
