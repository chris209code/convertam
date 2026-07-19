'use client';

import { useState } from 'react';

// Logic copied verbatim from the age calculator previously embedded in
// CalculatorWorkspace.js — unchanged, just moved onto its own page.
export default function AgeCalculatorWorkspace() {
  const [dob, setDob] = useState('');
  let years = 0, months = 0, days = 0;
  if (dob) {
    const birth = new Date(dob);
    const now = new Date();
    years = now.getFullYear() - birth.getFullYear();
    months = now.getMonth() - birth.getMonth();
    days = now.getDate() - birth.getDate();
    if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (months < 0) { years--; months += 12; }
  }

  return (
    <div className="panel">
      <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>Date of Birth</label>
      <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', marginBottom: 16, outline: 'none' }} />
      {dob && (
        <div style={{ background: '#FEF2F2', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: '#DC2626', marginBottom: 8 }}>{years} years</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#DC2626' }}>{months}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>months</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#DC2626' }}>{days}</div>
              <div style={{ fontSize: '0.72rem', color: '#64748B' }}>days</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
