'use client';

import { useState } from 'react';
import { analyzePassword, starString } from './calculations';

const STRENGTH_COLOR = {
  Weak: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626' },
  Fair: { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' },
  Strong: { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669' },
  'Very Strong': { bg: '#EFF6FF', border: '#BFDBFE', text: '#2563EB' },
};

export default function ResultCard({ value, rememberability, onRegenerate, visible, onToggleVisible, wordEntropyBits }) {
  const [copied, setCopied] = useState(false);
  const analysis = analyzePassword(value, { wordEntropyBits });
  const colors = STRENGTH_COLOR[analysis.strengthLabel] || STRENGTH_COLOR.Weak;

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 1px 2px rgba(15,23,42,.03)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            flex: 1, minWidth: 0, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '1rem',
            fontWeight: 600, color: '#0F172A', padding: '9px 12px', background: '#F8FAFC', borderRadius: 8,
            border: '1px solid #E2E8F0', overflowX: 'auto', whiteSpace: 'nowrap', letterSpacing: visible ? 0.3 : 2,
          }}
        >
          {visible ? value : '•'.repeat(Math.min(value.length, 28))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={copy} style={btnStyle(copied ? 'success' : 'primary')}>{copied ? '✓ Copied' : 'Copy'}</button>
        <button onClick={onToggleVisible} style={btnStyle('neutral')}>{visible ? 'Hide' : 'Show'}</button>
        {onRegenerate && <button onClick={onRegenerate} style={btnStyle('neutral')}>Regenerate Similar</button>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
          {analysis.strengthLabel}
        </span>
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Length: <strong style={{ color: '#0F172A' }}>{analysis.length}</strong></span>
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Entropy: <strong style={{ color: '#0F172A' }}>{analysis.entropyBits} bits</strong></span>
        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Crack time: <strong style={{ color: '#0F172A' }}>{analysis.crackTimeLabel}</strong></span>
        {typeof rememberability === 'number' && (
          <span style={{ fontSize: '0.75rem', color: '#F59E0B', letterSpacing: 1 }} title={`Rememberability: ${rememberability}/5`}>
            {starString(rememberability)}
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[['Upper', analysis.upperCount], ['Lower', analysis.lowerCount], ['Numbers', analysis.numberCount], ['Symbols', analysis.symbolCount]].map(([label, val]) => (
          <div key={label} style={{ textAlign: 'center', padding: '6px 4px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #F1F5F9' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A' }}>{val}</div>
            <div style={{ fontSize: '0.62rem', color: '#94A3B8', marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function btnStyle(variant) {
  const map = {
    primary: { background: '#2563EB', color: '#fff', border: '1px solid #2563EB' },
    success: { background: '#DCFCE7', color: '#059669', border: '1px solid #A7F3D0' },
    neutral: { background: '#F8FAFC', color: '#334155', border: '1px solid #E2E8F0' },
  };
  return {
    padding: '7px 14px', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'inherit', ...map[variant],
  };
}
