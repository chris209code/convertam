// Canonical shape of an AI payslip-extraction result — shared by
// aiExtract.js (normalizing the API response) and PayslipUpload.js
// (rendering/editing it). Purely a data shape, not extraction logic: every
// actual field value comes from the AI's document understanding
// (lib/payslip/prompt.js + schema.js), never from local pattern matching.
export const STATUS = {
  CONFIRMED: 'confirmed',
  NEEDS_VERIFICATION: 'needs_verification',
  NOT_FOUND: 'not_found',
};

export function emptyPayslipResult() {
  return {
    employeeName: { value: '', status: STATUS.NOT_FOUND },
    employerName: { value: '', status: STATUS.NOT_FOUND },
    payPeriod: { value: '', status: STATUS.NOT_FOUND },
    payFrequency: { value: '', status: STATUS.NOT_FOUND },
    currency: { value: '', status: STATUS.NOT_FOUND },
    basicPay: { amount: null, status: STATUS.NOT_FOUND },
    grossEarnings: { amount: null, status: STATUS.NOT_FOUND },
    netPay: { amount: null, status: STATUS.NOT_FOUND },
    totalDeductions: { amount: null, status: STATUS.NOT_FOUND },
    allowances: [],
    bonuses: [],
    deductions: [],
    contributions: [],
    reconciliationNote: '',
  };
}

// How many scalar (non-list) fields actually resolved to something other
// than "not_found" — used purely to decide how much weight to give a
// reconciliation warning banner, never to gate whether AI runs (it always
// does; there is no local pass to compare against anymore).
export function confirmedScalarCount(result) {
  const keys = ['basicPay', 'grossEarnings', 'netPay', 'totalDeductions', 'payPeriod', 'payFrequency', 'currency'];
  return keys.filter((k) => result[k]?.status !== STATUS.NOT_FOUND).length;
}
