// Pure calculation logic for the Break-even Calculator. Same architecture
// as every other calculator in the suite (plain functions of their
// arguments, no state/DOM/network, 100% client-side) and its own
// independent module — nothing here can affect any other calculator.

export function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Fixed and Variable Costs are each the live sum of their itemized rows —
// same "named rows sum to a total" pattern as the Profit & Loss
// Calculator's operating expenses and the Expense & Budget Calculator's
// categories, rather than a separate manual total that could disagree
// with the rows under it. Negative row values are clamped to 0 so a
// pasted or malformed value can never pull a total negative.
export function sumRows(rows) {
  return (rows || []).reduce((sum, r) => sum + Math.max(0, num(r.value)), 0);
}

export function defaultFixedCostRows() {
  return [
    { id: 'rent', name: 'Rent', value: '' },
    { id: 'salaries', name: 'Salaries', value: '' },
    { id: 'utilities', name: 'Utilities', value: '' },
    { id: 'insurance', name: 'Insurance', value: '' },
    { id: 'marketing', name: 'Marketing', value: '' },
    { id: 'loan-payments', name: 'Loan Payments', value: '' },
    { id: 'other-fixed', name: 'Other Fixed Costs', value: '' },
  ];
}

export function defaultVariableCostRows() {
  return [
    { id: 'raw-materials', name: 'Raw Materials', value: '' },
    { id: 'packaging', name: 'Packaging', value: '' },
    { id: 'delivery', name: 'Delivery', value: '' },
    { id: 'commission', name: 'Commission', value: '' },
    { id: 'transaction-fees', name: 'Transaction Fees', value: '' },
    { id: 'other-variable', name: 'Other Variable Costs', value: '' },
  ];
}

// The core break-even engine. Every denominator that can be zero or
// negative is guarded — canBreakEven is false whenever contribution per
// unit isn't strictly positive, and every value derived from dividing by
// it is null in that case rather than NaN/Infinity.
export function computeBreakEven({ fixedCostRows, variableCostRows, sellingPrice, expectedUnits }) {
  const fixedCosts = sumRows(fixedCostRows);
  const variableCostPerUnit = sumRows(variableCostRows);
  const price = Math.max(0, num(sellingPrice));
  const expectedUnitsNum = Math.max(0, num(expectedUnits));

  const contributionPerUnit = price - variableCostPerUnit;
  const canBreakEven = contributionPerUnit > 0;
  const contributionMarginRatio = price > 0 ? (contributionPerUnit / price) * 100 : 0;
  const variableCostRatio = price > 0 ? (variableCostPerUnit / price) * 100 : 0;

  const breakEvenUnits = canBreakEven ? fixedCosts / contributionPerUnit : null;
  const breakEvenRevenue = breakEvenUnits != null ? breakEvenUnits * price : null;

  const expectedRevenue = expectedUnitsNum * price;
  const expectedCosts = fixedCosts + expectedUnitsNum * variableCostPerUnit;
  const expectedProfit = expectedRevenue - expectedCosts;

  const marginOfSafetyUnits = breakEvenUnits != null ? expectedUnitsNum - breakEvenUnits : null;
  const marginOfSafetyPct = marginOfSafetyUnits != null && expectedUnitsNum > 0 ? (marginOfSafetyUnits / expectedUnitsNum) * 100 : null;

  const hasResults = fixedCosts > 0 || price > 0 || variableCostPerUnit > 0 || expectedUnitsNum > 0;

  return {
    fixedCosts, variableCostPerUnit, price, expectedUnits: expectedUnitsNum,
    contributionPerUnit, canBreakEven, contributionMarginRatio, variableCostRatio,
    breakEvenUnits, breakEvenRevenue,
    expectedRevenue, expectedCosts, expectedProfit,
    marginOfSafetyUnits, marginOfSafetyPct,
    hasResults,
  };
}

