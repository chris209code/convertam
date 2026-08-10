'use client';

import { useState } from 'react';

const SEVERITY_COLOR = { error: '#DC2626', warning: '#B45309' };

// Local (non-AI) quality checklist. Findings are computed by
// lib/presentation/qualityCheck.js#runQualityChecks — pure geometry/text
// math, recomputed live as the user edits. "Fix Automatically" only
// touches findings marked autoFixable there; everything else is reported
// so the user can address it deliberately.
export default function QualityPanel({ findings, onFixAll }) {
  const [open, setOpen] = useState(false);
  if (!findings.length) {
    return (
      <div style={{ marginTop: 12, padding: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: '0.78rem', color: '#166534' }}>
        ✓ No quality issues found on this deck.
      </div>
    );
  }
  const autoFixCount = findings.filter((f) => f.autoFixable).length;
  return (
    <div style={{ marginTop: 12, border: '1px solid #FDE68A', borderRadius: 8, background: '#FFFBEB' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, color: '#92400E', display: 'flex', justifyContent: 'space-between' }}
      >
        <span>⚠ {findings.length} quality {findings.length === 1 ? 'issue' : 'issues'} found</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 12px 12px' }}>
          <ul style={{ margin: 0, paddingLeft: 18, marginBottom: 10 }}>
            {findings.map((f) => (
              <li key={f.id} style={{ fontSize: '0.76rem', color: SEVERITY_COLOR[f.severity] || '#475569', marginBottom: 4 }}>
                {f.message} {f.autoFixable ? '' : '(needs a manual fix)'}
              </li>
            ))}
          </ul>
          {autoFixCount > 0 && (
            <button
              onClick={onFixAll}
              style={{ fontSize: '0.76rem', fontWeight: 700, color: '#7C3AED', background: '#EDE9FE', border: '1px solid #DDD6FE', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}
            >
              Fix Automatically ({autoFixCount} local {autoFixCount === 1 ? 'fix' : 'fixes'})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
