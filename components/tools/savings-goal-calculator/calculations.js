// Pure calculation logic for the Savings Goal Calculator. Same
// architecture as every other calculator in the suite (plain functions of
// their arguments, no state/DOM/network, 100% client-side) and its own
// independent module — nothing here can affect any other calculator.
//
// Compounding convention: monthly compounding throughout, regardless of
// contribution frequency — a Daily or Weekly contribution is converted to
// its monthly-equivalent amount before the growth math runs, then the
// *result* (a required regular amount) is converted back out to Daily /
// Weekly / Monthly for display. This is the same calendar-based
// period-conversion convention the Expense & Budget Calculator uses
// (Daily x365, Weekly x52, Monthly x12 — every day of the year, not a
// work-day convention) and it's surfaced to the user in the UI rather
// than left as a silent assumption.

export const FREQUENCIES = [
  { id: 'daily', label: 'Daily', perYear: 365 },
  { id: 'weekly', label: 'Weekly', perYear: 52 },
  { id: 'monthly', label: 'Monthly', perYear: 12 },
];

export function frequencyById(id) {
  return FREQUENCIES.find((f) => f.id === id) || FREQUENCIES.find((f) => f.id === 'monthly');
}

export function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function safe(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

// Whole calendar months between two dates, day-of-month aware — the same
// algorithm the Loan Calculator's monthsBetween uses, reimplemented here
// (not imported) since that module belongs to a different calculator and
// isn't safe to depend on. Calendar-based, so it never assumes a 30-day
// month.
export function monthsBetween(start, end) {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) months -= 1;
  return Math.max(0, months);
}

export function addMonths(date, n) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

// A regular contribution entered at any of the three frequencies,
// expressed as its monthly-equivalent amount for the growth math.
export function toMonthlyAmount(amount, frequencyId) {
  const f = frequencyById(frequencyId);
  return num(amount) * (f.perYear / 12);
}

// The reverse — a monthly amount expressed at any of the three
// frequencies, for the "same target, three ways" comparison table.
export function fromMonthlyAmount(monthlyAmount, frequencyId) {
  const f = frequencyById(frequencyId);
  return monthlyAmount / (f.perYear / 12);
}

// Runs the plan forward month by month — current savings growing at the
// monthly rate, plus a regular monthly contribution, plus an optional
// one-time lump sum landing on a specific month — and records a full
// schedule. Used by both calculation modes so the growth chart is built
// from the exact same engine regardless of which one solved for what.
export function simulate({ presentValue, monthlyContribution, monthlyRate, months, lumpSum, lumpSumMonth }) {
  const pv = Math.max(0, num(presentValue));
  const contribution = Math.max(0, num(monthlyContribution));
  const rate = Number.isFinite(monthlyRate) ? monthlyRate : 0;
  const n = Math.max(0, Math.round(months));
  const lump = Math.max(0, num(lumpSum));
  const lumpMonth = lumpSumMonth != null ? Math.max(0, Math.min(n, Math.round(lumpSumMonth))) : null;

  const schedule = [{ month: 0, balance: pv, totalContributions: 0, totalInterest: 0 }];
  let balance = pv;
  let totalContributions = 0;
  let totalInterest = 0;

  for (let m = 1; m <= n; m++) {
    const interestThisMonth = balance * rate;
    balance += interestThisMonth;
    totalInterest += interestThisMonth;
    balance += contribution;
    totalContributions += contribution;
    if (lumpMonth != null && m === lumpMonth && lump > 0) {
      balance += lump;
    }
    schedule.push({ month: m, balance: safe(balance), totalContributions: safe(totalContributions), totalInterest: safe(totalInterest) });
  }

  return {
    schedule,
    finalBalance: safe(balance, pv),
    totalContributions: safe(totalContributions),
    totalInterest: safe(totalInterest),
  };
}

