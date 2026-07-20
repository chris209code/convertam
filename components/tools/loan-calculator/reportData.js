import { formatCurrency, formatPercent } from '../salary-calculator/format';

// Maps the Loan Calculator's own state into the generic shape
// components/tools/financial-shared/FinancialReport.js renders. The full
// amortization schedule is included as its own table — this is the
// calculator whose report is most likely to run to several pages, which
// is exactly the case the shared engine's repeated-header pagination
// exists for.
export function buildLoanReportData({ result, currency, freqLabel, earlyRepayment, insights }) {
  const chartSegments = [
    { label: 'Principal', value: result.financedPrincipal, color: '#2563EB', displayValue: formatCurrency(result.financedPrincipal, currency) },
    result.totalInterestPaid > 0 && { label: 'Interest', value: result.totalInterestPaid, color: '#F59E0B', displayValue: formatCurrency(result.totalInterestPaid, currency) },
    result.fees > 0 && { label: 'Fees', value: result.fees, color: '#7C3AED', displayValue: formatCurrency(result.fees, currency) },
  ].filter(Boolean);

  const statCards = [
    { label: 'Loan Amount', value: formatCurrency(result.principalAmt, currency) },
    { label: 'Interest Paid', value: formatCurrency(result.totalInterestPaid, currency) },
    { label: 'Total Repayment', value: formatCurrency(result.totalRepayment, currency) },
    { label: 'Effective Interest', value: formatPercent(result.effectiveInterestPct) },
    { label: 'Loan End Date', value: result.loanEndDate ? result.loanEndDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—' },
  ];
  if (result.downPaymentAmt > 0) statCards.push({ label: 'Amount Financed', value: formatCurrency(result.financedPrincipal, currency) });

  const allInsights = [...insights];
  if (earlyRepayment) {
    allInsights.push({
      text: `Your extra payment saves ${earlyRepayment.monthsSaved} payment(s) and ${formatCurrency(earlyRepayment.interestSaved, currency)} in interest.`,
      detail: `New payoff date: ${earlyRepayment.newPayoffDate ? earlyRepayment.newPayoffDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}.`,
    });
  }

  return {
    toolName: 'Loan Calculator',
    fileName: `${currency.replace(/[^A-Za-z0-9]/g, '') || 'loan'}-loan-report.pdf`,
    hero: { label: `${freqLabel} Repayment`, value: formatCurrency(result.payment, currency), sub: `${result.numPayments} payments` },
    statCards,
    chart: chartSegments.length > 0 ? { segments: chartSegments, centerLabel: formatCurrency(result.totalRepayment, currency), centerSubLabel: 'Total Cost' } : null,
    insights: allInsights.map((i) => ({ text: i.text, detail: i.detail })),
    tables: [
      {
        title: 'Amortization Schedule',
        head: ['#', 'Date', 'Principal', 'Interest', 'Balance'],
        rows: result.schedule.map((r) => [
          String(r.paymentNumber),
          r.date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
          formatCurrency(r.principalPaid, currency),
          formatCurrency(r.interestPaid, currency),
          formatCurrency(r.remainingBalance, currency),
        ]),
      },
    ],
    privacyNote: 'Your loan information is processed locally and is not stored.',
  };
}
