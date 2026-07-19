// Display-only formatting for read-only numbers (result cards, chart
// labels, the conversion table, exported text) — never touches the raw
// numeric values calculations.js works with.

export function formatCurrency(amount, currency) {
  if (!Number.isFinite(amount)) return `${currency}0.00`;
  return `${currency}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatCurrencyCompact(amount, currency) {
  if (!Number.isFinite(amount)) return `${currency}0`;
  return `${currency}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatPercent(value, digits = 1) {
  if (!Number.isFinite(value)) return '0%';
  return `${value.toFixed(digits)}%`;
}
