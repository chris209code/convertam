import { formatCurrency, formatPercent } from '../salary-calculator/format';

// formatCurrency() always shows an absolute value — Gross/Net Profit can
// be genuinely negative in this tool, so anywhere that isn't already
// paired with an explicit Profit/Loss word needs its own sign.
function signed(amount, currency) {
  return `${amount < 0 ? '-' : ''}${formatCurrency(amount, currency)}`;
}

// Plain-text summary used by both Copy Results and Share — mirrors the
// other calculators' exportText.js so Copy/Share can never disagree.
export function buildPLSummaryText(result, currency, status, breakdown, breakEven, pricing, comparison, insights, whatIf) {
  const lines = [
    `Profit & Loss Summary (${result.mode === 'simple' ? 'Simple' : 'Business'} mode)`,
    '',
    `Total Revenue: ${formatCurrency(result.totalRevenue, currency)}`,
    `Total Costs: ${formatCurrency(result.totalCosts, currency)}`,
    `Gross Profit: ${signed(result.grossProfit, currency)}`,
    `${result.netProfit >= 0 ? 'Net Profit' : 'Net Loss'}: ${formatCurrency(Math.abs(result.netProfit), currency)}`,
    `Gross Margin: ${formatPercent(result.grossMargin)}`,
    `Net Margin: ${formatPercent(result.netMargin)}`,
    `Markup: ${formatPercent(result.markup)}`,
  ];
  if (result.mode === 'detailed') {
    lines.push(`Expense Ratio: ${formatPercent(result.expenseRatio)}`);
    if (result.breakEvenRevenue != null) lines.push(`Estimated Break-even Revenue: ${formatCurrency(result.breakEvenRevenue, currency)}`);
  }
  if (status) lines.push(`Status: ${status.label}`);

  if (breakdown && breakdown.length > 0) {
    lines.push('', 'Expense Breakdown (highest to lowest):');
    for (const l of breakdown) lines.push(`  ${l.name}: ${formatCurrency(l.amount, currency)} (${l.pctOfCosts.toFixed(1)}% of costs)`);
  }

  if (breakEven?.hasResults) {
    lines.push('', 'Break-even (unit economics):',
      `  Contribution per Unit: ${formatCurrency(breakEven.contributionPerUnit, currency)}`,
      `  Contribution Margin: ${formatPercent(breakEven.contributionMargin)}`,
      breakEven.breakEvenUnits != null ? `  Break-even Units: ${Math.ceil(breakEven.breakEvenUnits).toLocaleString()}` : '  Break-even Units: not reachable at this price',
      breakEven.breakEvenRevenue != null ? `  Break-even Revenue: ${formatCurrency(breakEven.breakEvenRevenue, currency)}` : null,
    );
  }

  if (pricing?.hasResults) {
    lines.push('', 'Pricing Insight:');
    if (pricing.mode === 'from-margin') {
      lines.push(`  Recommended Selling Price: ${formatCurrency(pricing.recommendedPrice, currency)}`, `  Profit per Unit: ${formatCurrency(pricing.profitPerUnit, currency)}`, `  Markup Required: ${formatPercent(pricing.markupPct)}`);
    } else {
      lines.push(`  Resulting Margin at ${formatCurrency(pricing.price, currency)}: ${formatPercent(pricing.resultingMargin)}`, `  Profit per Unit: ${formatCurrency(pricing.profitPerUnit, currency)}`);
    }
  }

  if (comparison && comparison.length > 0) {
    lines.push('', 'Comparison vs Previous Period:');
    for (const r of comparison) {
      const cur = r.isPct ? formatPercent(r.current) : formatCurrency(r.current, currency);
      const prev = r.isPct ? formatPercent(r.previous) : formatCurrency(r.previous, currency);
      lines.push(`  ${r.label}: ${cur} vs ${prev} (${r.status})`);
    }
  }

  if (whatIf?.hasResults) {
    lines.push('', 'What-If Simulator (Current vs Projected):',
      `  Total Revenue: ${formatCurrency(result.totalRevenue, currency)} vs ${formatCurrency(whatIf.totalRevenue, currency)}`,
      `  Total Costs: ${formatCurrency(result.totalCosts, currency)} vs ${formatCurrency(whatIf.totalCosts, currency)}`,
      `  Net Profit: ${signed(result.netProfit, currency)} vs ${signed(whatIf.netProfit, currency)}`,
      `  Net Margin: ${formatPercent(result.netMargin)} vs ${formatPercent(whatIf.netMargin)}`,
    );
  }

  if (insights.length > 0) {
    lines.push('', 'Insights:');
    for (const ins of insights) lines.push(`  - ${ins.text}`);
  }

  lines.push('', 'Calculated with Convertam Profit & Loss Calculator — convertam.app/calculators/profit-margin');
  return lines.filter(Boolean).join('\n');
}
