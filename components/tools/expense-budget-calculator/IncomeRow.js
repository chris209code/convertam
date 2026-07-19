'use client';

import NumberInput from '../salary-calculator/NumberInput';
import { getIncomeIcon } from './expenseIcons';

// A single income source row — name (renameable, including the defaults)
// plus an amount in the globally-selected income period. Simpler than
// ExpenseCategoryRow since income has no percentage mode.
export default function IncomeRow({ source, currency, onChange, onRemove, showRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span aria-hidden="true" style={{ fontSize: '1.05rem', flexShrink: 0 }}>{getIncomeIcon(source.name)}</span>
      <input
        aria-label="Income source name"
        value={source.name}
        onChange={(e) => onChange('name', e.target.value)}
        placeholder="e.g. Salary"
        style={{ flex: '1 1 120px', minWidth: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', fontWeight: 600, color: '#0F172A' }}
      />
      <div style={{ flex: '1 1 130px', minWidth: 110 }}>
        <NumberInput ariaLabel={`${source.name || 'Income source'} amount`} value={source.amount} onChange={(v) => onChange('amount', v)} placeholder="0.00" prefix={currency} />
      </div>
      {showRemove && (
        <button onClick={onRemove} aria-label={`Remove ${source.name || 'income source'}`} style={{ width: 26, height: 26, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>×</button>
      )}
    </div>
  );
}