// A Total Cost line and a Revenue line across a unit range, for the
// break-even chart — the range always stretches past both the break-even
// point and the expected-sales point so both are visible on screen no
// matter how far apart they are.
export function buildChartSeries(result, points = 24) {
  if (!result.hasResults || !result.canBreakEven) return null;
  const maxUnits = Math.max(result.breakEvenUnits * 1.6, result.expectedUnits * 1.3, 10);
  const step = maxUnits / points;
  const series = [];
  for (let i = 0; i <= points; i++) {
    const units = step * i;
    series.push({
      units,
      totalCost: result.fixedCosts + units * result.variableCostPerUnit,
      revenue: units * result.price,
    });
  }
  return {
    series, maxUnits,
    breakEvenUnits: result.breakEvenUnits, breakEvenRevenue: result.breakEvenRevenue,
    expectedUnits: result.expectedUnits, expectedRevenue: result.expectedRevenue,
  };
}

// What-If Simulator — mirrors the Profit & Loss Calculator's
// computeWhatIf/buildWhatIfInsight pair: a set of independent levers
// (percentage deltas for price/variable cost/fixed costs, plus a direct
// projected-units override) that only ever produce a *projected* result.
// The caller's actual inputs are never touched.
export function computeWhatIf(base, { priceDeltaPct, variableCostDeltaPct, fixedCostDeltaPct, projectedUnits }) {
  if (!base?.hasResults) return { hasResults: false };
  const priceMult = 1 + num(priceDeltaPct) / 100;
  const variableMult = 1 + num(variableCostDeltaPct) / 100;
  const fixedMult = 1 + num(fixedCostDeltaPct) / 100;

  const price = Math.max(0, base.price * priceMult);
  const variableCostPerUnit = Math.max(0, base.variableCostPerUnit * variableMult);
  const fixedCosts = Math.max(0, base.fixedCosts * fixedMult);
  const units = projectedUnits !== '' && projectedUnits != null ? Math.max(0, num(projectedUnits)) : base.expectedUnits;

  const contributionPerUnit = price - variableCostPerUnit;
  const canBreakEven = contributionPerUnit > 0;
  const breakEvenUnits = canBreakEven ? fixedCosts / contributionPerUnit : null;
  const breakEvenRevenue = breakEvenUnits != null ? breakEvenUnits * price : null;
  const expectedRevenue = units * price;
  const expectedCosts = fixedCosts + units * variableCostPerUnit;
  const expectedProfit = expectedRevenue - expectedCosts;

  return {
    price, variableCostPerUnit, fixedCosts, expectedUnits: units,
    contributionPerUnit, canBreakEven, breakEvenUnits, breakEvenRevenue,
    expectedRevenue, expectedCosts, expectedProfit,
    hasResults: true,
  };
}

export function buildWhatIfInsight(base, projected, deltas) {
  if (!base?.hasResults || !projected?.hasResults) return null;
  const parts = [];
  if (num(deltas.priceDeltaPct)) parts.push(`selling price ${num(deltas.priceDeltaPct) > 0 ? 'up' : 'down'} ${Math.abs(num(deltas.priceDeltaPct))}%`);
  if (num(deltas.variableCostDeltaPct)) parts.push(`variable cost ${num(deltas.variableCostDeltaPct) > 0 ? 'up' : 'down'} ${Math.abs(num(deltas.variableCostDeltaPct))}%`);
  if (num(deltas.fixedCostDeltaPct)) parts.push(`fixed costs ${num(deltas.fixedCostDeltaPct) > 0 ? 'up' : 'down'} ${Math.abs(num(deltas.fixedCostDeltaPct))}%`);
  if (deltas.projectedUnits !== '' && deltas.projectedUnits != null && num(deltas.projectedUnits) !== base.expectedUnits) {
    parts.push(`expected units changed to ${Math.round(num(deltas.projectedUnits)).toLocaleString()}`);
  }
  if (parts.length === 0) return null;

  if (!projected.canBreakEven) {
    return {
      id: 'what-if', icon: 'warning',
      text: `With ${parts.join(' and ')}, break-even can no longer be reached.`,
      detail: 'Selling price no longer covers variable cost per unit in this scenario.',
    };
  }

  const unitsDelta = base.breakEvenUnits != null ? base.breakEvenUnits - projected.breakEvenUnits : null;
  return {
    id: 'what-if', icon: 'target',
    text: `With ${parts.join(' and ')}, break-even moves to ${Math.ceil(projected.breakEvenUnits).toLocaleString()} units.`,
    detail: unitsDelta != null && Math.round(unitsDelta) !== 0
      ? `That's ${Math.ceil(Math.abs(unitsDelta)).toLocaleString()} units ${unitsDelta > 0 ? 'fewer' : 'more'} than your current break-even.`
      : undefined,
  };
}

