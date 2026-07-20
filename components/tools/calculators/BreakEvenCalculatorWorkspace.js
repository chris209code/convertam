'use client';

import BreakEvenCalculator from '../break-even-calculator/BreakEvenCalculator';

// Entry point kept at its own path/name so ToolPageClient.js and the
// /calculators/break-even-calculator route (and its SEO metadata) have a
// stable import target — the actual calculator lives in ../break-even-calculator/.
export default function BreakEvenCalculatorWorkspace() {
  return <BreakEvenCalculator />;
}
