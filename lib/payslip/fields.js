// Canonical payslip field list — the single source of truth shared by
// local layout-aware extraction (layoutExtract.js), the AI fallback's
// Gemini schema/prompt (schema.js/prompt.js), and the review UI
// (PayslipUpload.js). Every field is either an `amount` (a currency figure)
// or `text` (pay period / currency code) and always carries a `found`
// flag — "not found" is a real, displayed state, never silently defaulted
// or guessed at.
export const AMOUNT_FIELD_KEYS = [
  'basicPay', 'grossEarnings', 'allowances', 'bonuses',
  'paye', 'pension', 'nhf', 'otherDeductions', 'totalDeductions', 'netPay',
];
export const TEXT_FIELD_KEYS = ['payPeriod', 'currencyCode'];
export const ALL_FIELD_KEYS = [...AMOUNT_FIELD_KEYS, ...TEXT_FIELD_KEYS];

export const FIELD_DEFS = [
  { key: 'basicPay', label: 'Basic Pay', type: 'amount', section: 'earnings' },
  { key: 'grossEarnings', label: 'Gross / Total Earnings', type: 'amount', section: 'earnings' },
  { key: 'allowances', label: 'Allowances', type: 'amount', section: 'earnings' },
  { key: 'bonuses', label: 'Bonuses', type: 'amount', section: 'earnings' },
  { key: 'paye', label: 'PAYE / PIT (Income Tax)', type: 'amount', section: 'deductions' },
  { key: 'pension', label: 'Pension', type: 'amount', section: 'deductions' },
  { key: 'nhf', label: 'NHF', type: 'amount', section: 'deductions' },
  { key: 'otherDeductions', label: 'Other Deductions', type: 'amount', section: 'deductions' },
  { key: 'totalDeductions', label: 'Total Deductions', type: 'amount', section: 'deductions' },
  { key: 'netPay', label: 'Net Pay', type: 'amount', section: 'netpay' },
  { key: 'payPeriod', label: 'Pay Period', type: 'text', section: null },
  { key: 'currencyCode', label: 'Currency', type: 'text', section: null },
];

export function fieldDef(key) {
  return FIELD_DEFS.find((f) => f.key === key) || null;
}

// The empty/"not found everywhere" result shape — every extractor (local
// layout parse, OCR, AI fallback) returns exactly this shape so the review
// UI never has to special-case which one produced it.
export function emptyFieldResult() {
  const fields = {};
  for (const key of AMOUNT_FIELD_KEYS) fields[key] = { found: false, amount: null, label: '' };
  for (const key of TEXT_FIELD_KEYS) fields[key] = { found: false, value: '' };
  return fields;
}

// How many amount fields actually got a value — the reliability signal the
// UI uses to decide how prominently to surface the optional AI fallback
// (never auto-triggers it; this only affects how loudly it's offered).
export function foundAmountCount(fields) {
  return AMOUNT_FIELD_KEYS.filter((k) => fields[k]?.found).length;
}
