// Gemini responseSchema for payslip document understanding. This is the
// PRIMARY (not a fallback) extraction mechanism — see prompt.js's own
// comment for why keyword/pattern matching was abandoned entirely: payslip
// layouts vary too much across companies/countries for any fixed set of
// rules to generalize, whereas a vision model can read a table's actual
// column headers the way a person would.
//
// Every field carries a `status` — 'confirmed' | 'needs_verification' |
// 'not_found' — instead of a bare value, so "the model didn't find this"
// and "the model found this but isn't fully sure" are both real, visible
// states rather than being silently coerced into either a guessed number
// or a blank. Nothing here has a bare boolean "found" the way the old
// local-extraction schema did — status is the one source of truth.
const statusField = { type: 'STRING' }; // 'confirmed' | 'needs_verification' | 'not_found'

const textField = {
  type: 'OBJECT',
  properties: { value: { type: 'STRING' }, status: statusField },
  required: ['status'],
};

const amountField = {
  type: 'OBJECT',
  properties: { amount: { type: 'NUMBER' }, status: statusField },
  required: ['status'],
};

// One row of a dynamic list (allowances/bonuses/deductions/contributions) —
// `label` is the payslip's OWN wording for this line (e.g. "Shift
// Allowance", "Cooperative Deduction"), preserved as-is rather than forced
// into a fixed field name, since no fixed set of names covers every real
// payslip.
const lineItem = {
  type: 'OBJECT',
  properties: { label: { type: 'STRING' }, amount: { type: 'NUMBER' }, status: statusField },
  required: ['label', 'status'],
};

export const payslipExtractSchema = {
  type: 'OBJECT',
  properties: {
    employeeName: textField,
    employerName: textField,
    payPeriod: textField, // the payslip's own wording, e.g. "March 2026" or "Monthly"
    payFrequency: textField, // normalized to one of: hourly | daily | weekly | biweekly | monthly | annually
    currency: textField, // ISO 4217 code, e.g. "NGN"
    basicPay: amountField,
    grossEarnings: amountField,
    netPay: amountField,
    totalDeductions: amountField,
    allowances: { type: 'ARRAY', items: lineItem },
    bonuses: { type: 'ARRAY', items: lineItem }, // bonuses, commissions, overtime pay — any one-off/variable earning
    deductions: { type: 'ARRAY', items: lineItem }, // PAYE/PIT, pension, NHF, loans, advances, union dues, cooperative, other
    contributions: { type: 'ARRAY', items: lineItem }, // employer-paid amounts (e.g. employer pension contribution) — informational, never deducted from the employee's own pay
    // Empty string when grossEarnings - totalDeductions ≈ netPay (within
    // normal rounding); otherwise a short, specific explanation of the
    // mismatch — surfaced to the user as a flag, never silently corrected.
    reconciliationNote: { type: 'STRING' },
  },
  required: [
    'payPeriod', 'payFrequency', 'currency', 'grossEarnings', 'netPay', 'totalDeductions',
    'allowances', 'bonuses', 'deductions', 'contributions', 'reconciliationNote',
  ],
};
