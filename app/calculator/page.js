import Link from 'next/link';

export const metadata = {
  title: 'Calculators — Convertam',
  description: 'Free online calculators. VAT, loan, salary, expense, profit and loss and more. No login required.',
};

export default function CalculatorPage() {
  return (
    <main style={{ width: '100%', minHeight: '100vh', background: 'linear-gradient(180deg, #FEF2F2 0%, #FEE2E2 100%)' }}>
      <style>{`
        .page-inner { width: 100%; padding: 0 4%; }
      `}</style>

      <div style={{ background: 'white', borderBottom: '1px solid #FECACA', padding: '40px 0' }}>
        <div className="page-inner">
          <Link href="/" style={{ fontSize: '0.8rem', color: '#DC2626', textDecoration: 'none', marginBottom: '12px', display: 'inline-block' }}>← Back to Home</Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '2.5rem' }}>🧮</span>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: '#152238', margin: 0 }}>Calculators</h1>
              <p style={{ fontSize: '0.9rem', color: '#64748B', margin: '4px 0 0' }}>VAT, loan, salary, expense and more — all in one place.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="page-inner" style={{ padding: '48px 4%', textAlign: 'center' }}>
        <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 500, margin: '0 auto', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🧮</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Calculator Hub</h2>
          <p style={{ fontSize: '0.88rem', color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
            VAT, Loan, Salary, Expense &amp; Budget, Age, Discount and Profit &amp; Loss calculators — all in one place.
          </p>
          <Link href="/calculator-hub" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', background: '#DC2626', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>
            Open Calculator Hub →
          </Link>
        </div>
      </div>
    </main>
  );
}
