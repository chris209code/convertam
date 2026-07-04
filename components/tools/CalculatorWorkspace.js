'use client';

import { useState } from 'react';
import SalaryCalculator from '@/components/tools/SalaryCalculator';


const CALCULATORS = [
  { id: 'vat', label: 'VAT Calculator', icon: '🧾', color: '#2563EB' },
  { id: 'loan', label: 'Loan Calculator', icon: '🏦', color: '#059669' },
  { id: 'salary', label: 'Salary Calculator', icon: '💰', color: '#7C3AED' },
  { id: 'bmi', label: 'BMI Calculator', icon: '⚖️', color: '#D97706' },
  { id: 'age', label: 'Age Calculator', icon: '🎂', color: '#DC2626' },
  { id: 'discount', label: 'Discount Calculator', icon: '🏷️', color: '#0891B2' },
  { id: 'profit', label: 'Profit Margin', icon: '📈', color: '#475569' },
  { id: 'tip', label: 'Tip Calculator', icon: '🍽️', color: '#CA8A04' },
];

function VATCalc() {
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('7.5');
  const [mode, setMode] = useState('add');
  const num = parseFloat(amount) || 0;
  const r = parseFloat(rate) || 0;
  const vat = mode === 'add' ? num * (r / 100) : num - num / (1 + r / 100);
  const result = mode === 'add' ? num + vat : num / (1 + r / 100);

  return (
    <div>
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

function LoanCalc() {
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [months, setMonths] = useState('');
  const p = parseFloat(principal) || 0;
  const r = (parseFloat(rate) || 0) / 100 / 12;
  const n = parseInt(months) || 0;
  const monthly = r > 0 ? p * (r * Math.pow(1+r,n)) / (Math.pow(1+r,n)-1) : p/n;
  const totalPayment = monthly * n;
  const totalInterest = totalPayment - p;

  return (
    <div>
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

// SalaryCalc moved to SalaryCalculator component

function BMICalc() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const bmi = weight && height ? (parseFloat(weight) / Math.pow(parseFloat(height)/100, 2)) : 0;
  const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal weight' : bmi < 30 ? 'Overweight' : 'Obese';
  const catColor = bmi < 18.5 ? '#0891B2' : bmi < 25 ? '#059669' : bmi < 30 ? '#D97706' : '#DC2626';

  return (
    <div>
      {[['Weight (kg)', weight, setWeight, 'e.g. 70'], ['Height (cm)', height, setHeight, 'e.g. 175']].map(([label, val, setter, ph]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
          <input type="number" value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      ))}
      {bmi > 0 && (
        <div style={{ background: '#FFFBEB', borderRadius: 12, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: catColor, marginBottom: 4 }}>{bmi.toFixed(1)}</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: catColor, marginBottom: 8 }}>{category}</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.72rem', color: '#64748B' }}>
            <span>{'<18.5 Underweight'}</span>
            <span>18.5-24.9 Normal</span>
            <span>25-29.9 Overweight</span>
            <span>{'≥30 Obese'}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AgeCalc() {
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
    <div>
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

function DiscountCalc() {
  const [price, setPrice] = useState('');
  const [discount, setDiscount] = useState('');
  const p = parseFloat(price) || 0;
  const d = parseFloat(discount) || 0;
  const saving = p * (d / 100);
  const final = p - saving;

  return (
    <div>
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

function ProfitCalc() {
  const [cost, setCost] = useState('');
  const [revenue, setRevenue] = useState('');
  const c = parseFloat(cost) || 0;
  const r = parseFloat(revenue) || 0;
  const profit = r - c;
  const margin = r > 0 ? (profit / r) * 100 : 0;
  const markup = c > 0 ? (profit / c) * 100 : 0;

  return (
    <div>
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

function TipCalc() {
  const [bill, setBill] = useState('');
  const [tip, setTip] = useState('10');
  const [people, setPeople] = useState('1');
  const b = parseFloat(bill) || 0;
  const t = parseFloat(tip) || 0;
  const n = parseInt(people) || 1;
  const tipAmount = b * (t / 100);
  const total = b + tipAmount;
  const perPerson = total / n;

  return (
    <div>
      {[['Bill Amount (₦)', bill, setBill, 'e.g. 5000'], ['Tip (%)', tip, setTip, '10'], ['Number of People', people, setPeople, '1']].map(([label, val, setter, ph]) => (
        <div key={label} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>{label}</label>
          <input type="number" value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none' }} />
        </div>
      ))}
      {b > 0 && (
        <div style={{ background: '#FFFBEB', borderRadius: 12, padding: 16 }}>
          {[['Tip Amount', tipAmount], ['Total Bill', total], ['Per Person', perPerson]].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.82rem', color: '#475569' }}>{label}</span>
              <span style={{ fontSize: '0.82rem', fontWeight: label === 'Per Person' ? 700 : 400, color: label === 'Per Person' ? '#CA8A04' : '#0F172A' }}>₦{val.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CALC_COMPONENTS = { vat: VATCalc, loan: LoanCalc, salary: SalaryCalculator, bmi: BMICalc, age: AgeCalc, discount: DiscountCalc, profit: ProfitCalc, tip: TipCalc };

export default function CalculatorWorkspace() {
  const [active, setActive] = useState('vat');
  const ActiveCalc = CALC_COMPONENTS[active];

  return (
    <div className="panel">
      {/* Calculator selector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
        {CALCULATORS.map(({ id, label, icon, color }) => (
          <button key={id} onClick={() => setActive(id)} style={{
            padding: '10px 8px', borderRadius: 10, border: '1px solid',
            borderColor: active === id ? color : '#E2E8F0',
            background: active === id ? `${color}15` : 'white',
            color: active === id ? color : '#475569',
            fontWeight: active === id ? 700 : 400,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            transition: 'all 0.15s ease',
          }}>
            <span style={{ fontSize: '1.2rem' }}>{icon}</span>
            <span style={{ lineHeight: 1.2 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Active calculator */}
      <div style={{ background: '#FAFAFA', borderRadius: 16, padding: 20, border: '1px solid #E2E8F0' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', marginBottom: 16 }}>
          {CALCULATORS.find(c => c.id === active)?.icon} {CALCULATORS.find(c => c.id === active)?.label}
        </h3>
        <ActiveCalc />
      </div>
    </div>
  );
}