// Mode A — Required Contribution. Given a fixed time horizon (months),
// solve for the monthly contribution needed so the plan lands exactly on
// the goal, accounting for compounding and any lump sum already planned.
export function computeRequiredContribution({ goalAmount, currentSavings, months, annualRatePct, lumpSum, lumpSumMonth }) {
  const goal = Math.max(0, num(goalAmount));
  const pv = Math.max(0, num(currentSavings));
  const n = Math.max(0, Math.round(months));
  const rate = Math.max(0, num(annualRatePct)) / 100 / 12;
  const lump = Math.max(0, num(lumpSum));
  const lumpMonth = lumpSumMonth != null ? Math.max(0, Math.min(n, Math.round(lumpSumMonth))) : null;

  if (goal <= 0 || n <= 0) return { hasResults: false };
  if (pv >= goal) return { hasResults: true, alreadyAchieved: true, months: n };

  // Future value the present balance reaches on its own by month n.
  const pvFutureValue = rate > 0 ? pv * Math.pow(1 + rate, n) : pv;
  // Future value the lump sum contributes, given how long it has left to grow.
  const lumpFutureValue = lump > 0 && lumpMonth != null
    ? (rate > 0 ? lump * Math.pow(1 + rate, Math.max(0, n - lumpMonth)) : lump)
    : 0;

  const remaining = goal - pvFutureValue - lumpFutureValue;
  if (remaining <= 0) return { hasResults: true, alreadyAchieved: true, months: n };

  // Ordinary annuity factor — the future value of $1/month for n months.
  const annuityFactor = rate > 0 ? (Math.pow(1 + rate, n) - 1) / rate : n;
  const requiredMonthly = annuityFactor > 0 ? remaining / annuityFactor : null;

  if (requiredMonthly == null || !Number.isFinite(requiredMonthly)) return { hasResults: false };

  const sim = simulate({ presentValue: pv, monthlyContribution: requiredMonthly, monthlyRate: rate, months: n, lumpSum: lump, lumpSumMonth: lumpMonth });

  return {
    hasResults: true, alreadyAchieved: false, months: n,
    requiredMonthly,
    requiredDaily: fromMonthlyAmount(requiredMonthly, 'daily'),
    requiredWeekly: fromMonthlyAmount(requiredMonthly, 'weekly'),
    finalBalance: sim.finalBalance,
    totalContributions: sim.totalContributions,
    totalInterest: sim.totalInterest,
    schedule: sim.schedule,
  };
}

// Mode B — Goal Date. Given a regular contribution, walk the plan forward
// one month at a time until the balance reaches the goal, capped at 100
// years so a zero-contribution, zero-interest plan that can never reach
// the goal terminates instead of looping forever.
const MAX_MONTHS = 1200;

export function computeGoalDate({ goalAmount, currentSavings, monthlyContribution, annualRatePct, lumpSum, lumpSumMonth }) {
  const goal = Math.max(0, num(goalAmount));
  const pv = Math.max(0, num(currentSavings));
  const contribution = Math.max(0, num(monthlyContribution));
  const rate = Math.max(0, num(annualRatePct)) / 100 / 12;
  const lump = Math.max(0, num(lumpSum));
  const lumpMonth = lumpSumMonth != null ? Math.max(0, Math.round(lumpSumMonth)) : null;

  if (goal <= 0) return { hasResults: false };
  if (pv >= goal) return { hasResults: true, alreadyAchieved: true, months: 0, finalBalance: pv, totalContributions: 0, totalInterest: 0, schedule: [{ month: 0, balance: pv, totalContributions: 0, totalInterest: 0 }] };

  let balance = pv;
  let totalContributions = 0;
  let totalInterest = 0;
  const schedule = [{ month: 0, balance: pv, totalContributions: 0, totalInterest: 0 }];

  for (let m = 1; m <= MAX_MONTHS; m++) {
    const interestThisMonth = balance * rate;
    balance += interestThisMonth;
    totalInterest += interestThisMonth;
    balance += contribution;
    totalContributions += contribution;
    if (lumpMonth != null && m === lumpMonth && lump > 0) balance += lump;
    schedule.push({ month: m, balance: safe(balance), totalContributions: safe(totalContributions), totalInterest: safe(totalInterest) });

    if (balance >= goal) {
      return {
        hasResults: true, alreadyAchieved: false, reachable: true, months: m,
        finalBalance: safe(balance), totalContributions: safe(totalContributions), totalInterest: safe(totalInterest),
        schedule,
      };
    }
  }

  return { hasResults: true, alreadyAchieved: false, reachable: false, months: null, finalBalance: safe(balance), totalContributions: safe(totalContributions), totalInterest: safe(totalInterest), schedule };
}

// What-If Simulator — never mutates the caller's actual inputs, only ever
// produces a projected result for the same "Current vs Projected" pattern
// used by the Loan and Profit & Loss calculators' own simulators.
export function computeWhatIf(base, mode, inputs, { contributionDeltaAmount, extraLumpSum, monthsDeltaCount, rateDeltaPct }) {
  if (!base?.hasResults) return { hasResults: false };

  if (mode === 'required') {
    const monthsAdjusted = Math.max(1, num(inputs.months) + num(monthsDeltaCount));
    return computeRequiredContribution({
      goalAmount: inputs.goalAmount,
      currentSavings: inputs.currentSavings,
      months: monthsAdjusted,
      annualRatePct: Math.max(0, num(inputs.annualRatePct) + num(rateDeltaPct)),
      lumpSum: num(inputs.lumpSum) + num(extraLumpSum),
      lumpSumMonth: inputs.lumpSumMonth,
    });
  }

  const contributionAdjusted = Math.max(0, num(inputs.monthlyContribution) + num(contributionDeltaAmount));
  return computeGoalDate({
    goalAmount: inputs.goalAmount,
    currentSavings: inputs.currentSavings,
    monthlyContribution: contributionAdjusted,
    annualRatePct: Math.max(0, num(inputs.annualRatePct) + num(rateDeltaPct)),
    lumpSum: num(inputs.lumpSum) + num(extraLumpSum),
    lumpSumMonth: inputs.lumpSumMonth,
  });
}

