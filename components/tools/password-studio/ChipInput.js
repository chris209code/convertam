'use client';

import { useState } from 'react';

// Small reusable "chips" input — used for Smart Word Builder's Words and
// Number combinations lists. Enter or the Add button commits the current
// text as a new chip; each chip has its own remove (×) button.
export default function ChipInput({ chips, onChange, placeholder, addLabel, inputMode }) {
  const [value, setValue] = useState('');

  function commit() {
    const v = value.trim();
    if (!v) return;
    if (chips.includes(v)) { setValue(''); return; }
    onChange([...chips, v]);
    setValue('');
  }

  function remove(chip) {
    onChange(chips.filter((c) => c !== chip));
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: chips.length > 0 ? 10 : 0 }}>
        <input
          value={value}
          inputMode={inputMode}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          placeholder={placeholder}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #E2E8F0',
            fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button
          type="button" onClick={commit}
          style={{
            padding: '9px 14px', borderRadius: 8, border: '1px solid #BFDBFE', background: '#EFF6FF',
            color: '#2563EB', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}
        >
          {addLabel}
        </button>
      </div>
      {chips.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {chips.map((chip) => (
            <span
              key={chip}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 6px 5px 12px',
                borderRadius: 999, background: '#F1F5F9', border: '1px solid #E2E8F0',
                fontSize: '0.8rem', color: '#334155', fontWeight: 600,
              }}
            >
              {chip}
              <button
                type="button" onClick={() => remove(chip)} aria-label={`Remove ${chip}`}
                style={{
                  width: 18, height: 18, borderRadius: '50%', border: 'none', background: '#E2E8F0',
                  color: '#64748B', cursor: 'pointer', fontSize: '0.7rem', lineHeight: '18px', padding: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
