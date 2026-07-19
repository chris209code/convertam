// Pure calculation logic for the Expense & Budget Calculator. Mirrors the
// architecture of ../salary-calculator/calculations.js (plain functions of
// their arguments, no state/DOM/network — 100% client-side) but is its own
// independent module so nothing here can ever affect the Salary Calculator.

// Period-conversion convention for this tool: calendar-based (Daily x365,
// Weekly x52, Monthly x12, Yearly x1). This is DELIBERATELY different from
// the Salary Calculator's work-based convention (its "Daily" is x260, i.e.
// working days only) — that tool converts wages tied to a work schedule,
// while this tool budgets a household's whole income and spending across
// every day of the year, so a calendar-day convention is the correct one
// here rather than reusing the work-day figure.
export const PERIODS = [
  { id: 'daily', label: 'Daily', multiplier: 365 },
  { id: 'weekly', label: 'Weekly', multiplier: 52 },
  { id: 'monthly', label: 'Monthly', multiplier: 12 },
  { id: 'yearly', label: 'Yearly', multiplier: 1 },
];

export function periodById(id) {
  return PERIODS.find((p) => p.id === id) || PERIODS.find((p) => p.id === 'monthly');
}

export function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export function perPeriod(annualAmount, periodId) {
  const p = periodById(periodId);
  if (!Number.isFinite(annualAmount) || !p.multiplier) return 0;
  return annualAmount / p.multiplier;
}

// A category's own annual amount, given the annual income it applies
// against and the current period's multiplier — same shape as the Salary
// Calculator's deductionAnnualAmount, minus the pre/post-tax base split
// (every category here shares one base: total annual income).
export function categoryAnnualAmount(category, annualIncome, periodMultiplier) {
  const value = num(category.value);
  if (!value) return 0;
  return category.mode === 'percent' ? (annualIncome * value) / 100 : value * periodMultiplier;
}

// Bidirectional-display helper — the "did you mean an amount?" / live
// equivalent pattern from DeductionRow, generalized for expense categories.
export function categoryEquivalents(category, annualIncome, periodMultiplier) {
  const value = num(category.value);
  if (!value || annualIncome <= 0) return { percent: 0, amountPerPeriod: 0 };
  if (category.mode === 'percent') {
    const annual = (annualIncome * value) / 100;
    return { percent: value, amountPerPeriod: annual / periodMultiplier };
  }
  const annual = value * periodMultiplier;
  return { percent: (annual / annualIncome) * 100, amountPerPeriod: value };
}

const SAVINGS_KEYWORDS = ['saving', 'invest'];

function isSavingsCategory(name) {
  return SAVINGS_KEYWORDS.some((k) => (name || '').toLowerCase().includes(k));
}

// The full aggregate calculation. Total Expenses includes every category
// (Savings/Investment included) — Total Savings/Investment is then broken
// out of that same total purely for its own stat card, exactly like the
// Salary Calculator breaks Tax/Pension out of Total Deductions without
// double-subtracting them.
//
// Disposable Income vs Remaining Balance are deliberately two different
// numbers: Disposable Income is what's left after non-savings spending
// (available to either spend further or save) — Remaining Balance is the
// true bottom line, after savings are also accounted for. When there is no
// dedicated Savings/Investment category, the two figures are identical.
export function computeBudget({ incomeSources, incomePeriod, expenseCategories }) {
  const periodData = periodById(incomePeriod);

  const incomeAmounts = (incomeSources || [])
    .filter((s) => s.amount !== '' && s.amount != null)
    .map((s) => ({ ...s, annualAmount: num(s.amount) * periodData.multiplier }));
  const totalAnnualIncome = incomeAmounts.reduce((sum, s) => sum + s.annualAmount, 0);

  const activeCategories = (expenseCategories || []).filter((c) => c.value !== '' && c.value != null && num(c.value) !== 0);
  const expenseAmounts = activeCategories.map((c) => ({
    ...c,
    annualAmount: categoryAnnualAmount(c, totalAnnualIncome, periodData.multiplier),
  }));
  const totalAnnualExpenses = expenseAmounts.reduce((sum, c) => sum + c.annualAmount, 0);

  const savingsCategory = expenseAmounts.find((c) => isSavingsCategory(c.name));
  const totalAnnualSavings = savingsCategory ? savingsCategory.annualAmount : 0;
  const nonSavingsExpenses = totalAnnualExpenses - totalAnnualSavings;

  const disposableIncome = totalAnnualIncome - nonSavingsExpenses;
  const remainingBalance = totalAnnualIncome - totalAnnualExpenses;

  const expenseRatio = totalAnnualIncome > 0 ? (totalAnnualExpenses / totalAnnualIncome) * 100 : 0;
  const savingsRate = totalAnnualIncome > 0 ? (totalAnnualSavings / totalAnnualIncome) * 100 : 0;

  return {
    periodData,
    incomeAmounts, totalAnnualIncome,
    expenseAmounts, totalAnnualExpenses,
    savingsCategory, totalAnnualSavings, nonSavingsExpenses,
    disposableIncome, remainingBalance,
    expenseRatio, savingsRate,
    hasResults: totalAnnualIncome > 0,
    hasExpenses: expenseAmounts.length > 0,
  };
}

