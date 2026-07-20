import { formatCurrency, formatPercent } from '../salary-calculator/format';

const MODE_LABELS = { add: 'Add VAT', remove: 'Remove VAT', breakdown: 'VAT Breakdown', reverse: 'Reverse VAT' };

// Plain-text summary used by both Copy Results and Share — mirrors the
// other calculators' exportText.js so Copy/Share can never disagree.
// Advanced report details (business name, notes, invoice reference) are
// only ever passed in here when the user actually filled them — this is
// the one place they surface, since they're collapsed out of the main
// on-screen workflow by design.
export function buildVatSummaryText(result, currency, insights, worksheet, reportDetails) {
  const lines = [
    `VAT Summary — ${MODE_LABELS[result.mode] || 'VAT Calculation'}`,
    '',
  ];

  if (reportDetails?.businessName) lines.push(`Business: ${reportDetails.businessName}`);
  if (reportDetails?.invoiceRef) lines.push(`Invoice Reference: ${reportDetails.invoiceRef}`);
  if (reportDetails?.businessName || reportDetails?.invoiceRef) lines.push('');

  lines.push(
    `VAT Rate: ${formatPercent(result.ratePct)}`,
    `Original Amount: ${formatCurrency(result.original, currency)}`,
    `VAT Amount: ${formatCurrency(result.vatAmount, currency)}`,
    `Grand Total: ${formatCurrency(result.total, currency)}`,
    `Effective VAT %: ${formatPercent(result.effectiveVatPct, 2)}`,
  );

  if (worksheet && worksheet.rows.length > 0) {
    lines.push('');
    lines.push('Items:');
    for (const r of worksheet.rows) {
      lines.push(`  ${r.name || 'Item'}: ${formatCurrency(r.original, currency)} + VAT ${formatCurrency(r.vatAmount, currency)} = ${formatCurrency(r.total, currency)}`);
    }
    lines.push(`  Totals: ${formatCurrency(worksheet.totals.original, currency)} + VAT ${formatCurrency(worksheet.totals.vatAmount, currency)} = ${formatCurrency(worksheet.totals.total, currency)}`);
  }

  if (insights.length > 0) {
    lines.push('');
    lines.push('Business Insights:');
    for (const ins of insights) lines.push(`  - ${ins.text}`);
  }

  if (reportDetails?.notes) {
    lines.push('');
    lines.push(`Notes: ${reportDetails.notes}`);
  }

  lines.push('');
  lines.push('Calculated with Convertam VAT Calculator — convertam.app/calculators/vat-calculator');
  return lines.join('\n');
}
