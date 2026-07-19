// Pure calculation logic for the Salary Calculator — extracted unchanged
// from the original component (same formulas, same order of operations)
// so the redesign can't silently change what a number actually means.
// Everything here is a plain function of its arguments; no state, no DOM,
// no network — this whole tool is 100% client-side by design (see the
// "100% Private" badge in the UI), so nothing here ever needs to be async.

export const FREQUENCIES = [
  { id: 'hourly', label: 'Hourly', multiplier: 2080 },
  { id: 'daily', label: 'Daily', multiplier: 260 },
  { id: 'weekly', label: 'Weekly', multiplier: 52 },
  { id: 'biweekly', label: 'Bi-weekly', multiplier: 26 },
  { id: 'monthly', label: 'Monthly', multiplier: 12 },
  { id: 'annually', label: 'Annually', multiplier: 1 },
];

export function freqById(id) {
  return FREQUENCIES.find((f) => f.id === id) || FREQUENCIES.find((f) => f.id === 'monthly');
}

export function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// One deduction's own annual amount, given the annual base it applies
// against (totalAnnualGross for a pre-tax deduction, taxableIncome for a
// post-tax one — see computeSalary below) and the current pay-period
// multiplier (a "fixed" value is entered per pay period, same as the
// original component: e.g. a fixed Tax of 37,500 while viewing Monthly
// means 37,500 every month, annualized as 37,500 * 12).
export function deductionAnnualAmount(deduction, base, freqMultiplier) {
  const value = num(deduction.value);
  if (!value) return 0;
  return deduction.type === 'percent' ? (base * value) / 100 : value * freqMultiplier;
}

// The bidirectional-display helper (requirement: "if the user enters one,
// automatically calculate and display the other where mathematically
// possible"). Doesn't change what's stored — value/type are still the one
// source of truth — this only derives the other representation for
// read-only display next to whichever mode is active.
export function deductionEquivalents(deduction, base, freqMultiplier) {
  const value = num(deduction.value);
  if (!value || base <= 0) return { percent: 0, amountPerPeriod: 0 };
  if (deduction.type === 'percent') {
    const annual = (base * value) / 100;
    return { percent: value, amountPerPeriod: annual / freqMultiplier };
  }
  const annual = value * freqMultiplier;
  return { percent: (annual / base) * 100, amountPerPeriod: value };
}

export function perPeriod(annualAmount, frequencyId) {
  return annualAmount / freqById(frequencyId).multiplier;
}

// The full aggregate calculation — same order of operations as the
// original: overtime and one-off bonuses build total annual gross first;
// pre-tax deductions come off that to produce taxable income; post-tax
// deductions come off taxable income; net is whatever's left. Every
// individual deduction's own annual amount is returned alongside the
// totals so the UI never has to recompute (or risk drifting from) this
// same math a second time.
export function computeSalary({ gross, frequency, deductions, overtime, bonuses }) {
  const freqData = freqById(frequency);
  const grossAmount = num(gross);
  const annualGross = grossAmount * freqData.multiplier;

  let overtimeBonus = 0;
  if (overtime?.enabled && overtime.hourlyRate && overtime.hoursWorked) {
    const hrs = num(overtime.hoursWorked);
    const std = num(overtime.standardHours) || 40;
    const rate = num(overtime.hourlyRate);
    const mult = num(overtime.multiplier) || 1.5;
    const otHrs = Math.max(0, hrs - std);
    overtimeBonus = otHrs * rate * mult;
  }

  const totalBonuses = (bonuses || []).reduce((sum, b) => sum + num(b.amount), 0);
  const totalAnnualGross = annualGross + overtimeBonus * 52 + totalBonuses;

  const beforeTax = (deductions || []).filter((d) => d.beforeTax && d.value);
  const beforeTaxDeductions = beforeTax.reduce((sum, d) => sum + deductionAnnualAmount(d, totalAnnualGross, freqData.multiplier), 0);
  const taxableIncome = totalAnnualGross - beforeTaxDeductions;

  const afterTax = (deductions || []).filter((d) => !d.beforeTax && d.value);
  const afterTaxDeductions = afterTax.reduce((sum, d) => sum + deductionAnnualAmount(d, taxableIncome, freqData.multiplier), 0);

  const totalDeductions = beforeTaxDeductions + afterTaxDeductions;
  const annualNet = totalAnnualGross - totalDeductions;

  const deductionAmounts = (deductions || [])
    .filter((d) => d.value)
    .map((d) => {
      const base = d.beforeTax ? totalAnnualGross : taxableIncome;
      return { ...d, base, annualAmount: deductionAnnualAmount(d, base, freqData.multiplier) };
    });

  return {
    freqData, grossAmount, annualGross, overtimeBonus, totalBonuses, totalAnnualGross,
    beforeTaxDeductions, taxableIncome, afterTaxDeductions, totalDeductions, annualNet,
    deductionAmounts,
    hasResults: grossAmount > 0,
  };
}

