// Pure calculation logic for the VAT Calculator — plain functions of their
// arguments, no state/DOM/network, mirroring the architecture of the other
// calculators' calculations.js files. 100% client-side by design.

export const VAT_PRESETS = [7.5, 5, 10, 15, 20];

export function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Proper financial rounding to 2 decimal places — the +Number.EPSILON
// nudge avoids the classic case where a value like 1.005 * 100 lands on
// 100.49999999999999 due to binary floating-point and rounds down to
// 1.00 instead of 1.01. Every currency figure this module hands back to
// the UI has already been through this, so nothing upstream ever has to
// re-round (and risk rounding differently in two places).
export function roundCurrency(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

// The four calculation modes differ only in how the entered amount is
// interpreted (exclusive-of-VAT vs inclusive-of-VAT) — everything else is
// the same underlying VAT math, so there is exactly one formula pair here,
// selected by `inclusive`.
function fromExclusive(original, ratePct) {
  const vatAmount = roundCurrency((original * ratePct) / 100);
  const total = roundCurrency(original + vatAmount);
  return { original: roundCurrency(original), vatAmount, total };
}

function fromInclusive(total, ratePct) {
  const original = roundCurrency(total / (1 + ratePct / 100));
  const vatAmount = roundCurrency(total - original);
  return { original, vatAmount, total: roundCurrency(total) };
}

// mode: 'add' (amount is exclusive) | 'remove' (amount is inclusive) |
// 'reverse' (same math as remove, but paired with a step-by-step
// explanation in the UI) | 'breakdown' (either direction, chosen by
// breakdownInclusive since a breakdown is meant to analyse whatever
// figure the user actually has on hand).
export function computeVat({ mode, amount, rate, breakdownInclusive }) {
  const amt = Math.max(0, num(amount));
  const ratePct = Math.max(0, num(rate));
  const inclusive = mode === 'remove' || mode === 'reverse' || (mode === 'breakdown' && !!breakdownInclusive);

  const { original, vatAmount, total } = inclusive ? fromInclusive(amt, ratePct) : fromExclusive(amt, ratePct);
  const effectiveVatPct = total > 0 ? (vatAmount / total) * 100 : 0;

  return {
    mode, ratePct, inclusive,
    original, vatAmount, total,
    effectiveVatPct,
    hasResults: amt > 0,
  };
}

// Multi-item worksheet — every item is treated as VAT-exclusive (a base
// product price), the common case for a product list. Each line is
// rounded before being summed (round-per-line, then total) so the
// displayed Totals row always exactly equals the sum of the displayed
// line items — the standard accounting convention, and the reason two
// different summation orders can't ever disagree by a cent here.
export function computeWorksheet(items, ratePct) {
  const rows = (items || [])
    .filter((it) => it.amount !== '' && it.amount != null && num(it.amount) > 0)
    .map((it) => {
      const { original, vatAmount, total } = fromExclusive(num(it.amount), Math.max(0, num(ratePct)));
      return { ...it, original, vatAmount, total };
    });
  const totals = rows.reduce(
    (acc, r) => ({ original: acc.original + r.original, vatAmount: acc.vatAmount + r.vatAmount, total: acc.total + r.total }),
    { original: 0, vatAmount: 0, total: 0 }
  );
  return {
    rows,
    totals: { original: roundCurrency(totals.original), vatAmount: roundCurrency(totals.vatAmount), total: roundCurrency(totals.total) },
  };
}

// Deterministic, plain-language phrasing of numbers already on screen —
// no AI, no invented assumptions.
export function buildInsights(result, currency) {
  const insights = [];
  if (!result.hasResults) return insights;

  if (result.ratePct === 0) {
    insights.push({
      id: 'zero-rate',
      icon: 'shield',
      text: 'This calculation has no VAT applied.',
      detail: 'The original amount and the total are the same.',
    });
  } else {
    insights.push({
      id: 'vat-share',
      icon: 'percent',
      text: `VAT represents ${result.ratePct}% of the taxable amount.`,
      detail: `That works out to ${result.effectiveVatPct.toFixed(2)}% of the grand total.`,
    });
  }

  insights.push({
    id: 'customer-pays',
    icon: 'customer',
    text: `Your customer pays ${currency}${result.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} in VAT.`,
    detail: `On top of ${currency}${result.original.toLocaleString(undefined, { minimumFractionDigits: 2 })} for the goods or service.`,
  });

  insights.push({
    id: 'retained',
    icon: 'wallet',
    text: `The amount retained before VAT is ${currency}${result.original.toLocaleString(undefined, { minimumFractionDigits: 2 })}.`,
    detail: `Out of a total of ${currency}${result.total.toLocaleString(undefined, { minimumFractionDigits: 2 })} collected.`,
  });

  return insights;
}
