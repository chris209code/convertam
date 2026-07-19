'use client';

// A controlled numeric text input that shows thousands-separator commas
// live while typing, without losing cursor position — plain <input
// type="number"> can't show commas at all, and naively reformatting on
// every keystroke normally kicks the caret to the end of the field the
// moment a comma is inserted or removed. This counts digits (not
// characters) before the caret in the old value, then places the caret
// after that same number of digits in the newly-formatted value, which
// stays correct regardless of how many commas shift around.
//
// The value passed to onChange is always the plain numeric string (e.g.
// "500000"), never the comma-formatted display — every calculation in
// this tool keeps working against that same plain value it always has.

import { useRef } from 'react';

function formatWithCommas(raw) {
  if (raw === '' || raw == null) return '';
  const [intPart, decPart] = String(raw).split('.');
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}

function stripToNumeric(display) {
  let cleaned = display.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot !== -1) {
    cleaned = cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
  }
  return cleaned;
}

// Commas are purely a display artifact (they can appear/disappear as
// digits shift) so they're deliberately excluded from position-tracking.
// The decimal point, though, is NOT excluded — it's a real character in
// the underlying value, and counting only digits caused the point itself
// to be "invisible" to the caret math: typing "7", ".", "5" would restore
// the caret to right after the "7" (the last counted digit) instead of
// after the "." that was just typed, so the "5" landed between them and
// produced "75." instead of "7.5". Counting digits-or-the-decimal-point
// keeps the point's own position tracked correctly.
function countSignificant(str) {
  return (str.match(/[\d.]/g) || []).length;
}

// Finds the character index in `formatted` right after the Nth
// digit-or-decimal-point.
function caretIndexForSignificantCount(formatted, count) {
  if (count <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i++) {
    if (/[\d.]/.test(formatted[i])) {
      seen++;
      if (seen === count) return i + 1;
    }
  }
  return formatted.length;
}

export default function NumberInput({ value, onChange, prefix, suffix, placeholder, style, ariaLabel, id, disabled }) {
  const ref = useRef(null);

  function handleChange(e) {
    const el = e.target;
    const prevDisplay = el.value;
    const caret = el.selectionStart ?? prevDisplay.length;
    const significantBeforeCaret = countSignificant(prevDisplay.slice(0, caret));

    const numericValue = stripToNumeric(prevDisplay);
    onChange(numericValue);

    const newFormatted = formatWithCommas(numericValue);
    const newCaret = caretIndexForSignificantCount(newFormatted, significantBeforeCaret);
    // Restoring selection happens after this render commits the new
    // (formatted) value into the DOM — a plain synchronous set here would
    // be overwritten by React's own re-render.
    requestAnimationFrame(() => {
      if (ref.current) ref.current.setSelectionRange(newCaret, newCaret);
    });
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      {prefix && (
        <span aria-hidden="true" style={{ position: 'absolute', left: 12, fontSize: '0.85rem', color: '#94A3B8', pointerEvents: 'none' }}>{prefix}</span>
      )}
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="decimal"
        aria-label={ariaLabel}
        disabled={disabled}
        value={formatWithCommas(value)}
        onChange={handleChange}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 12px',
          paddingLeft: prefix ? 28 : 12, paddingRight: suffix ? 32 : 12,
          borderRadius: 10, border: '1px solid #E2E8F0', fontSize: '0.9rem',
          fontFamily: 'inherit', outline: 'none', background: disabled ? '#F1F5F9' : '#fff',
          color: disabled ? '#94A3B8' : '#0F172A',
          ...style,
        }}
      />
      {suffix && (
        <span aria-hidden="true" style={{ position: 'absolute', right: 12, fontSize: '0.85rem', color: '#94A3B8', pointerEvents: 'none' }}>{suffix}</span>
      )}
    </div>
  );
}

export { formatWithCommas };