export function buildWhatIfInsight(base, projected, mode, deltas) {
  if (!base?.hasResults || !projected?.hasResults) return null;
  const parts = [];
  if (num(deltas.contributionDeltaAmount)) parts.push(`contribution up by ${Math.abs(num(deltas.contributionDeltaAmount)).toLocaleString(undefined, { maximumFractionDigits: 0 })}/month`);
  if (num(deltas.extraLumpSum)) parts.push(`an extra ${Math.abs(num(deltas.extraLumpSum)).toLocaleString(undefined, { maximumFractionDigits: 0 })} lump sum`);
  if (num(deltas.rateDeltaPct)) parts.push(`interest rate ${num(deltas.rateDeltaPct) > 0 ? 'up' : 'down'} ${Math.abs(num(deltas.rateDeltaPct))}pp`);
  if (mode === 'required' && num(deltas.monthsDeltaCount)) parts.push(`target ${num(deltas.monthsDeltaCount) > 0 ? 'extended' : 'shortened'} by ${Math.abs(num(deltas.monthsDeltaCount))} month(s)`);
  if (parts.length === 0) return null;

  if (mode === 'goal-date') {
    if (!projected.reachable) return { id: 'what-if', icon: 'warning', text: `With ${parts.join(' and ')}, the goal still isn't reachable within 100 years.`, detail: 'Try a larger contribution or a longer time horizon.' };
    const monthsSaved = base.months != null && projected.months != null ? base.months - projected.months : null;
    return {
      id: 'what-if', icon: 'target',
      text: `With ${parts.join(' and ')}, you'd reach your goal in ${projected.months} month(s) instead of ${base.months}.`,
      detail: monthsSaved != null && monthsSaved !== 0 ? `That's ${Math.abs(monthsSaved)} month(s) ${monthsSaved > 0 ? 'sooner' : 'later'}.` : undefined,
    };
  }

  if (projected.alreadyAchieved) return { id: 'what-if', icon: 'shield', text: `With ${parts.join(' and ')}, your goal is already achieved.`, detail: undefined };
  const contributionDelta = base.requiredMonthly != null && projected.requiredMonthly != null ? base.requiredMonthly - projected.requiredMonthly : null;
  return {
    id: 'what-if', icon: 'target',
    text: `With ${parts.join(' and ')}, your required monthly saving becomes ${projected.requiredMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
    detail: contributionDelta != null && Math.round(contributionDelta) !== 0 ? `That's ${Math.abs(contributionDelta).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${contributionDelta > 0 ? 'less' : 'more'} than currently required per month.` : undefined,
  };
}

// Plain-language, deterministic phrasing of numbers already on screen —
// no AI. Money figures are left as bare numbers (no currency symbol),
// same convention as the rest of the suite's buildInsights functions.
export function buildInsights(result, mode, { goalAmount, currentSavings, frequencyId }) {
  const insights = [];
  if (!result?.hasResults) return insights;

  const goal = num(goalAmount);
  const current = num(currentSavings);

  if (result.alreadyAchieved) {
    insights.push({ id: 'achieved', icon: 'shield', text: 'Goal already achieved.', detail: `Your current savings already meet or exceed your ${goal.toLocaleString(undefined, { maximumFractionDigits: 0 })} goal.` });
    return insights;
  }

  const progressPct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  insights.push({ id: 'progress', icon: 'chart', text: `You are ${progressPct.toFixed(0)}% of the way to your goal.`, detail: `${current.toLocaleString(undefined, { maximumFractionDigits: 0 })} saved of ${goal.toLocaleString(undefined, { maximumFractionDigits: 0 })}.` });

  if (mode === 'goal-date') {
    if (!result.reachable) {
      insights.push({ id: 'not-reachable', icon: 'warning', text: 'At this contribution and interest rate, your goal is not reachable within 100 years.', detail: 'Increase your regular contribution, add a lump sum, or raise the interest rate assumption.' });
    } else {
      const freqLabel = frequencyById(frequencyId).label.toLowerCase();
      insights.push({ id: 'goal-date', icon: 'target', text: `Saving your planned amount ${freqLabel} will reach your goal in ${result.months} month(s).`, detail: undefined });
    }
  } else {
    insights.push({ id: 'required', icon: 'target', text: `You need to save ${result.requiredMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })} monthly to meet your target date.`, detail: `That's ${result.requiredDaily.toLocaleString(undefined, { maximumFractionDigits: 0 })} daily or ${result.requiredWeekly.toLocaleString(undefined, { maximumFractionDigits: 0 })} weekly.` });
  }

  if (result.totalInterest > 0) {
    insights.push({ id: 'interest', icon: 'trending', text: `Interest contributes ${result.totalInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })} to the final amount.`, detail: `Final projected balance: ${result.finalBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}.` });
  }

  return insights;
}
