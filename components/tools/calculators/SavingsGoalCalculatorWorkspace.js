'use client';

import SavingsGoalCalculator from '../savings-goal-calculator/SavingsGoalCalculator';

// Entry point kept at its own path/name so ToolPageClient.js and the
// /calculators/savings-goal-calculator route (and its SEO metadata) have
// a stable import target — the actual calculator lives in
// ../savings-goal-calculator/.
export default function SavingsGoalCalculatorWorkspace() {
  return <SavingsGoalCalculator />;
}
