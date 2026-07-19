// Name -> icon matching for income sources and expense categories, mirroring
// ../salary-calculator/deductionIcons.js's approach (keyword match against a
// possibly custom, user-typed name) so both default and custom rows get a
// sensible icon.
const INCOME_ICONS = {
  'Salary': '💼', 'Business': '🏪', 'Freelance': '💻', 'Bonus': '🎁', 'Other Income': '➕', 'Investment': '📈', 'Rental': '🏘️', 'Gift': '🎀',
};

const EXPENSE_ICONS = {
  'Housing': '🏠', 'Rent': '🏠', 'Food': '🍽️', 'Groceries': '🍽️', 'Transport': '🚗',
  'Utilit': '💡', 'Debt': '💳', 'Education': '🎓', 'School': '🎓',
  'Healthcare': '❤️', 'Medical': '❤️', 'Health': '❤️', 'Family': '👨‍👩‍👧', 'Support': '👨‍👩‍👧',
  'Saving': '🏦', 'Invest': '📈', 'Entertainment': '🎬', 'Subscription': '📱',
  'Personal Care': '🧴', 'Other': '➕',
};

function lookup(map, name) {
  const key = Object.keys(map).find((k) => (name || '').toLowerCase().includes(k.toLowerCase()));
  return key ? map[key] : '➕';
}

export function getIncomeIcon(name) {
  return lookup(INCOME_ICONS, name);
}

export function getExpenseIcon(name) {
  return lookup(EXPENSE_ICONS, name);
}
