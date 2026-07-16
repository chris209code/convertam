import { CURRENCIES, DEFAULT_CURRENCY } from './constants';

function currencyMeta(code) {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES.find((c) => c.code === DEFAULT_CURRENCY);
}

export function currencySymbol(code) {
  return currencyMeta(code).symbol;
}

export function currencyWordsUnit(code) {
  return currencyMeta(code).words;
}

// Money is stored/summed as integer minor units (cents) internally so line
// items and totals never accumulate binary-float rounding error, however
// many rows are added.
export function toCents(amount) {
  return Math.round((Number(amount) || 0) * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

export function formatMoney(amount, code = DEFAULT_CURRENCY) {
  const meta = currencyMeta(code);
  try {
    return new Intl.NumberFormat(meta.locale, {
      style: 'currency',
      currency: meta.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    // Fallback if the runtime's ICU data lacks this currency/locale pairing.
    const v = (Math.round((Number(amount) || 0) * 100) / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${meta.symbol}${v}`;
  }
}
