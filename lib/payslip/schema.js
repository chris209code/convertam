// Gemini responseSchema for the payslip AI-extraction fallback — kept in
// the exact same shape lib/payslip/fields.js and layoutExtract.js already
// use ({ found, amount } / { found, value }), so the review UI never has
// to know or care whether a result came from local layout parsing, OCR, or
// this AI fallback.
const amountField = {
  type: 'OBJECT',
  properties: { found: { type: 'BOOLEAN' }, amount: { type: 'NUMBER' }, label: { type: 'STRING' } },
  required: ['found'],
};
const textField = {
  type: 'OBJECT',
  properties: { found: { type: 'BOOLEAN' }, value: { type: 'STRING' } },
  required: ['found'],
};

export const payslipExtractSchema = {
  type: 'OBJECT',
  properties: {
    basicPay: amountField,
    grossEarnings: amountField,
    allowances: amountField,
    bonuses: amountField,
    paye: amountField,
    pension: amountField,
    nhf: amountField,
    otherDeductions: amountField,
    totalDeductions: amountField,
    netPay: amountField,
    payPeriod: textField, // one of: hourly | daily | weekly | biweekly | monthly | annually
    currencyCode: textField, // ISO 4217 code, e.g. "NGN"
  },
  required: [
    'basicPay', 'grossEarnings', 'allowances', 'bonuses', 'paye', 'pension',
    'nhf', 'otherDeductions', 'totalDeductions', 'netPay', 'payPeriod', 'currencyCode',
  ],
};
