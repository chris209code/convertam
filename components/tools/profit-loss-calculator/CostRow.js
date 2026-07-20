'use client';

import NumberInput from '../salary-calculator/NumberInput';
import { lineEquivalents } from './calculations';
import { formatCurrencyCompact } from '../salary-calculator/format';

const pillBtn = (active) => ({
  flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid',
  borderColor: active ? '#2563EB' : '#E2E8F0', background: active ? '#EFF6FF' : '#fff',
  color: active ? '#2563EB' : '#64748B', fontWeight: active ? 700 : 500,
  cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem',
});

// The same dual-mode (% of revenue / fixed amount) bidirectional-display
// and "did you mean an amount?" smart-validation pattern established by
// the Salary Calculator's DeductionRow and the Expense Calculator's
// ExpenseCategoryRow, reimplemented here (not imported) since neither of
// those is safe to touch or reuse for a P&L line item's own wording.
//
// `label` is a fixed, non-editable name for one of the eight named
// operating-expense slots; pass `editableName`/`onNameChange` instead for
// a custom expense row, whose label the user can type and rename.
export default function CostRow({ label, editableName, onNameChange, item, currency, revenueBase, onChange, onRemove, showRemove }) {
  const equivalents = lineEquivalents(item, revenueBase);
  const isPercent = item.mode === 'percent';
  const numValue = Number(item.value);
  const hasValue = item.value !== '' && Number.isFinite(numValue);

  function switchMode(newMode) {
    if (newMode === item.mode) return;
    if (hasValue && numValue > 0) {
      const converted = newMode === 'percent' ? equivalents.percent : equivalents.amount;
      onChange('value', String(Math.round(converted * 100) / 100));
    }
    onChange('mode', newMode);
  }

  function acceptAmountSuggestion() {
    onChange('mode', 'fixed');
  }

  const overHundred = isPercent && hasValue && numValue > 100;
  const isNegative = hasValue && numValue < 0;
  const rowLabel = editableName != null ? editableName : label;

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {editableName != null ? (
          <input
            aria-label="Custom expense name"
            value={editableName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Software Subscriptions"
            style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', fontWeight: 600, color: '#0F172A' }}
          />
        ) : (
          <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: '#0F172A' }}>{label}</span>
        )}
        {showRemove && (
          <button onClick={onRemove} aria-label={`Remove ${rowLabel || 'expense'}`} style={{ width: 26, height: 26, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>×</button>
        )}
      </div>

      <div role="radiogroup" aria-label={`${rowLabel || 'Expense'} input mode`} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button role="radio" aria-checked={isPercent} style={pillBtn(isPercent)} onClick={() => switchMode('percent')}>% of Revenue</button>
        <button role="radio" aria-checked={!isPercent} style={pillBtn(!isPercent)} onClick={() => switchMode('fixed')}>Amount</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', minWidth: 120 }}>
          {isPercent ? (
            <NumberInput ariaLabel={`${rowLabel || 'Expense'} percentage`} value={item.value} onChange={(v) => onChange('value', v)} placeholder="0" suffix="%" />
          ) : (
            <NumberInput ariaLabel={`${rowLabel || 'Expense'} amount`} value={item.value} onChange={(v) => onChange('value', v)} placeholder="0.00" prefix={currency} />
          )}
        </div>
        {hasValue && numValue > 0 && !overHundred && (
          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
            {isPercent
              ? <>≈ {formatCurrencyCompact(equivalents.amount, currency)}</>
              : <>≈ {equivalents.percent.toFixed(2)}% of revenue</>}
          </div>
        )}
      </div>

      {overHundred && (
        <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <span aria-hidden="true" style={{ fontSize: '0.95rem', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', color: '#92400E' }}>This value is above 100. Did you mean an amount?</div>
            <button onClick={acceptAmountSuggestion} style={{ marginTop: 6, fontSize: '0.75rem', fontWeight: 700, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Switch to Amount
            </button>
          </div>
        </div>
      )}
      {isNegative && (
        <div role="alert" style={{ marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: '0.78rem', color: '#991B1B' }}>
          {isPercent ? 'Percentage' : 'Amount'} cannot be negative.
        </div>
      )}
    </div>
  );
}
