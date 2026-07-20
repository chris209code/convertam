'use client';

import { ArrowRight, Check } from 'lucide-react';

// Shown before any document-type switch or "Convert to..." action commits —
// lists in plain English what will be generated fresh, hidden, or need
// re-entering, per the navigation requirement that switching types must
// never happen silently.
export default function ConversionConfirmModal({ fromLabel, toLabel, changes, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 700, fontSize: 17, color: '#0F172A' }}>
          {fromLabel} <ArrowRight size={16} color="#8891A0" /> {toLabel}
        </div>
        <div style={{ fontSize: 12.5, color: '#8891A0', marginTop: 6, marginBottom: 16, lineHeight: 1.5 }}>
          Company details, client details, item descriptions, branding, and letterhead carry over. Here's what changes:
        </div>
        <div style={{ background: '#F7F8FA', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
          {changes.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: i === 0 ? 0 : 8 }}>
              <Check size={14} color="#2563EB" style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.5 }}>{c}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button" onClick={onCancel}
            style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #E2E6ED', background: '#fff', color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button" onClick={onConfirm}
            style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          >
            Convert to {toLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