// Budget Status classification — practical, non-judgmental wording, driven
// entirely by remainingBalance relative to income (a break-even band close
// to zero is treated as its own state rather than forced into surplus/over).
export function buildBudgetStatus(result) {
  if (!result.hasResults) return null;
  const { remainingBalance, totalAnnualIncome } = result;
  const ratio = totalAnnualIncome > 0 ? remainingBalance / totalAnnualIncome : 0;

  if (Math.abs(remainingBalance) < totalAnnualIncome * 0.005) {
    return { id: 'break-even', label: 'Break-even', tone: 'amber', detail: 'Your income and expenses are almost exactly matched, with little left over either way.' };
  }
  if (remainingBalance < 0) {
    return { id: 'over-budget', label: 'Over Budget', tone: 'red', detail: 'Your planned expenses are higher than your income. Consider reviewing your largest categories below.' };
  }
  if (ratio < 0.10) {
    return { id: 'tight-budget', label: 'Tight Budget', tone: 'amber', detail: 'You have a small surplus, but little room for the unexpected.' };
  }
  return { id: 'healthy-surplus', label: 'Healthy Surplus', tone: 'green', detail: 'Your income comfortably covers your expenses, with a healthy amount left over.' };
}

// Deterministic Essential / Lifestyle / Savings-Investment classification —
// used both for the always-on Income Allocation summary and the optional
// 50/30/20 guideline comparison, so the two features can never disagree
// with each other. Unmatched (fully custom) categories default to
// Lifestyle rather than assuming they're essential.
const ESSENTIAL_KEYWORDS = ['housing', 'rent', 'food', 'transport', 'utilit', 'debt', 'healthcare', 'medical', 'health', 'education', 'family', 'school'];
const LIFESTYLE_KEYWORDS = ['entertainment', 'subscription', 'personal care', 'other'];

export function classifyCategory(name) {
  const n = (name || '').toLowerCase();
  if (isSavingsCategory(n)) return 'savings';
  if (ESSENTIAL_KEYWORDS.some((k) => n.includes(k))) return 'essential';
  if (LIFESTYLE_KEYWORDS.some((k) => n.includes(k))) return 'lifestyle';
  return 'lifestyle';
}

export function buildIncomeAllocation(result) {
  if (!result.hasResults) return null;
  const groups = { essential: 0, lifestyle: 0, savings: 0 };
  for (const c of result.expenseAmounts) {
    groups[classifyCategory(c.name)] += c.annualAmount;
  }
  const remaining = Math.max(0, result.totalAnnualIncome - groups.essential - groups.lifestyle - groups.savings);
  const pct = (v) => (result.totalAnnualIncome > 0 ? (v / result.totalAnnualIncome) * 100 : 0);
  return [
    { id: 'essential', label: 'Essential', value: groups.essential, pct: pct(groups.essential), color: '#2563EB' },
    { id: 'lifestyle', label: 'Lifestyle', value: groups.lifestyle, pct: pct(groups.lifestyle), color: '#F59E0B' },
    { id: 'savings', label: 'Savings & Investment', value: groups.savings, pct: pct(groups.savings), color: '#059669' },
    { id: 'remaining', label: 'Remaining', value: remaining, pct: pct(remaining), color: '#94A3B8' },
  ];
}

