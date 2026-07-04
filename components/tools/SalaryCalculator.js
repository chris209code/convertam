'use client';

import { useState } from 'react';

const DEDUCTION_ICONS = {
  'Tax': '🏛️', 'Income Tax': '🏛️', 'PAYE': '🏛️',
  'Pension': '👴', 'Retirement': '👴', 'NHF': '🏠',
  'Health': '❤️', 'NHIS': '❤️', 'Medical': '❤️',
  'Student Loan': '🎓', 'Education': '🎓',
  'Union': '👷', 'Union Dues': '👷',
  'Social Security': '🛡️', 'National Insurance': '🛡️',
  'Mortgage': '🏠', 'Housing': '🏠',
  'Other': '➕',
};

function getIcon(name) {
  const key = Object.keys(DEDUCTION_ICONS).find(k => name.toLowerCase().includes(k.toLowerCase()));
  return key ? DEDUCTION_ICONS[key] : '➕';
}

const FREQUENCIES = [
  { id: 'hourly', label: 'Hourly', multiplier: 2080 },
  { id: 'daily', label: 'Daily', multiplier: 260 },
  { id: 'weekly', label: 'Weekly', multiplier: 52 },
  { id: 'biweekly', label: 'Bi-weekly', multiplier: 26 },
  { id: 'monthly', label: 'Monthly', multiplier: 12 },
  { id: 'annually', label: 'Annually', multiplier: 1 },
];

const TEMPLATES = [
  {
    name: '🇳🇬 Nigeria (PAYE)',
    deductions: [
      { id: 1, name: 'Income Tax (PAYE)', type: 'percent', value: '18', beforeTax: true },
      { id: 2, name: 'Pension', type: 'percent', value: '8', beforeTax: true },
      { id: 3, name: 'NHIS', type: 'percent', value: '1.75', beforeTax: false },
      { id: 4, name: 'NHF', type: 'percent', value: '2.5', beforeTax: false },
    ],
  },
  {
    name: '🇬🇧 United Kingdom',
    deductions: [
      { id: 1, name: 'Income Tax', type: 'percent', value: '20', beforeTax: true },
      { id: 2, name: 'National Insurance', type: 'percent', value: '12', beforeTax: false },
      { id: 3, name: 'Student Loan', type: 'percent', value: '9', beforeTax: false },
    ],
  },
  {
    name: '🇺🇸 United States',
    deductions: [
      { id: 1, name: 'Federal Income Tax', type: 'percent', value: '22', beforeTax: true },
      { id: 2, name: 'Social Security', type: 'percent', value: '6.2', beforeTax: false },
      { id: 3, name: 'Medicare', type: 'percent', value: '1.45', beforeTax: false },
      { id: 4, name: 'State Tax', type: 'percent', value: '5', beforeTax: false },
    ],
  },
  {
    name: '⚙️ Custom (Blank)',
    deductions: [],
  },
];