// Plain-language, deterministic phrasing of numbers already on screen —
// no AI. Money figures are left as bare numbers (no currency symbol),
// same convention as the Expense & Budget and Profit & Loss calculators'
// buildInsights — the currency symbol is a presentation concern applied
// by whoever renders this text, not something this module needs to know.
export function buildInsights(result, { fixedCostRows, variableCostRows }) {
  const insights = [];
  if (!result.hasResults) return insights;

  if (!result.canBreakEven) {
    insights.push({
      id: 'cannot-break-even', icon: 'warning',
      text: 'Break-even cannot be reached at the current selling price and variable cost.',
      detail: 'Raise your selling price or reduce your variable cost per unit so it falls below the selling price.',
    });
    return insights;
  }

  insights.push({
    id: 'units-needed', icon: 'target',
    text: `You need to sell ${Math.ceil(result.breakEvenUnits).toLocaleString()} units to cover all costs.`,
    detail: `That's ${result.breakEvenRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} in revenue at your current selling price.`,
  });

  if (result.expectedUnits > 0) {
    const isProfit = result.expectedProfit >= 0;
    insights.push({
      id: 'expected-outcome', icon: isProfit ? 'trending' : 'warning',
      text: `At ${result.expectedUnits.toLocaleString()} units, your expected ${isProfit ? 'profit' : 'loss'} is ${Math.abs(result.expectedProfit).toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
      detail: isProfit ? undefined : 'Consider raising price, cutting costs, or increasing volume.',
    });
  }

  const activeVariable = (variableCostRows || []).filter((r) => num(r.value) > 0);
  if (activeVariable.length > 0) {
    const largest = [...activeVariable].sort((a, b) => num(b.value) - num(a.value))[0];
    insights.push({
      id: 'largest-variable', icon: 'chart',
      text: `${largest.name || 'A custom item'} is your largest variable cost.`,
      detail: `${num(largest.value).toLocaleString(undefined, { maximumFractionDigits: 2 })} per unit.`,
    });
  }

  const activeFixed = (fixedCostRows || []).filter((r) => num(r.value) > 0);
  if (activeFixed.length > 0) {
    const largest = [...activeFixed].sort((a, b) => num(b.value) - num(a.value))[0];
    insights.push({
      id: 'largest-fixed', icon: 'chart',
      text: `${largest.name || 'A custom item'} is your largest fixed cost.`,
      detail: `${num(largest.value).toLocaleString(undefined, { maximumFractionDigits: 0 })} per period.`,
    });
  }

  if (result.marginOfSafetyPct != null) {
    if (result.marginOfSafetyPct >= 0) {
      insights.push({
        id: 'margin-of-safety', icon: 'shield',
        text: `You currently have a ${result.marginOfSafetyPct.toFixed(0)}% margin of safety.`,
        detail: `Sales can drop by ${Math.floor(result.marginOfSafetyUnits).toLocaleString()} units before you fall below break-even.`,
      });
    } else {
      insights.push({
        id: 'below-break-even', icon: 'warning',
        text: `Your expected sales are ${Math.abs(result.marginOfSafetyPct).toFixed(0)}% below break-even.`,
        detail: `You need ${Math.ceil(Math.abs(result.marginOfSafetyUnits)).toLocaleString()} more units to break even.`,
      });
    }
  }

  insights.push({
    id: 'contribution-margin', icon: 'percent',
    text: `Your contribution margin is ${result.contributionMarginRatio.toFixed(1)}% — every unit sold contributes ${result.contributionPerUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })} toward fixed costs.`,
  });

  return insights;
}
