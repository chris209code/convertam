'use client';

import { useState } from 'react';

// Logic copied verbatim from the loan calculator previously embedded in
// CalculatorWorkspace.js — unchanged, just moved onto its own page.
export default function LoanCalculatorWorkspace() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const p = parseFloat(principal) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = parseInt(months) || 0;
  const monthly = r > 0 ? p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : p / n;
  const totalPayment = monthly * n;
  const totalInterest = totalPayment - p;

  return (
    <div className="panel">
      {[['Principal Amount (₦)', principal, setPrincipal, 'e.g. 500000'], ['Annual Interest Rate (%)', rate, setRate, 'e.g. 12'], ['Loan Duration (months)', months, setMonths, 'e.g. 24']].map(([label, val, setter, ph]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
          <input type="number" value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      ))}
      {p > 0 && n > 0 && (
        <div style={{ background: '#ECFDF5', borderRadius: 12, padding: 16 }}>
          {[['Monthly Payment', monthly], ['Total Payment', totalPayment], ['Total Interest', totalInterest]].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: '#475569' }}>{label}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#059669' }}>₦{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