function formatCurrency(amount, currency) {
  if (isNaN(amount)) return `${currency}0.00`;
  return `${currency}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function SalaryCalculator() {
  const [gross, setGross] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [currency, setCurrency] = useState('₦');
  const [deductions, setDeductions] = useState([
    { id: 1, name: 'Income Tax', type: 'percent', value: '', beforeTax: true },
  ]);
  const [overtime, setOvertime] = useState({ enabled: false, hourlyRate: '', hoursWorked: '', standardHours: '40', multiplier: '1.5' });
  const [bonuses, setBonuses] = useState([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [nextId, setNextId] = useState(10);

  function addDeduction() {
    setDeductions(prev => [...prev, { id: nextId, name: '', type: 'percent', value: '', beforeTax: false }]);
    setNextId(n => n + 1);
  }

  function removeDeduction(id) {
    setDeductions(prev => prev.filter(d => d.id !== id));
  }

  function updateDeduction(id, key, val) {
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, [key]: val } : d));
  }

  function addBonus() {
    setBonuses(prev => [...prev, { id: nextId, name: '', amount: '' }]);
    setNextId(n => n + 1);
  }

  function applyTemplate(template) {
    setDeductions(template.deductions.map((d, i) => ({ ...d, id: i + 1 })));
    setNextId(template.deductions.length + 10);
    setShowTemplates(false);
  }

  // Calculations
  const freqData = FREQUENCIES.find(f => f.id === frequency);
  const grossAmount = parseFloat(gross) || 0;
  const annualGross = grossAmount * freqData.multiplier;

  // Overtime
  let overtimeBonus = 0;
  if (overtime.enabled && overtime.hourlyRate && overtime.hoursWorked) {
    const hrs = parseFloat(overtime.hoursWorked) || 0;
    const std = parseFloat(overtime.standardHours) || 40;
    const rate = parseFloat(overtime.hourlyRate) || 0;
    const mult = parseFloat(overtime.multiplier) || 1.5;
    const otHrs = Math.max(0, hrs - std);
    overtimeBonus = otHrs * rate * mult;
  }

  // Bonuses
  const totalBonuses = bonuses.reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);

  const totalAnnualGross = annualGross + overtimeBonus * 52 + totalBonuses;

  // Before-tax deductions reduce taxable income
  const beforeTaxDeductions = deductions
    .filter(d => d.beforeTax && d.value)
    .reduce((sum, d) => {
      if (d.type === 'percent') return sum + totalAnnualGross * (parseFloat(d.value) || 0) / 100;
      return sum + (parseFloat(d.value) || 0) * freqData.multiplier;
    }, 0);

  const taxableIncome = totalAnnualGross - beforeTaxDeductions;

  // After-tax deductions
  const afterTaxDeductions = deductions
    .filter(d => !d.beforeTax && d.value)
    .reduce((sum, d) => {
      if (d.type === 'percent') return sum + taxableIncome * (parseFloat(d.value) || 0) / 100;
      return sum + (parseFloat(d.value) || 0) * freqData.multiplier;
    }, 0);

  const totalDeductions = beforeTaxDeductions + afterTaxDeductions;
  const annualNet = totalAnnualGross - totalDeductions;

  // Per period breakdowns
  function perPeriod(annual, freq) {
    const f = FREQUENCIES.find(f => f.id === freq);
    return annual / f.multiplier;
  }

  const hasResults = grossAmount > 0;

  const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' };
  const labelStyle = { fontSize: '0.72rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 };

  return (
    <div>
      <style>{`
        .sal-section { background: #F8FAFC; border-radius: 14px; padding: 20px; border: 1px solid #E2E8F0; margin-bottom: 16px; }
        .sal-section-title { font-size: 0.82rem; font-weight: 700; color: #0F172A; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .deduction-row { display: grid; grid-template-columns: 1fr 90px 100px 100px 32px; gap: 8px; margin-bottom: 8px; align-items: center; }
        .result-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
        .result-row:last-child { border-bottom: none; }
        .template-btn { padding: 8px 14px; border-radius: 10px; border: 1px solid #E2E8F0; background: white; cursor: pointer; font-family: inherit; font-size: 0.8rem; color: #475569; transition: all 0.15s; text-align: left; }
        .template-btn:hover { border-color: #2563EB; color: #2563EB; background: #EFF6FF; }
        .freq-btn { flex: 1; padding: 7px 4px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; cursor: pointer; font-family: inherit; font-size: 0.72rem; color: #475569; transition: all 0.15s; text-align: center; }
        .freq-btn.active { border-color: #2563EB; background: #EFF6FF; color: #2563EB; font-weight: 700; }
        @media (max-width: 640px) {
          .deduction-row { grid-template-columns: 1fr 80px 80px 32px; }
          .deduction-beforetax { display: none; }
        }
      `}</style>

      {/* Step 1: Salary */}
      <div className="sal-section">
        <div className="sal-section-title">💰 Step 1 — Enter Your Salary</div>

        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Currency</label>
            <input style={inputStyle} value={currency} onChange={e => setCurrency(e.target.value)} placeholder="₦" maxLength={3} />
          </div>
          <div>
            <label style={labelStyle}>Gross Amount</label>
            <input type="number" style={inputStyle} value={gross} onChange={e => setGross(e.target.value)} placeholder="e.g. 500000" />
          </div>
        </div>

        <label style={labelStyle}>Pay Frequency</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FREQUENCIES.map(f => (
            <button key={f.id} className={`freq-btn ${frequency === f.id ? 'active' : ''}`} onClick={() => setFrequency(f.id)}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Deductions */}
      <div className="sal-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div className="sal-section-title" style={{ margin: 0 }}>✂️ Step 2 — Deductions</div>
          <button onClick={() => setShowTemplates(!showTemplates)} style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#2563EB', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            📋 Load Template
          </button>
        </div>

        {showTemplates && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
            {TEMPLATES.map(t => (
              <button key={t.name} className="template-btn" onClick={() => applyTemplate(t)}>{t.name}</button>
            ))}
          </div>
        )}

        {/* Column headers */}
        <div className="deduction-row" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Deduction Name</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Type</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Value</span>
          <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }} className="deduction-beforetax">Timing</span>
          <span></span>
        </div>

        {deductions.map(d => (
          <div key={d.id} className="deduction-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{getIcon(d.name)}</span>
              <input style={{ ...inputStyle, padding: '6px 8px' }} value={d.name} onChange={e => updateDeduction(d.id, 'name', e.target.value)} placeholder="e.g. Tax, Pension" />
            </div>
            <select style={{ ...inputStyle, padding: '6px 8px' }} value={d.type} onChange={e => updateDeduction(d.id, 'type', e.target.value)}>
              <option value="percent">%</option>
              <option value="fixed">Fixed</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input type="number" style={{ ...inputStyle, padding: '6px 8px' }} value={d.value} onChange={e => updateDeduction(d.id, 'value', e.target.value)} placeholder={d.type === 'percent' ? '0' : '0.00'} />
              <span style={{ fontSize: '0.78rem', color: '#94A3B8', flexShrink: 0 }}>{d.type === 'percent' ? '%' : currency}</span>
            </div>
            <select style={{ ...inputStyle, padding: '6px 8px', fontSize: '0.72rem' }} className="deduction-beforetax" value={d.beforeTax ? 'before' : 'after'} onChange={e => updateDeduction(d.id, 'beforeTax', e.target.value === 'before')}>
              <option value="before">Pre-tax</option>
              <option value="after">Post-tax</option>
            </select>
            <button onClick={() => removeDeduction(d.id)} style={{ width: 28, height: 28, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', fontSize: '0.9rem', flexShrink: 0 }}>×</button>
          </div>
        ))}

        <button onClick={addDeduction} style={{ marginTop: 8, fontSize: '0.8rem', color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
          ➕ Add Deduction
        </button>
      </div>

      {/* Overtime */}
      <div className="sal-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: overtime.enabled ? 14 : 0 }}>
          <div className="sal-section-title" style={{ margin: 0 }}>⏰ Overtime (optional)</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.82rem', color: '#475569' }}>
            <input type="checkbox" checked={overtime.enabled} onChange={e => setOvertime(o => ({ ...o, enabled: e.target.checked }))} />
            Enable
          </label>
        </div>
        {overtime.enabled && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[['Hourly Rate', 'hourlyRate', 'e.g. 2500'], ['Hours Worked', 'hoursWorked', 'e.g. 45'], ['Standard Hours', 'standardHours', '40'], ['OT Multiplier', 'multiplier', '1.5']].map(([label, key, ph]) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <input type="number" style={inputStyle} value={overtime[key]} onChange={e => setOvertime(o => ({ ...o, [key]: e.target.value }))} placeholder={ph} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bonuses */}
      <div className="sal-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: bonuses.length ? 14 : 0 }}>
          <div className="sal-section-title" style={{ margin: 0 }}>🎁 Bonuses (optional)</div>
          <button onClick={addBonus} style={{ fontSize: '0.75rem', color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>+ Add Bonus</button>
        </div>
        {bonuses.map(b => (
          <div key={b.id} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 32px', gap: 8, marginBottom: 8 }}>
            <input style={inputStyle} value={b.name} onChange={e => setBonuses(prev => prev.map(x => x.id === b.id ? { ...x, name: e.target.value } : x))} placeholder="e.g. Performance Bonus, 13th Month" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: '0.82rem', color: '#94A3B8' }}>{currency}</span>
              <input type="number" style={inputStyle} value={b.amount} onChange={e => setBonuses(prev => prev.map(x => x.id === b.id ? { ...x, amount: e.target.value } : x))} placeholder="0.00" />
            </div>
            <button onClick={() => setBonuses(prev => prev.filter(x => x.id !== b.id))} style={{ width: 28, height: 28, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', fontSize: '0.9rem' }}>×</button>
          </div>
        ))}
      </div>

      {/* Results */}
      {hasResults && (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, #0F172A, #1E3A5F)', padding: '20px 24px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Net Take-Home ({frequency})</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white' }}>{formatCurrency(perPeriod(annualNet, frequency), currency)}</div>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* Breakdown */}
            <div className="result-row">
              <span style={{ fontSize: '0.85rem', color: '#475569' }}>Gross ({frequency})</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{formatCurrency(grossAmount + (overtime.enabled ? overtimeBonus : 0) + totalBonuses / freqData.multiplier, currency)}</span>
            </div>

            {deductions.filter(d => d.value).map(d => {
              const annualAmt = d.type === 'percent'
                ? (d.beforeTax ? totalAnnualGross : taxableIncome) * (parseFloat(d.value) || 0) / 100
                : (parseFloat(d.value) || 0) * freqData.multiplier;
              return (
                <div key={d.id} className="result-row">
                  <span style={{ fontSize: '0.82rem', color: '#475569' }}>
                    {getIcon(d.name)} {d.name || 'Deduction'} {d.type === 'percent' ? `(${d.value}%)` : ''} {d.beforeTax ? <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>pre-tax</span> : ''}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#DC2626' }}>-{formatCurrency(perPeriod(annualAmt, frequency), currency)}</span>
                </div>
              );
            })}

            <div className="result-row" style={{ borderTop: '2px solid #E2E8F0', marginTop: 4, paddingTop: 12 }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A' }}>Total Deductions</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DC2626' }}>-{formatCurrency(perPeriod(totalDeductions, frequency), currency)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#ECFDF5', borderRadius: 10, marginTop: 8 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#065F46' }}>Net Take-Home</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#059669' }}>{formatCurrency(perPeriod(annualNet, frequency), currency)}</span>
            </div>

            {/* All period breakdowns */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Equivalent Earnings</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {FREQUENCIES.map(f => (
                  <div key={f.id} style={{ textAlign: 'center', padding: '10px 8px', background: frequency === f.id ? '#EFF6FF' : '#F8FAFC', borderRadius: 10, border: `1px solid ${frequency === f.id ? '#BFDBFE' : '#E2E8F0'}` }}>
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8', marginBottom: 4, textTransform: 'capitalize' }}>{f.label}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: frequency === f.id ? '#2563EB' : '#0F172A' }}>{formatCurrency(perPeriod(annualNet, f.id), currency)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
