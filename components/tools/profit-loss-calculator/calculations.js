// Pure calculation logic for the Profit & Loss Calculator — plain
// functions of their arguments, no state/DOM/network, mirroring the
// architecture of the other calculators' calculations.js files. 100%
// client-side by design.

export function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Every division in this module goes through here — returns `fallback`
// (0 by default) instead of NaN/Infinity whenever the denominator is
// zero or negative, which is the one recurring hazard in P&L math (a
// margin, markup, or ratio is only meaningful against a positive base).
export function safeDiv(numerator, denominator, fallback = 0) {
  if (!Number.isFinite(denominator) || denominator <= 0) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

// The eight named operating-expense slots the formula spec calls out
// individually — fixed slots, not a freely-renameable list (that's what
// customExpenses is for). Each supports Fixed Amount or % of Revenue,
// same as the examples (Marketing, Taxes) the spec calls out explicitly.
export const OPEX_FIELDS = [
  { id: 'payroll', label: 'Payroll' },
  { id: 'rent', label: 'Rent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'transport', label: 'Transport / Logistics' },
  { id: 'taxes', label: 'Taxes' },
  { id: 'interest', label: 'Loan Interest' },
  { id: 'otherOpex', label: 'Other Operating Expenses' },
];

// One line item's own amount, given the revenue base a percentage
// applies against — same shape as every other calculator's
// categoryAnnualAmount/deductionAnnualAmount.
export function lineAmount(item, revenueBase) {
  const value = num(item?.value);
  if (!value) return 0;
  return item.mode === 'percent' ? (revenueBase * value) / 100 : value;
}

export function lineEquivalents(item, revenueBase) {
  const value = num(item?.value);
  if (!value || revenueBase <= 0) return { percent: 0, amount: 0 };
  if (item.mode === 'percent') return { percent: value, amount: (revenueBase * value) / 100 };
  return { percent: (value / revenueBase) * 100, amount: value };
}

// Simple mode: a quick answer from just Revenue and Total Cost — no
// COGS/OpEx split, so Gross Profit and Net Profit are the same figure
// here by definition (there's nothing entered to distinguish them).
export function computeSimple({ revenue, totalCost }) {
  const totalRevenue = Math.max(0, num(revenue));
  const totalCosts = Math.max(0, num(totalCost));
  const profit = totalRevenue - totalCosts;
  const margin = safeDiv(profit, totalRevenue) * 100;
  const costPct = safeDiv(totalCosts, totalRevenue) * 100;
  return {
    mode: 'simple', totalRevenue, totalCosts,
    grossProfit: profit, netProfit: profit, profit,
    grossMargin: margin, netMargin: margin, margin, costPct,
    markup: safeDiv(profit, totalCosts) * 100,
    operatingExpensesTotal: 0, cogs: 0,
    hasResults: totalRevenue > 0 || totalCosts > 0,
  };
}

// Detailed mode: the full breakdown. opexValues is { [fieldId]: {mode,value} }
// for the eight named fields; customExpenses is [{id,name,mode,value}].
export function computeDetailed({ salesRevenue, otherIncome, cogs, opexValues, customExpenses }) {
  const salesRevenueAmt = Math.max(0, num(salesRevenue));
  const otherIncomeAmt = Math.max(0, num(otherIncome));
  const totalRevenue = salesRevenueAmt + otherIncomeAmt;
  const cogsAmt = Math.max(0, num(cogs));

  const opexLines = OPEX_FIELDS.map((f) => ({
    id: f.id, name: f.label, custom: false,
    amount: lineAmount(opexValues?.[f.id] || {}, totalRevenue),
  })).filter((l) => l.amount !== 0);

  const customLines = (customExpenses || [])
    .filter((c) => c.value !== '' && c.value != null && num(c.value) !== 0)
    .map((c) => ({ id: c.id, name: c.name, custom: true, amount: lineAmount(c, totalRevenue) }));

  const allOpexLines = [...opexLines, ...customLines];
  const operatingExpensesTotal = allOpexLines.reduce((sum, l) => sum + l.amount, 0);

  const grossProfit = salesRevenueAmt - cogsAmt;
  const netProfit = totalRevenue - cogsAmt - operatingExpensesTotal;

  const grossMargin = safeDiv(grossProfit, salesRevenueAmt) * 100;
  const netMargin = safeDiv(netProfit, totalRevenue) * 100;
  const markup = safeDiv(grossProfit, cogsAmt) * 100;
  const expenseRatio = safeDiv(operatingExpensesTotal, totalRevenue) * 100;

  // Whole-business break-even estimate: assumes Cost of Goods Sold scales
  // with revenue (the gross-margin ratio holds) and Operating Expenses
  // stay fixed — a standard simplification, not the more precise
  // unit-economics break-even in the dedicated section below. Only
  // computed when the gross-margin ratio is positive; a business that
  // loses money on every extra unit of revenue can't "grow into" break-even
  // by scaling revenue, so this is left undefined rather than guessed at.
  const contributionRatio = safeDiv(grossProfit, salesRevenueAmt);
  const breakEvenRevenue = contributionRatio > 0 ? operatingExpensesTotal / contributionRatio : null;

  return {
    mode: 'detailed',
    salesRevenue: salesRevenueAmt, otherIncome: otherIncomeAmt, totalRevenue,
    cogs: cogsAmt, opexLines: allOpexLines, operatingExpensesTotal,
    totalCosts: cogsAmt + operatingExpensesTotal,
    grossProfit, netProfit, profit: netProfit,
    grossMargin, netMargin, margin: netMargin, markup, expenseRatio,
    breakEvenRevenue,
    hasResults: totalRevenue > 0 || cogsAmt > 0 || operatingExpensesTotal > 0,
  };
}

// Highest-to-lowest ranking across every cost line (COGS + every
// populated operating-expense line) — "Do not show empty categories" is
// already satisfied upstream since zero-value lines never make it into
// opexLines, and cogs is only added when > 0.
export function buildExpenseBreakdown(result) {
  if (result.mode !== 'detailed') return [];
  const lines = [...result.opexLines];
  if (result.cogs > 0) lines.unshift({ id: 'cogs', name: 'Cost of Goods Sold', custom: false, amount: result.cogs, isCogs: true });
  const totalCosts = result.cogs + result.operatingExpensesTotal;
  return lines
    .sort((a, b) => b.amount - a.amount)
    .map((l, i) => ({ ...l, rank: i + 1, isLargest: i === 0, pctOfCosts: safeDiv(l.amount, totalCosts) * 100, pctOfRevenue: safeDiv(l.amount, result.totalRevenue) * 100 }));
}

// Practical, non-judgmental business status — thresholds are a documented
// judgment call (same pattern as the DTI bands in the Loan Calculator),
// not derived from the user's own data.
export function buildStatus(result) {
  if (!result.hasResults) return null;
  const { netProfit, netMargin, totalRevenue } = result;
  if (totalRevenue > 0 && Math.abs(netProfit) < totalRevenue * 0.005) {
    return { id: 'break-even', label: 'Break-even', tone: 'amber', detail: 'Revenue and costs are almost exactly matched.' };
  }
  if (netProfit < 0) return { id: 'loss', label: 'Operating at a Loss', tone: 'red', detail: 'Costs currently exceed revenue.' };
  if (netMargin < 5) return { id: 'low-margin', label: 'Low Margin', tone: 'amber', detail: 'Profitable, but with little room for cost increases.' };
  if (netMargin < 15) return { id: 'profitable', label: 'Profitable', tone: 'green', detail: 'A healthy, sustainable net margin.' };
  return { id: 'strong', label: 'Strong Profit', tone: 'green', detail: 'A well above-average net margin.' };
}

// Unit-economics break-even — a separate, more precise calculation from
// the whole-business estimate above, driven by its own dedicated inputs.
export function computeBreakEven({ fixedCosts, sellingPrice, variableCost }) {
  const fixed = Math.max(0, num(fixedCosts));
  const price = Math.max(0, num(sellingPrice));
  const variable = Math.max(0, num(variableCost));
  const contributionPerUnit = price - variable;
  const contributionMargin = safeDiv(contributionPerUnit, price) * 100;
  const breakEvenUnits = contributionPerUnit > 0 ? fixed / contributionPerUnit : null;
  const breakEvenRevenue = breakEvenUnits != null ? breakEvenUnits * price : null;
  return {
    hasResults: fixed > 0 && price > 0,
    fixed, price, variable, contributionPerUnit, contributionMargin, breakEvenUnits, breakEvenRevenue,
  };
}

// Pricing insight — either direction, depending on which the user
// actually filled in: a target margin (-> recommended price) or an
// actual selling price (-> resulting margin). Margin here is defined
// against the selling price (standard margin-based pricing), not cost.
export function computePricing({ costPerUnit, targetMarginPct, sellingPrice }) {
  const cost = Math.max(0, num(costPerUnit));
  if (cost <= 0) return { hasResults: false };

  if (sellingPrice !== '' && sellingPrice != null && num(sellingPrice) > 0) {
    const price = num(sellingPrice);
    const profitPerUnit = price - cost;
    const resultingMargin = safeDiv(profitPerUnit, price) * 100;
    const markupPct = safeDiv(profitPerUnit, cost) * 100;
    return { hasResults: true, mode: 'from-price', cost, price, profitPerUnit, resultingMargin, markupPct };
  }

  const targetMargin = Math.min(99.99, Math.max(0, num(targetMarginPct)));
  if (!targetMargin) return { hasResults: false };
  const recommendedPrice = cost / (1 - targetMargin / 100);
  const profitPerUnit = recommendedPrice - cost;
  const markupPct = safeDiv(profitPerUnit, cost) * 100;
  return { hasResults: true, mode: 'from-margin', cost, targetMargin, recommendedPrice, profitPerUnit, markupPct };
}

// Current vs Previous period comparison — the previous period is entered
// as direct headline figures (not a full re-entered P&L), since that's
// what a business owner actually has on hand from a prior report.
export function comparePeriods(current, previous) {
  const prevRevenue = Math.max(0, num(previous.revenue));
  const prevCosts = Math.max(0, num(previous.totalCosts));
  const prevGrossProfit = num(previous.grossProfit);
  const prevNetProfit = num(previous.netProfit);
  if (prevRevenue <= 0 && prevCosts <= 0 && !prevGrossProfit && !prevNetProfit) return null;

  const prevGrossMargin = safeDiv(prevGrossProfit, prevRevenue) * 100;
  const prevNetMargin = safeDiv(prevNetProfit, prevRevenue) * 100;

  const rows = [
    { id: 'revenue', label: 'Revenue', current: current.totalRevenue, previous: prevRevenue, isPct: false },
    { id: 'costs', label: 'Total Costs', current: current.totalCosts, previous: prevCosts, isPct: false, lowerIsBetter: true },
    { id: 'gross-profit', label: 'Gross Profit', current: current.grossProfit, previous: prevGrossProfit, isPct: false },
    { id: 'net-profit', label: 'Net Profit', current: current.netProfit, previous: prevNetProfit, isPct: false },
    { id: 'gross-margin', label: 'Gross Margin', current: current.grossMargin, previous: prevGrossMargin, isPct: true },
    { id: 'net-margin', label: 'Net Margin', current: current.netMargin, previous: prevNetMargin, isPct: true },
  ].map((r) => {
    const change = r.current - r.previous;
    const pctChange = safeDiv(change * 100, Math.abs(r.previous), null);
    const better = r.lowerIsBetter ? change < 0 : change > 0;
    const flat = Math.abs(change) < 0.005;
    return { ...r, change, pctChange, status: flat ? 'flat' : better ? 'improved' : 'declined' };
  });

  return rows;
}

// Deterministic, plain-language phrasing of numbers already on screen —
// no AI, no invented assumptions. Every insight is gated on the specific
// data it depends on actually being present.
export function buildInsights(result, { breakdown, breakEven, pricing } = {}) {
  const insights = [];
  if (!result.hasResults) return insights;

  if (result.netProfit >= 0) {
    insights.push({ id: 'net-result', icon: 'profit', text: `Your business generated a net profit of ${result.netProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`, detail: `Net margin is ${result.netMargin.toFixed(1)}%.` });
  } else {
    insights.push({ id: 'net-result', icon: 'loss', text: `Your business recorded a net loss of ${Math.abs(result.netProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}.`, detail: `Net margin is ${result.netMargin.toFixed(1)}%.` });
  }

  if (result.mode === 'detailed') {
    const largestOpex = (breakdown || []).filter((l) => !l.isCogs)[0];
    if (largestOpex) {
      insights.push({ id: 'largest-opex', icon: 'expense', text: `${largestOpex.name} is your largest operating expense.`, detail: `${largestOpex.pctOfRevenue.toFixed(1)}% of total revenue.` });
    }

    if (result.operatingExpensesTotal > 0) {
      insights.push({ id: 'expense-ratio', icon: 'percent', text: `Operating expenses consume ${result.expenseRatio.toFixed(1)}% of total revenue.`, detail: 'Based on your current inputs.' });
    }

    if (result.netProfit < 0 && result.breakEvenRevenue != null) {
      const gap = result.breakEvenRevenue - result.totalRevenue;
      if (gap > 0) {
        insights.push({ id: 'break-even-gap', icon: 'target', text: `Revenue must increase by ${gap.toLocaleString(undefined, { maximumFractionDigits: 0 })} to break even.`, detail: `Estimated break-even revenue: ${result.breakEvenRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}.` });
      }
    }
  }

  if (pricing?.hasResults && pricing.mode === 'from-price') {
    insights.push({ id: 'pricing-margin', icon: 'tag', text: `At the current selling price, your markup is ${pricing.markupPct.toFixed(1)}%.`, detail: `That's a ${pricing.resultingMargin.toFixed(1)}% margin per unit.` });
  }

  if (breakEven?.hasResults && breakEven.breakEvenUnits != null) {
    insights.push({ id: 'unit-break-even', icon: 'target', text: `You need to sell ${Math.ceil(breakEven.breakEvenUnits).toLocaleString()} units to break even.`, detail: `That's ${breakEven.breakEvenRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in revenue at your current selling price.` });
  }

  return insights;
}
