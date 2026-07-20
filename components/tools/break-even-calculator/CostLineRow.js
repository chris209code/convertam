'use client';

import NumberInput from '../salary-calculator/NumberInput';

// A single named fixed/variable cost line — deliberately simpler than the
// dual-mode (%/amount) CostRow used by the Profit & Loss and Expense &
// Budget calculators: every row here is a flat amount (a per-period fixed
// cost, or a per-unit variable cost) that sums directly into its total,
// with no percentage mode to switch between.
export default function CostLineRow({ row, currency, unitLabel, onChange, onRemove, showRemove }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <input
        aria-label="Cost line name"
        value={row.name}
        onChange={(e) => onChange('name', e.target.value)}
        placeholder="e.g. Other"
        style={{ flex: '1 1 130px', minWidth: 0, padding: '9px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', fontWeight: 600, color: '#0F172A' }}
      />
      <div style={{ flex: '1 1 130px', minWidth: 110 }}>
        <NumberInput ariaLabel={`${row.name || 'Cost line'} amount`} value={row.value} onChange={(v) => onChange('value', v)} placeholder="0.00" prefix={currency} />
      </div>
      {unitLabel && <span style={{ fontSize: '0.68rem', color: '#94A3B8', flexShrink: 0, whiteSpace: 'nowrap' }}>{unitLabel}</span>}
      {showRemove && (
        <button onClick={onRemove} aria-label={`Remove ${row.name || 'cost line'}`} style={{ width: 26, height: 26, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>×</button>
      )}
    </div>
  );
}
