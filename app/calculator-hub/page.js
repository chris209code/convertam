import CalculatorHubClient from '@/components/CalculatorHubClient';

export const metadata = {
  title: 'Calculator Hub — Free Online Calculators | Convertam',
  description: 'Salary, Loan, VAT, Profit Margin, Discount and Age calculators — free, fast, and no login required.',
  alternates: { canonical: '/calculator-hub' },
};

export default function CalculatorHubPage() {
  return <CalculatorHubClient />;
}
