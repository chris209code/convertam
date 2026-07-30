// Tool metadata for the Calculator Hub page — see lib/toolSections/pdf.js
// for why this lives as a standalone data module.
export const SECTIONS = [
  {
    id: 'financial',
    label: 'Business & Finance',
    icon: '💼',
    tools: [
      { slug: 'salary-calculator', title: 'Salary Calculator', desc: 'Calculate gross salary, deductions and take-home pay instantly', icon: '💰', badge: 'popular' },
      { slug: 'loan-calculator', title: 'Loan Calculator', desc: 'Work out monthly repayments, total interest and total repayment', icon: '🏦', badge: 'free', href: '/calculators/loan-calculator' },
      { slug: 'vat-calculator', title: 'VAT Calculator', desc: 'Add VAT to an amount or extract it from a VAT-inclusive price', icon: '🧾', badge: 'free', href: '/calculators/vat-calculator' },
      { slug: 'profit-margin', title: 'Profit & Loss Calculator', desc: 'Analyse revenue, expenses, margins, pricing and business performance', icon: '📈', badge: 'free', href: '/calculators/profit-margin' },
      { slug: 'discount-calculator', title: 'Discount Calculator', desc: 'Find the final price and total savings on any discounted item', icon: '🏷️', badge: 'free', href: '/calculators/discount-calculator' },
      { slug: 'expense-budget-calculator', title: 'Expense & Budget Calculator', desc: 'Track income, expenses and savings, and see your remaining balance live', icon: '💵', badge: 'free', href: '/calculators/expense-budget-calculator' },
      { slug: 'break-even-calculator', title: 'Break-even Calculator', desc: 'Find out how many units you need to sell to cover your costs', icon: '⚖️', badge: 'free', href: '/calculators/break-even-calculator' },
      { slug: 'savings-goal-calculator', title: 'Savings Goal Calculator', desc: 'Plan how much to save regularly to hit a target, interest included', icon: '🎯', badge: 'free', href: '/calculators/savings-goal-calculator' },
    ],
  },
  {
    id: 'personal',
    label: 'Everyday',
    icon: '🙋',
    tools: [
      { slug: 'age-calculator', title: 'Age Calculator', desc: 'Calculate exact age in years, months and days from a date of birth', icon: '🎂', badge: 'free', href: '/calculators/age-calculator' },
    ],
  },
];