// 50/30/20 is an optional guideline comparison, not a rule enforced on the
// data — this only compares the same Essential/Lifestyle/Savings totals
// already computed above against the textbook 50/30/20 split.
export function build503020Comparison(result) {
  const allocation = buildIncomeAllocation(result);
  if (!allocation) return null;
  const byId = Object.fromEntries(allocation.map((a) => [a.id, a]));
  return [
    { id: 'needs', label: 'Needs', guideline: 50, actual: byId.essential.pct },
    { id: 'wants', label: 'Wants', guideline: 30, actual: byId.lifestyle.pct },
    { id: 'savings', label: 'Savings & Debt Repayment', guideline: 20, actual: byId.savings.pct },
  ];
}

// Highest-to-lowest ranked breakdown — "Do not show empty categories" is
// already satisfied upstream since computeBudget only ever includes
// categories with a non-zero value in expenseAmounts.
export function buildRankedExpenses(result) {
  return [...result.expenseAmounts]
    .sort((a, b) => b.annualAmount - a.annualAmount)
    .map((c, i) => ({ ...c, rank: i + 1, isLargest: i === 0, pctOfExpenses: result.totalAnnualExpenses > 0 ? (c.annualAmount / result.totalAnnualExpenses) * 100 : 0 }));
}

// Weekly / Monthly / Yearly conversion table — deliberately only these
// three rows (not Daily) per spec. Highlighting only applies when the
// selected income period is one of these three; a Daily selection simply
// leaves no row highlighted rather than guessing a nearest match.
const TABLE_PERIODS = ['weekly', 'monthly', 'yearly'];

export function buildPeriodTable(result) {
  return TABLE_PERIODS.map((id) => {
    const p = periodById(id);
    return {
      id, label: p.label,
      income: result.totalAnnualIncome / p.multiplier,
      expenses: result.totalAnnualExpenses / p.multiplier,
      balance: result.remainingBalance / p.multiplier,
    };
  });
}

// Plain-language, deterministic phrasing of numbers already on screen —
// no AI, no invented assumptions. Insights that depend on data the user
// hasn't entered (e.g. no savings category) are omitted rather than shown
// as a hollow zero.
export function buildInsights(result, incomePeriod) {
  const insights = [];
  if (!result.hasResults || !result.hasExpenses) return insights;

  const ranked = buildRankedExpenses(result);
  const largest = ranked[0];
  if (largest) {
    insights.push({
      id: 'largest-category',
      icon: 'chart',
      text: `${largest.name || 'Your largest category'} is your biggest expense, at ${largest.pctOfExpenses.toFixed(1)}% of total spending.`,
      detail: `That's ${perPeriod(largest.annualAmount, incomePeriod).toLocaleString(undefined, { maximumFractionDigits: 0 })} every ${periodById(incomePeriod).label.toLowerCase()}.`,
    });
  }

  if (result.remainingBalance < 0) {
    insights.push({
      id: 'over-budget',
      icon: 'warning',
      text: `Your expenses exceed your income by ${Math.abs(result.expenseRatio - 100).toFixed(1)}%.`,
      detail: `You're short by ${Math.abs(perPeriod(result.remainingBalance, incomePeriod)).toLocaleString(undefined, { maximumFractionDigits: 0 })} every ${periodById(incomePeriod).label.toLowerCase()}.`,
    });
  } else {
    insights.push({
      id: 'expense-ratio',
      icon: 'percent',
      text: `You spend ${result.expenseRatio.toFixed(1)}% of your income, keeping ${(100 - result.expenseRatio).toFixed(1)}% unallocated.`,
      detail: 'Based on your current inputs.',
    });
  }

  if (result.savingsCategory) {
    insights.push({
      id: 'savings-rate',
      icon: 'shield',
      text: `You're saving ${result.savingsRate.toFixed(1)}% of your income.`,
      detail: `That's ${perPeriod(result.totalAnnualSavings, incomePeriod).toLocaleString(undefined, { maximumFractionDigits: 0 })} every ${periodById(incomePeriod).label.toLowerCase()}.`,
    });
  }

  return insights;
}
