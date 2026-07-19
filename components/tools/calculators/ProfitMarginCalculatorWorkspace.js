'use client';

import { useState } from 'react';

// Logic copied verbatim from the profit margin calculator previously
// embedded in CalculatorWorkspace.js — unchanged, just moved onto its own page.
export default function ProfitMarginCalculatorWorkspace() {
  const [cost, setCost] = useState('');
  const [revenue, setRevenue] = useState('');
  const c = parseFloat(cost) || 0;
  const r = parseFloat(revenue) || 0;
  const profit = r - c;
  const margin = r > 0 ? (profit / r) * 100 : 0;
  const markup = c > 0 ? (profit / c) * 100 : 0;

  return (
    <div className="panel">
      {[['Cost Price (₦)', cost, setCost, 'e.g. 10000'], ['Selling Price (₦)', revenue, setRevenue, 'e.g. 15000']].map(([label, val, setter, ph]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
          <input type="number" value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      ))}
      {c > 0 && r > 0 && (
        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 16 }}>
          {[['Profit', `₦${profit.toLocaleString(undefined,{minimumFractionDigits:2})}`], ['Profit Margin', `${margin.toFixed(2)}%`], ['Markup', `${markup.toFixed(2)}%`]].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: '#475569' }}>{label}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: profit >= 0 ? '#475569' : '#DC2626' }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
