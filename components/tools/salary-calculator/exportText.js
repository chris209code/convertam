import { perPeriod } from './calculations';
import { formatCurrency } from './format';

// Plain-text summary used by both Copy Results and Share — one function
// so the two actions can never show different numbers from each other.
export function buildResultsText(result, frequency, freqLabel, currency, deductionAmounts) {
  const lines = [
    `Salary Summary (${freqLabel})`,
    '',
    `Gross Salary: ${formatCurrency(perPeriod(result.totalAnnualGross, frequency), currency)}`,
  ];
  for (const d of deductionAmounts) {
    lines.push(`${d.name || 'Deduction'}: -${formatCurrency(perPeriod(d.annualAmount, frequency), currency)}`);
  }
  lines.push(`Total Deductions: -${formatCurrency(perPeriod(result.totalDeductions, frequency), currency)}`);
  lines.push('');
  lines.push(`Take Home Pay: ${formatCurrency(perPeriod(result.annualNet, frequency), currency)}`);
  lines.push('');
  lines.push('Calculated with Convertam Salary Calculator — convertam.app/calculator');
  return lines.join('\n');
}
