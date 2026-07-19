'use client';

import { useState } from 'react';

// Logic copied verbatim from the discount calculator previously embedded in
// CalculatorWorkspace.js — unchanged, just moved onto its own page.
export default function DiscountCalculatorWorkspace() {
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const p = parseFloat(price) || 0;
  const d = parseFloat(discount) || 0;
  const saving = p * (d / 100);
  const final = p - saving;

  return (
    <div className="panel">
      {[['Original Price (₦)', price, setPrice, 'e.g. 25000'], ['Discount (%)', discount, setDiscount, 'e.g. 20']].map(([label, val, setter, ph]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
          <input type="number" value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      ))}
      {p > 0 && d > 0 && (
        <div style={{ background: '#ECFEFF', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: '#475569' }}>You save</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#DC2626' }}>₦{saving.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A' }}>Final Price</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0891B2' }}>₦{final.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
