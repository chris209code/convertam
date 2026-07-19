'use client';

import { useState } from 'react';

// Logic copied verbatim from the VAT calculator previously embedded in
// CalculatorWorkspace.js — unchanged, just moved onto its own page.
export default function VatCalculatorWorkspace() {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('7.5');
  const [mode, setMode] = useState('add');
  const num = parseFloat(amount) || 0;
  const r = parseFloat(rate) || 0;
  const vat = mode === 'add' ? num * (r / 100) : num - num / (1 + r / 100);
  const result = mode === 'add' ? num + vat : num / (1 + r / 100);

  return (
    <div className="panel">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['add', 'extract'].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: '1px solid', borderColor: mode === m ? '#2563EB' : '#E2E8F0', background: mode === m ? '#EFF6FF' : 'white', color: mode === m ? '#2563EB' : '#475569', fontWeight: mode === m ? 700 : 400, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem' }}>
            {m === 'add' ? 'Add VAT' : 'Extract VAT'}
          </button>
        ))}
      </div>
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Amount (₦)</label>
      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: 12, outline: 'none' }} />
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>VAT Rate (%)</label>
      <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="7.5" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: 16, outline: 'none' }} />
      {num > 0 && (
        <div style={{ background: '#EFF6FF', borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: '#475569' }}>{mode === 'add' ? 'Original Amount' : 'Amount excl. VAT'}</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>₦{(mode === 'add' ? num : result).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: '0.82rem', color: '#475569' }}>VAT ({rate}%)</span>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>₦{Math.abs(vat).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #BFDBFE', paddingTop: 8 }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1E3A5F' }}>{mode === 'add' ? 'Total incl. VAT' : 'Original Amount'}</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2563EB' }}>₦{(mode === 'add' ? result : num).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
