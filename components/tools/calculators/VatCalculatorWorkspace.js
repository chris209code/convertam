'use client';

import VatCalculator from '../vat-calculator/VatCalculator';

// Entry point kept at its original path/name so ToolPageClient.js and the
// /calculators/vat-calculator route (and its SEO metadata) are untouched —
// the actual professional VAT tool now lives in ../vat-calculator/.
export default function VatCalculatorWorkspace() {
  return <VatCalculator />;
}
