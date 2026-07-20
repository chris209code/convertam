'use client';

import LoanCalculator from '../loan-calculator/LoanCalculator';

// Entry point kept at its original path/name so ToolPageClient.js and the
// /calculators/loan-calculator route (and its SEO metadata) are untouched —
// the actual premium calculator now lives in ../loan-calculator/.
export default function LoanCalculatorWorkspace() {
  return <LoanCalculator />;
}
