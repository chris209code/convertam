'use client';

import NumberInput from './NumberInput';
import { getDeductionIcon } from './deductionIcons';
import { deductionEquivalents } from './calculations';
import { formatCurrencyCompact } from './format';

const pillBtn = (active) => ({
  flex: 1, padding: '6px 10px', borderRadius: 8, border: '1px solid',
  borderColor: active ? '#7C3AED' : '#E2E8F0', background: active ? '#F5F3FF' : '#fff',
  color: active ? '#7C3AED' : '#64748B', fontWeight: active ? 700 : 500,
  cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.75rem',
});

// Every deduction supports both a % and a fixed-amount mode — whichever
// one isn't the active input shows a live, read-only equivalent
// ("≈ ₦37,500/mo") computed from deductionEquivalents so a person who
// only knows one side of the number can still see the other, without the
// row ever storing two competing values for the same deduction.
export default function DeductionRow({ deduction, currency, base, freqMultiplier, freqLabel, onChange, onRemove, showRemove }) {
  const equivalents = deductionEquivalents(deduction, base, freqMultiplier);
  const isPercent = deduction.type === 'percent';
  const numValue = Number(deduction.value);
  const hasValue = deduction.value !== '' && Number.isFinite(numValue);

  // Switching modes must carry the deduction's actual MEANING across —
  // ₦80,681 stays ₦80,681 whichever way it's displayed. Without this, the
  // raw stored string was left untouched across a mode switch and simply
  // reinterpreted under the new unit (a fixed amount of "80681" becoming a
  // literal 80,681% the moment Percentage was clicked), which could
  // silently turn a normal deduction into one wildly larger than gross
  // income. onChange updates value and type as two separate calls, but
  // both land on the same functional setState update in the parent, so
  // they can't be torn apart by a re-render landing in between.
  function switchMode(newType) {
    if (newType === deduction.type) return;
    if (hasValue && numValue > 0) {
      const converted = newType === 'percent' ? equivalents.percent : equivalents.amountPerPeriod;
      onChange('value', String(Math.round(converted * 100) / 100));
    }
    onChange('type', newType);
  }

  // The "did you mean an amount?" fix is deliberately NOT the same
  // conversion switchMode() does above — that path preserves what a
  // percentage/amount actually MEANS when someone deliberately re-labels
  // it. Here the person's number was never a real percentage to begin
  // with (it was a mistaken mode selection), so the fix is to keep the
  // digits exactly as typed and just reinterpret the unit — 150 stays
  // 150, now read as a currency amount instead of a nonsensical 150%.
  function acceptAmountSuggestion() {
    onChange('type', 'fixed');
  }

  const overHundred = isPercent && hasValue && numValue > 100;
  // NumberInput already strips any "-" a person types or pastes, so a
  // negative value can't actually reach this component through the UI —
  // this only guards against one arriving some other way (e.g. a future
  // template or programmatic change) without silently coercing it.
  const isNegative = hasValue && numValue < 0;

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 14, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ fontSize: '1.05rem', flexShrink: 0 }}>{getDeductionIcon(deduction.name)}</span>
        <input
          aria-label="Deduction name"
          value={deduction.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="e.g. Tax, Pension, NHF"
          style={{ flex: 1, minWidth: 0, padding: '7px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', fontWeight: 600, color: '#0F172A' }}
        />
        {showRemove && (
          <button onClick={onRemove} aria-label={`Remove ${deduction.name || 'deduction'}`} style={{ width: 26, height: 26, borderRadius: '50%', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>×</button>
        )}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#64748B', cursor: 'pointer', marginBottom: 10 }}>
        <input type="checkbox" checked={deduction.beforeTax} onChange={(e) => onChange('beforeTax', e.target.checked)} />
        Pre-tax — reduces taxable income before tax is calculated
      </label>

      <div role="radiogroup" aria-label={`${deduction.name || 'Deduction'} input mode`} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <button role="radio" aria-checked={isPercent} style={pillBtn(isPercent)} onClick={() => switchMode('percent')}>Percentage</button>
        <button role="radio" aria-checked={!isPercent} style={pillBtn(!isPercent)} onClick={() => switchMode('fixed')}>Amount</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 140px', minWidth: 120 }}>
          {isPercent ? (
            <NumberInput ariaLabel={`${deduction.name || 'Deduction'} percentage`} value={deduction.value} onChange={(v) => onChange('value', v)} placeholder="0" suffix="%" />
          ) : (
            <NumberInput ariaLabel={`${deduction.name || 'Deduction'} amount`} value={deduction.value} onChange={(v) => onChange('value', v)} placeholder="0.00" prefix={currency} />
          )}
        </div>
        {hasValue && numValue > 0 && !overHundred && (
          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
            {isPercent
              ? <>≈ {formatCurrencyCompact(equivalents.amountPerPeriod, currency)} / {freqLabel.toLowerCase()}</>
              : <>≈ {equivalents.percent.toFixed(2)}% of {deduction.beforeTax ? 'gross' : 'taxable'} income</>}
          </div>
        )}
      </div>

      {overHundred && (
        <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, padding: '10px 12px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
          <span aria-hidden="true" style={{ fontSize: '0.95rem', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', color: '#92400E' }}>
              This value is above 100. Did you mean {currency}{deduction.value} instead of {deduction.value}%?
            </div>
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
