import { formatCurrency, formatPercent } from '../salary-calculator/format';

// Plain-text summary used by both Copy Results and Share — mirrors every
// other calculator's buildSummaryText so Copy/Share can never disagree.
export function buildBreakEvenSummaryText(result, currency, insights) {
  const lines = ['Break-even Summary', ''];

  if (!result.canBreakEven) {
    lines.push('Break-even cannot be reached at the current selling price and variable cost.');
  } else {
    lines.push(`Break-even Units: ${Math.ceil(result.breakEvenUnits).toLocaleString()}`);
    lines.push(`Break-even Revenue: ${formatCurrency(result.breakEvenRevenue, currency)}`);
    lines.push(`Contribution per Unit: ${formatCurrency(result.contributionPerUnit, currency)}`);
    lines.push(`Contribution Margin: ${formatPercent(result.contributionMarginRatio)}`);
    lines.push('');
    lines.push(`Total Fixed Costs: ${formatCurrency(result.fixedCosts, currency)}`);
    lines.push(`Variable Cost Ratio: ${formatPercent(result.variableCostRatio)}`);
    if (result.expectedUnits > 0) {
      lines.push('');
      lines.push(`Expected Units Sold: ${result.expectedUnits.toLocaleString()}`);
      lines.push(`Expected Revenue: ${formatCurrency(result.expectedRevenue, currency)}`);
      lines.push(`Expected Profit/Loss: ${result.expectedProfit < 0 ? '-' : ''}${formatCurrency(Math.abs(result.expectedProfit), currency)}`);
      if (result.marginOfSafetyUnits != null) {
        lines.push(`Margin of Safety: ${Math.round(result.marginOfSafetyUnits).toLocaleString()} units (${formatPercent(result.marginOfSafetyPct)})`);
      }
    }
  }

  if (insights?.length) {
    lines.push('');
    lines.push('Insights:');
    for (const i of insights) lines.push(`  ${i.text}`);
  }

  lines.push('');
  lines.push('Calculated with Convertam Break-even Calculator — convertam.app/calculators/break-even-calculator');
  return lines.join('\n');
}
