// Pure calculation logic for the Loan Calculator — plain functions of their
// arguments, no state/DOM/network, mirroring the architecture of
// ../salary-calculator/calculations.js and ../expense-budget-calculator/calculations.js.
// This tool is 100% client-side by design (see the "100% Private" badge).

export const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly', paymentsPerYear: 12 },
  { id: 'biweekly', label: 'Bi-weekly', paymentsPerYear: 26 },
  { id: 'weekly', label: 'Weekly', paymentsPerYear: 52 },
];

export function freqById(id) {
  return FREQUENCIES.find((f) => f.id === id) || FREQUENCIES.find((f) => f.id === 'monthly');
}

export function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

// Hard safety cap on the number of scheduled payments a single run will
// ever compute — protects the browser from a runaway loop/render on a
// pathological "very long loan" input (e.g. 999 years). 1200 weekly
// payments is already ~23 years, generous for any realistic loan.
const MAX_PAYMENTS = 1200;

function addInterval(date, frequencyId) {
  const d = new Date(date);
  if (frequencyId === 'weekly') d.setDate(d.getDate() + 7);
  else if (frequencyId === 'biweekly') d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// Standard amortizing-loan payment formula, written in its numerically
// stable form: payment = P * r / (1 - (1+r)^-n). The more common
// P*r*(1+r)^n / ((1+r)^n - 1) is mathematically identical but overflows to
// Infinity/Infinity (= NaN) for a "very high interest + very long loan"
// combination, since (1+r)^n can exceed what a double can represent; here
// (1+r)^-n only ever underflows towards 0, which is safe. Falls back to a
// straight-line split (principal / numPayments, no interest) when the rate
// is zero, since the formula itself divides by zero in that case.
export function computePeriodicPayment(financedPrincipal, periodicRate, numPayments) {
  if (numPayments <= 0 || financedPrincipal <= 0) return 0;
  if (periodicRate <= 0) return financedPrincipal / numPayments;
  const discountFactor = Math.pow(1 + periodicRate, -numPayments);
  return (financedPrincipal * periodicRate) / (1 - discountFactor);
}

// Builds the full payment-by-payment schedule for one financed amount at
// one periodic rate. extraPerPayment (if any) is applied as additional
// principal reduction each period, so the schedule can pay off early —
// the loop simply stops once the balance reaches zero rather than running
// for the originally-scheduled numPayments.
function buildSchedule({ financedPrincipal, periodicRate, numPayments, payment, extraPerPayment, startDate, frequencyId }) {
  const schedule = [];
  let balance = financedPrincipal;
  let date = startDate;
  const cap = Math.min(numPayments || MAX_PAYMENTS, MAX_PAYMENTS);

  for (let i = 1; i <= cap && balance > 0.005; i++) {
    date = addInterval(date, frequencyId);
    const interestPaid = balance * periodicRate;
    let principalPaid = payment - interestPaid + Math.max(0, num(extraPerPayment));
    if (principalPaid > balance) principalPaid = balance;
    if (principalPaid < 0) principalPaid = 0;
    balance = Math.max(0, balance - principalPaid);
    schedule.push({ paymentNumber: i, date, principalPaid, interestPaid, payment: interestPaid + principalPaid, remainingBalance: balance });
  }
  return schedule;
}

// The full aggregate calculation for one loan configuration. Fees
// (processing, insurance) are treated as one-time, upfront costs added to
// the total cost of borrowing — they do not change the financed principal
// or the periodic payment itself, only "Total Repayment" and the
// Principal/Interest/Fees chart.
export function computeLoan({ principal, downPayment, ratePct, termYears, termMonths, frequency, processingFee, insuranceFee, extraPayment, startDate }) {
  const freqData = freqById(frequency);
  const principalAmt = Math.max(0, num(principal));
  const downPaymentAmt = Math.min(Math.max(0, num(downPayment)), principalAmt);
  const financedPrincipal = principalAmt - downPaymentAmt;

  const totalMonths = Math.max(0, num(termYears) * 12 + num(termMonths));
  const numPayments = Math.round((totalMonths / 12) * freqData.paymentsPerYear);
  const periodicRate = num(ratePct) / 100 / freqData.paymentsPerYear;

  const payment = computePeriodicPayment(financedPrincipal, periodicRate, numPayments);
  const base = startDate || new Date();

  const schedule = buildSchedule({
    financedPrincipal, periodicRate, numPayments, payment,
    extraPerPayment: extraPayment, startDate: base, frequencyId: freqData.id,
  });

  const totalInterestPaid = schedule.reduce((sum, r) => sum + r.interestPaid, 0);
  const totalPrincipalPaid = schedule.reduce((sum, r) => sum + r.principalPaid, 0);
  const fees = Math.max(0, num(processingFee)) + Math.max(0, num(insuranceFee));
  const totalRepayment = totalPrincipalPaid + totalInterestPaid + fees;
  const loanEndDate = schedule.length > 0 ? schedule[schedule.length - 1].date : null;

  // "Effective Interest" here means total interest + fees as a percentage
  // of the amount actually financed — a plain, transparent cost-of-borrowing
  // figure. It is NOT a regulatory APR calculation (which has its own legal
  // formula); the UI labels it accordingly so it's never mistaken for one.
  const effectiveInterestPct = financedPrincipal > 0 ? ((totalInterestPaid + fees) / financedPrincipal) * 100 : 0;

  // Monthly-equivalent payment, used by the Affordability section so a
  // bi-weekly or weekly loan can still be compared against a monthly income.
  const monthlyEquivalentPayment = (payment * freqData.paymentsPerYear) / 12;

  return {
    freqData, principalAmt, downPaymentAmt, financedPrincipal,
    totalMonths, numPayments, periodicRate, payment,
    schedule, totalInterestPaid, totalPrincipalPaid, fees, totalRepayment,
    loanEndDate, effectiveInterestPct, monthlyEquivalentPayment,
    hasResults: financedPrincipal > 0 && numPayments > 0,
  };
}

// Compares a "with extra payment" result against its own zero-extra
// baseline to report months/interest saved — the two schedules share every
// other input, so the delta is purely the effect of the extra payment.
export function buildEarlyRepaymentSavings(withExtraResult, baselineResult) {
  if (!withExtraResult.hasResults || !baselineResult.hasResults) return null;
  const monthsSaved = baselineResult.schedule.length - withExtraResult.schedule.length;
  const interestSaved = baselineResult.totalInterestPaid - withExtraResult.totalInterestPaid;
  if (monthsSaved <= 0 && interestSaved <= 0) return null;
  return {
    monthsSaved: Math.max(0, monthsSaved),
    interestSaved: Math.max(0, interestSaved),
    newPayoffDate: withExtraResult.loanEndDate,
    originalPayoffDate: baselineResult.loanEndDate,
  };
}

// Debt-to-Income banding follows the commonly-cited mortgage-industry
// thresholds (under ~20% comfortable, up to ~36% still manageable, above
// that considered risky) — documented here since these are a judgment call,
// not a value derived from the user's own data.
export function buildAffordability({ monthlyIncome, monthlyExpenses, monthlyLoanPayment }) {
  const income = num(monthlyIncome);
  if (income <= 0) return null;
  const expenses = Math.max(0, num(monthlyExpenses));
  const dtiPct = ((monthlyLoanPayment + expenses) / income) * 100;
  const cashRemaining = income - expenses - monthlyLoanPayment;

  let indicator = 'Comfortable';
  let tone = 'green';
  if (dtiPct > 36) { indicator = 'Risky'; tone = 'red'; }
  else if (dtiPct > 20) { indicator = 'Manageable'; tone = 'amber'; }

  return { dtiPct, cashRemaining, indicator, tone };
}

// Deterministic, plain-language phrasing of numbers already on screen —
// no AI, no invented assumptions. Insights are only added when the
// underlying condition/data is actually present.
export function buildInsights(result, { earlyRepayment, downPaymentAmt, extraPayment, ratePct } = {}) {
  const insights = [];
  if (!result.hasResults) return insights;

  insights.push({
    id: 'total-interest',
    icon: 'interest',
    text: `You will pay ${result.totalInterestPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })} in interest over the life of this loan.`,
    detail: `That's on top of the ${result.financedPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })} you're financing.`,
  });

  if (result.financedPrincipal > 0 && result.totalInterestPaid / result.financedPrincipal > 0.4) {
    insights.push({
      id: 'high-interest-share',
      icon: 'warning',
      text: `Your interest exceeds 40% of the amount you're financing.`,
      detail: 'A shorter term, larger down payment, or extra payments would reduce this.',
    });
  }

  if (num(ratePct) === 0) {
    insights.push({
      id: 'zero-interest',
      icon: 'shield',
      text: `This loan has no interest — you'll repay exactly what you borrowed, plus any fees.`,
      detail: 'Every payment goes entirely toward the principal.',
    });
  }

  if (earlyRepayment) {
    insights.push({
      id: 'extra-payment',
      icon: 'trending',
      text: `Adding ${num(extraPayment).toLocaleString(undefined, { maximumFractionDigits: 0 })} extra each payment saves you ${earlyRepayment.monthsSaved} payment${earlyRepayment.monthsSaved === 1 ? '' : 's'} and ${earlyRepayment.interestSaved.toLocaleString(undefined, { maximumFractionDigits: 0 })} in interest.`,
      detail: `New payoff date: ${earlyRepayment.newPayoffDate ? earlyRepayment.newPayoffDate.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}.`,
    });
  }

  if (downPaymentAmt > 0 && result.principalAmt > 0) {
    insights.push({
      id: 'down-payment',
      icon: 'percent',
      text: `Your down payment covers ${((downPaymentAmt / result.principalAmt) * 100).toFixed(1)}% of the purchase price.`,
      detail: `You're financing ${result.financedPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })} instead of ${result.principalAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}.`,
    });
  }

  return insights;
}

// Compares two full loan results (Current vs Alternative) and reports
// which is cheaper overall by total cost — used to drive the highlight in
// the Compare Scenarios panel.
export function compareLoans(current, alternative) {
  if (!current?.hasResults || !alternative?.hasResults) return null;
  const cheaperId = current.totalRepayment <= alternative.totalRepayment ? 'current' : 'alternative';
  return {
    cheaperId,
    difference: Math.abs(current.totalRepayment - alternative.totalRepayment),
  };
}
