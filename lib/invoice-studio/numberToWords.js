import { currencyWordsUnit } from './moneyFormat';

const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function chunkWords(n) {
  let s = '';
  if (n >= 100) { s += ONES[Math.floor(n / 100)] + ' hundred '; n %= 100; }
  if (n >= 20) { s += TENS[Math.floor(n / 10)] + ' '; n %= 10; }
  if (n > 0) { s += ONES[n] + ' '; }
  return s;
}

// English long-form, up to billions. Whole-number part only — invoice totals
// are quoted "and NN/100" for the minor unit rather than spelled out further.
export function numberToWords(num) {
  let n = Math.trunc(Math.abs(Number(num) || 0));
  if (n === 0) return 'zero';
  const billions = Math.floor(n / 1e9); n %= 1e9;
  const millions = Math.floor(n / 1e6); n %= 1e6;
  const thousands = Math.floor(n / 1e3); n %= 1e3;
  let str = '';
  if (billions) str += chunkWords(billions) + 'billion ';
  if (millions) str += chunkWords(millions) + 'million ';
  if (thousands) str += chunkWords(thousands) + 'thousand ';
  if (n) str += chunkWords(n);
  return str.trim();
}

export function amountInWords(amount, currencyCode) {
  const whole = Math.trunc(Math.abs(Number(amount) || 0));
  const cents = Math.round((Math.abs(Number(amount) || 0) - whole) * 100);
  const unit = currencyWordsUnit(currencyCode);
  const words = numberToWords(whole).toUpperCase();
  const centsPart = cents > 0 ? ` AND ${cents}/100` : '';
  return `${words} ${unit.toUpperCase()}${centsPart} ONLY`;
}
