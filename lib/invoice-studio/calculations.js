import { toCents, fromCents } from './moneyFormat';

// All money math happens in integer cents so summing many rows never drifts
// from binary-float rounding, regardless of how many items or how odd the
// unit prices are.
export function computeItemLine(row) {
  const qty = Number(row.qty) || 0;
  const rate = Number(row.rate) || 0;
  const vatRate = Number(row.vat) || 0;
  const lineSubtotalCents = Math.round(qty * toCents(rate));
  const lineVatCents = Math.round(lineSubtotalCents * (vatRate / 100));
  return {
    lineSubtotalCents,
    lineVatCents,
    lineTotalCents: lineSubtotalCents + lineVatCents,
  };
}

export function computeInvoiceTotals(rows, discountAmount = 0) {
  let subtotalCents = 0;
  let vatCents = 0;
  for (const row of rows) {
    const line = computeItemLine(row);
    subtotalCents += line.lineSubtotalCents;
    vatCents += line.lineVatCents;
  }
  const discountCents = toCents(discountAmount);
  const totalCents = Math.max(0, subtotalCents + vatCents - discountCents);
  return {
    subtotal: fromCents(subtotalCents),
    vat: fromCents(vatCents),
    discount: fromCents(discountCents),
    total: fromCents(totalCents),
  };
}
