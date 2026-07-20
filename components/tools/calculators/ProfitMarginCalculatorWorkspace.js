'use client';

import ProfitLossCalculator from '../profit-loss-calculator/ProfitLossCalculator';

// Entry point kept at its original path/name (and the tool kept at its
// original /calculators/profit-margin route/slug) so no link or SEO value
// is lost — Profit Margin is now one result within the broader Profit &
// Loss Calculator, which lives in ../profit-loss-calculator/.
export default function ProfitMarginCalculatorWorkspace() {
  return <ProfitLossCalculator />;
}