// Finds the deduction (if any) whose name suggests it's one of the
// well-known categories called out in the redesign spec (Tax, Pension) —
// reuses the same "match by keyword in the name" approach the original
// component already used for icon lookup, so a custom-named row like
// "PAYE" or "Retirement" still gets recognized. Everything that isn't Tax
// or Pension is folded into "Other Deductions" for the summary/chart —
// there's no reliable way to guess every possible deduction name, so this
// only special-cases the two the redesign explicitly calls for stat cards.
const TAX_KEYWORDS = ['tax', 'paye'];
const PENSION_KEYWORDS = ['pension', 'retirement'];

function findByKeywords(deductionAmounts, keywords) {
  return deductionAmounts.find((d) => keywords.some((k) => (d.name || '').toLowerCase().includes(k)));
}

export function categorizeDeductions(deductionAmounts) {
  const tax = findByKeywords(deductionAmounts, TAX_KEYWORDS);
  const pension = findByKeywords(deductionAmounts, PENSION_KEYWORDS);
  const other = deductionAmounts.filter((d) => d !== tax && d !== pension);
  const otherAnnual = other.reduce((sum, d) => sum + d.annualAmount, 0);
  return { tax, pension, other, otherAnnual };
}

// One row per pay frequency for the Salary Conversion table — deductions
// and net both scale down from the same annual totals computeSalary
// already produced, so this can't disagree with the headline numbers.
export function buildConversionTable(result) {
  return FREQUENCIES.map((f) => ({
    id: f.id,
    label: f.label,
    gross: result.totalAnnualGross / f.multiplier,
    deductions: result.totalDeductions / f.multiplier,
    net: result.annualNet / f.multiplier,
  }));
}

// Plain-language summaries of the numbers already on screen — nothing
// here is a new calculation, just phrasing existing results. Insights
// that depend on a specific deduction (tax rate, pension share) are
// omitted entirely when that deduction isn't present, rather than
// showing a "0%" line that isn't useful to anyone.
export function buildInsights(result, frequency) {
  const insights = [];
  if (result.totalAnnualGross <= 0) return insights;

  const takeHomePct = (result.annualNet / result.totalAnnualGross) * 100;
  insights.push({
    id: 'take-home-pct',
    icon: 'percent',
    text: `You take home ${takeHomePct.toFixed(1)}% of your gross salary.`,
    detail: `That's ${perPeriod(result.annualNet, frequency).toLocaleString(undefined, { maximumFractionDigits: 0 })} every ${freqById(frequency).label.toLowerCase()}.`,
  });

  const { tax, pension } = categorizeDeductions(result.deductionAmounts);
  if (tax) {
    const effectiveRate = (tax.annualAmount / result.totalAnnualGross) * 100;
    insights.push({
      id: 'tax-rate',
      icon: 'tax',
      text: `Your effective tax rate is ${effectiveRate.toFixed(2)}%.`,
      detail: `You pay ${perPeriod(tax.annualAmount, frequency).toLocaleString(undefined, { maximumFractionDigits: 0 })} in tax each ${freqById(frequency).label.toLowerCase().replace('ly', '')}.`,
    });
  }

  insights.push({
    id: 'annual-take-home',
    icon: 'trending',
    text: `Your annual take-home pay is ${result.annualNet.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
    detail: 'Based on your current inputs.',
  });

  if (pension) {
    const pensionPct = (pension.annualAmount / result.totalAnnualGross) * 100;
    insights.push({
      id: 'pension',
      icon: 'shield',
      text: `Pension contribution is ${pensionPct.toFixed(1)}%.`,
      detail: `You're contributing ${perPeriod(pension.annualAmount, frequency).toLocaleString(undefined, { maximumFractionDigits: 0 })} every ${freqById(frequency).label.toLowerCase().replace('ly', '')}.`,
    });
  }

  return insights;
}
