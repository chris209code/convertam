import { perPeriod, buildRankedExpenses } from './calculations';
import { formatCurrency, formatPercent } from '../salary-calculator/format';

// Plain-text summary used by both Copy Results and Share — mirrors
// ../salary-calculator/exportText.js's buildResultsText so Copy/Share can
// never disagree with each other.
export function buildBudgetSummaryText(result, budgetStatus, incomePeriod, periodLabel, currency) {
  const lines = [
    `Expense & Budget Summary (${periodLabel})`,
    '',
    `Total Income: ${formatCurrency(perPeriod(result.totalAnnualIncome, incomePeriod), currency)}`,
    `Total Expenses: ${formatCurrency(perPeriod(result.totalAnnualExpenses, incomePeriod), currency)}`,
  ];
  if (result.savingsCategory) {
    lines.push(`Total Savings/Investment: ${formatCurrency(perPeriod(result.totalAnnualSavings, incomePeriod), currency)}`);
  }
  lines.push(`Disposable Income: ${formatCurrency(perPeriod(result.disposableIncome, incomePeriod), currency)}`);
  lines.push('');
  lines.push(`Remaining Balance: ${formatCurrency(perPeriod(result.remainingBalance, incomePeriod), currency)}`);
  if (budgetStatus) lines.push(`Budget Status: ${budgetStatus.label}`);
  lines.push(`Expense Ratio: ${formatPercent(result.expenseRatio)}  |  Savings Rate: ${formatPercent(result.savingsRate)}`);

  const ranked = buildRankedExpenses(result);
  if (ranked.length > 0) {
    lines.push('');
    lines.push('Expense Breakdown (highest to lowest):');
    for (const c of ranked) {
      lines.push(`  ${c.name || 'Category'}: ${formatCurrency(perPeriod(c.annualAmount, incomePeriod), currency)} (${c.pctOfExpenses.toFixed(1)}%)`);
    }
  }

  lines.push('');
  lines.push('Calculated with Convertam Expense & Budget Calculator — convertam.app/calculators/expense-budget-calculator');
  return lines.join('\n');
}
