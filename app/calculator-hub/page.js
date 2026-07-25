import CategoryLandingClient from '@/components/CategoryLandingClient';
import { CalculatorIcon, CATEGORY_ACCENTS, relatedSuites } from '@/components/categoryVisuals';
import { buildOgMeta } from '@/lib/pageMetadata';

const TITLE = 'Calculator Hub — Free Online Calculators | Convertam';
const DESCRIPTION = 'Salary, Loan, VAT, Profit & Loss, Discount, Age, Expense, Break-even and Savings Goal calculators — free, fast, no login required.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/calculator-hub' },
  ...buildOgMeta({ title: TITLE, description: DESCRIPTION, path: '/calculator-hub' }),
};

const EDITORIAL = {
  intro: [
    "These calculators exist to answer a real decision, not just crunch a number in isolation — what a salary actually pays after deductions, whether a loan is affordable, how much VAT to add to a price, whether a business is genuinely profitable, or how much to save each month to hit a goal. Each one runs its full calculation live in your browser: change any figure and every result, chart and breakdown updates immediately, with no page reload.",
    'Every calculation happens entirely on your device — nothing you enter (salary figures, loan amounts, business revenue) is ever sent to a server or stored anywhere. Several calculators also include a "What-If Simulator" for testing a scenario against your real numbers without changing what you actually entered.',
  ],
  whoFor: [
    'Employees comparing a job offer\'s gross salary against real take-home pay',
    'Anyone taking out a loan or checking if one fits their budget',
    'Small business owners pricing products and checking VAT or margins',
    'Anyone building a personal budget or saving toward a specific goal',
  ],
  learnLinks: [
    { title: 'VAT Explained for Small Businesses', href: '/learn/calculator-guides/vat-explained-for-small-businesses' },
    { title: 'How Loan Amortization Works', href: '/learn/calculator-guides/how-loan-amortization-works' },
    { title: 'Profit Margin vs. Markup', href: '/learn/calculator-guides/profit-margin-vs-markup' },
  ],
};

const FAQS = [
  {
    q: 'Are these calculators accurate enough for real financial decisions?',
    a: "They're genuine calculation engines, not toy demos — the loan calculator produces a full amortization schedule, the salary calculator handles multiple deduction types, and the profit & loss calculator supports detailed operating expenses. That said, tax and lending calculations vary by jurisdiction, so treat results as a strong planning estimate and confirm exact figures for anything legally or contractually binding.",
  },
  {
    q: 'Is my financial data stored anywhere?',
    a: 'No — every calculation runs entirely in your browser. Nothing you enter is sent to a server or saved.',
  },
  {
    q: 'Are the calculators free?',
    a: 'Yes, every calculator is completely free with no login required and no limit on how many times you use them.',
  },
  {
    q: 'Can I export or share my results?',
    a: 'Yes — every calculator supports downloading a PDF report, printing, or copying the results as text.',
  },
];

const SECTIONS = [
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

const SECTIONS_WITH_HREF = SECTIONS.map((s) => ({ ...s, tools: s.tools.map((t) => ({ ...t, href: t.href || `/${t.slug}` })) }));

const RELATED_CATEGORIES = relatedSuites('calculator-hub');

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function CalculatorHubPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <CategoryLandingClient
        accent={CATEGORY_ACCENTS.calculator}
        icon={CalculatorIcon}
        title="Calculator Hub"
        subtitle="Calculators that help you make real financial and business decisions."
        editorial={EDITORIAL}
        sections={SECTIONS_WITH_HREF}
        faqs={FAQS}
        relatedCategories={RELATED_CATEGORIES}
      />
    </>
  );
}
