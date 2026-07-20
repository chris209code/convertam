// Plain-text summary used by both Copy Results and Share — mirrors every
// other calculator's buildSummaryText so Copy/Share can never disagree.
export function buildSavingsGoalSummaryText(result, mode, currency, goalAmount, currentSavings, insights) {
  const lines = ['Savings Goal Summary', ''];
  const fmt = (n) => `${currency}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  lines.push(`Goal Amount: ${fmt(Number(goalAmount) || 0)}`);
  lines.push(`Current Savings: ${fmt(Number(currentSavings) || 0)}`);

  if (result.alreadyAchieved) {
    lines.push('');
    lines.push('Goal already achieved.');
  } else if (mode === 'goal-date' && !result.reachable) {
    lines.push('');
    lines.push('At this contribution and interest rate, the goal is not reachable within 100 years.');
  } else {
    lines.push('');
    if (mode === 'required') {
      lines.push(`Required Monthly Contribution: ${fmt(result.requiredMonthly)}`);
      lines.push(`Required Weekly Contribution: ${fmt(result.requiredWeekly)}`);
      lines.push(`Required Daily Contribution: ${fmt(result.requiredDaily)}`);
    } else {
      lines.push(`Time Remaining: ${result.months} month(s)`);
    }
    lines.push(`Total Contributions: ${fmt(result.totalContributions)}`);
    lines.push(`Interest Earned: ${fmt(result.totalInterest)}`);
    lines.push(`Projected Final Balance: ${fmt(result.finalBalance)}`);
  }

  if (insights?.length) {
    lines.push('');
    lines.push('Insights:');
    for (const i of insights) lines.push(`  ${i.text}`);
  }

  lines.push('');
  lines.push('Calculated with Convertam Savings Goal Calculator — convertam.app/calculators/savings-goal-calculator');
  return lines.join('\n');
}
