import { formatCurrency, formatPercent } from '../salary-calculator/format';

const MODE_LABELS = { add: 'Add VAT', remove: 'Remove VAT', breakdown: 'VAT Breakdown', reverse: 'Reverse VAT' };

// Maps the VAT Calculator's own state into the generic shape
// components/tools/financial-shared/FinancialReport.js renders.
export function buildVatReportData({ result, currency, insights, worksheet, reportDetails }) {
  const chartSegments = [
    { label: 'Original Amount', value: result.original, color: '#2563EB', displayValue: formatCurrency(result.original, currency) },
    result.vatAmount > 0 && { label: 'VAT', value: result.vatAmount, color: '#F59E0B', displayValue: formatCurrency(result.vatAmount, currency) },
  ].filter(Boolean);

  const tables = [];
  if (worksheet && worksheet.rows.length > 0) {
    tables.push({
      title: 'Multiple Items',
      head: ['Item', 'Amount', 'VAT', 'Total'],
      rows: [
        ...worksheet.rows.map((r) => [r.name || 'Item', formatCurrency(r.original, currency), formatCurrency(r.vatAmount, currency), formatCurrency(r.total, currency)]),
        ['Totals', formatCurrency(worksheet.totals.original, currency), formatCurrency(worksheet.totals.vatAmount, currency), formatCurrency(worksheet.totals.total, currency)],
      ],
      activeRowIndex: worksheet.rows.length,
    });
  }

  const reportLines = [];
  if (reportDetails?.businessName) reportLines.push({ text: `Business: ${reportDetails.businessName}` });
  if (reportDetails?.invoiceRef) reportLines.push({ text: `Invoice Reference: ${reportDetails.invoiceRef}` });
  if (reportDetails?.notes) reportLines.push({ text: `Notes: ${reportDetails.notes}` });

  return {
    toolName: 'VAT Calculator',
    fileName: `${currency.replace(/[^A-Za-z0-9]/g, '') || 'vat'}-vat-report.pdf`,
    hero: { label: 'Grand Total', value: formatCurrency(result.total, currency), sub: `${MODE_LABELS[result.mode] || 'VAT Calculation'} · ${formatPercent(result.ratePct)} VAT` },
    statCards: [
      { label: 'Original Amount', value: formatCurrency(result.original, currency) },
      { label: 'VAT Amount', value: formatCurrency(result.vatAmount, currency) },
      { label: 'Grand Total', value: formatCurrency(result.total, currency) },
      { label: 'Effective VAT %', value: formatPercent(result.effectiveVatPct, 2) },
    ],
    chart: chartSegments.length > 0 ? { segments: chartSegments, centerLabel: formatPercent(result.effectiveVatPct), centerSubLabel: 'is VAT' } : null,
    insights: [...insights.map((i) => ({ text: i.text, detail: i.detail })), ...reportLines],
    tables,
    privacyNote: 'Your amounts are processed locally and are not stored.',
  };
}
