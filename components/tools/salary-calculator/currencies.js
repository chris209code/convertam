// Currency list for the Salary Calculator's currency selector. `symbol` is
// what actually gets used as the amount prefix everywhere in the app (it's
// the same simple string the old free-text field used to hold), while
// `code`/`country` only exist to make each dropdown option identifiable.
// Dollar-family and a few other commonly-confused currencies use a
// disambiguated prefix (CA$, A$, HK$, GH₵, ...) instead of a bare symbol so
// two different currencies never render identically once picked.

// Shown first, before the alphabetical "All Currencies" group — chosen for
// population + documented search demand around salary/take-home calculators.
export const POPULAR_CURRENCIES = [
  { code: 'NGN', symbol: '₦', country: 'Nigeria' },
  { code: 'USD', symbol: '$', country: 'United States' },
  { code: 'GBP', symbol: '£', country: 'United Kingdom' },
  { code: 'INR', symbol: '₹', country: 'India' },
  { code: 'EUR', symbol: '€', country: 'Eurozone' },
  { code: 'CAD', symbol: 'CA$', country: 'Canada' },
  { code: 'AUD', symbol: 'A$', country: 'Australia' },
  { code: 'ZAR', symbol: 'R', country: 'South Africa' },
  { code: 'GHS', symbol: 'GH₵', country: 'Ghana' },
  { code: 'KES', symbol: 'KSh', country: 'Kenya' },
  { code: 'PHP', symbol: '₱', country: 'Philippines' },
  { code: 'PKR', symbol: 'Rs', country: 'Pakistan' },
  { code: 'AED', symbol: 'AED', country: 'United Arab Emirates' },
  { code: 'SAR', symbol: 'SAR', country: 'Saudi Arabia' },
  { code: 'EGP', symbol: 'E£', country: 'Egypt' },
  { code: 'SGD', symbol: 'S$', country: 'Singapore' },
  { code: 'MYR', symbol: 'RM', country: 'Malaysia' },
  { code: 'IDR', symbol: 'Rp', country: 'Indonesia' },
  { code: 'BDT', symbol: '৳', country: 'Bangladesh' },
  { code: 'NZD', symbol: 'NZ$', country: 'New Zealand' },
  { code: 'CNY', symbol: '¥', country: 'China' },
  { code: 'JPY', symbol: '¥', country: 'Japan' },
  { code: 'BRL', symbol: 'R$', country: 'Brazil' },
  { code: 'MXN', symbol: 'MX$', country: 'Mexico' },
];

export const OTHER_CURRENCIES = [
  { code: 'ARS', symbol: '$', country: 'Argentina' },
  { code: 'BHD', symbol: 'BD', country: 'Bahrain' },
  { code: 'BOB', symbol: 'Bs', country: 'Bolivia' },
  { code: 'BGN', symbol: 'лв', country: 'Bulgaria' },
  { code: 'KHR', symbol: '៛', country: 'Cambodia' },
  { code: 'XOF', symbol: 'CFA', country: 'Central & West Africa' },
  { code: 'XAF', symbol: 'FCFA', country: 'Central Africa (CEMAC)' },
  { code: 'CLP', symbol: 'CLP$', country: 'Chile' },
  { code: 'COP', symbol: 'COP$', country: 'Colombia' },
  { code: 'CRC', symbol: '₡', country: 'Costa Rica' },
  { code: 'CZK', symbol: 'Kč', country: 'Czech Republic' },
  { code: 'DKK', symbol: 'kr', country: 'Denmark' },
  { code: 'DOP', symbol: 'RD$', country: 'Dominican Republic' },
  { code: 'DZD', symbol: 'DA', country: 'Algeria' },
  { code: 'ETB', symbol: 'Br', country: 'Ethiopia' },
  { code: 'FJD', symbol: 'FJ$', country: 'Fiji' },
  { code: 'GEL', symbol: '₾', country: 'Georgia' },
  { code: 'HKD', symbol: 'HK$', country: 'Hong Kong' },
  { code: 'HUF', symbol: 'Ft', country: 'Hungary' },
  { code: 'ISK', symbol: 'kr', country: 'Iceland' },
  { code: 'ILS', symbol: '₪', country: 'Israel' },
  { code: 'IQD', symbol: 'ID', country: 'Iraq' },
  { code: 'JMD', symbol: 'J$', country: 'Jamaica' },
  { code: 'JOD', symbol: 'JD', country: 'Jordan' },
  { code: 'KZT', symbol: '₸', country: 'Kazakhstan' },
  { code: 'KRW', symbol: '₩', country: 'South Korea' },
  { code: 'KWD', symbol: 'KD', country: 'Kuwait' },
  { code: 'LBP', symbol: 'LL', country: 'Lebanon' },
  { code: 'LKR', symbol: 'Rs', country: 'Sri Lanka' },
  { code: 'LYD', symbol: 'LD', country: 'Libya' },
  { code: 'MAD', symbol: 'DH', country: 'Morocco' },
  { code: 'MMK', symbol: 'K', country: 'Myanmar' },
  { code: 'NPR', symbol: 'Rs', country: 'Nepal' },
  { code: 'NOK', symbol: 'kr', country: 'Norway' },
  { code: 'OMR', symbol: 'OMR', country: 'Oman' },
  { code: 'PEN', symbol: 'S/', country: 'Peru' },
  { code: 'PLN', symbol: 'zł', country: 'Poland' },
  { code: 'QAR', symbol: 'QAR', country: 'Qatar' },
  { code: 'RON', symbol: 'lei', country: 'Romania' },
  { code: 'RUB', symbol: '₽', country: 'Russia' },
  { code: 'RWF', symbol: 'RF', country: 'Rwanda' },
  { code: 'RSD', symbol: 'din', country: 'Serbia' },
  { code: 'SEK', symbol: 'kr', country: 'Sweden' },
  { code: 'CHF', symbol: 'Fr', country: 'Switzerland' },
  { code: 'TWD', symbol: 'NT$', country: 'Taiwan' },
  { code: 'TZS', symbol: 'TSh', country: 'Tanzania' },
  { code: 'THB', symbol: '฿', country: 'Thailand' },
  { code: 'TTD', symbol: 'TT$', country: 'Trinidad & Tobago' },
  { code: 'TND', symbol: 'DT', country: 'Tunisia' },
  { code: 'TRY', symbol: '₺', country: 'Turkey' },
  { code: 'UGX', symbol: 'USh', country: 'Uganda' },
  { code: 'UAH', symbol: '₴', country: 'Ukraine' },
  { code: 'UYU', symbol: '$U', country: 'Uruguay' },
  { code: 'VND', symbol: '₫', country: 'Vietnam' },
  { code: 'ZMW', symbol: 'ZK', country: 'Zambia' },
  { code: 'ZWL', symbol: 'Z$', country: 'Zimbabwe' },
];

export const ALL_CURRENCIES = [...POPULAR_CURRENCIES, ...OTHER_CURRENCIES];

export function symbolForCode(code) {
  const match = ALL_CURRENCIES.find((c) => c.code === code);
  return match ? match.symbol : '₦';
}
