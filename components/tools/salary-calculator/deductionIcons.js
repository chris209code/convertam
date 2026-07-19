// Same name -> icon matching the original component used, kept as its
// own module since both the deduction row and the summary/insights cards
// need to look up an icon for a (possibly custom, user-typed) name.
const DEDUCTION_ICONS = {
  'Tax': '🏛️', 'Income Tax': '🏛️', 'PAYE': '🏛️',
  'Pension': '👴', 'Retirement': '👴', 'NHF': '🏠',
  'Health': '❤️', 'NHIS': '❤️', 'Medical': '❤️',
  'Student Loan': '🎓', 'Education': '🎓',
  'Union': '👷', 'Union Dues': '👷',
  'Social Security': '🛡️', 'National Insurance': '🛡️',
  'Mortgage': '🏠', 'Housing': '🏠',
  'Insurance': '🛡️',
  'Other': '➕',
};

export function getDeductionIcon(name) {
  const key = Object.keys(DEDUCTION_ICONS).find((k) => (name || '').toLowerCase().includes(k.toLowerCase()));
  return key ? DEDUCTION_ICONS[key] : '➕';
}
