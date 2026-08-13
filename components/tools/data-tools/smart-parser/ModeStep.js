'use client';
import { useState } from 'react';
import { T } from './theme';

export const MODES = [
  { id: 'text', icon: '📝', label: 'Extract Text', desc: 'Extract clean, readable text from the document.' },
  { id: 'tables', icon: '📊', label: 'Extract Tables', desc: 'Detect tables and convert them into structured rows and columns.' },
  { id: 'data', icon: '🔎', label: 'Extract Data', desc: 'Pull out names, dates, amounts, emails, addresses and other useful fields.' },
  { id: 'parse', icon: '🧩', label: 'Parse Document', desc: 'Automatically identify structure and return the most useful representation.' },
  { id: 'custom', icon: '🎯', label: 'Custom Schema', desc: 'Tell Smart Parser exactly which fields you want extracted.' },
];

const SUGGESTED_SCHEMAS = {
  Invoice: ['Customer Name', 'Invoice Number', 'Invoice Date', 'Total Amount', 'VAT', 'Payment Status'],
  Receipt: ['Vendor', 'Date', 'Items', 'Total', 'Payment Method'],
  'Bank Statement': ['Account Number', 'Statement Period', 'Opening Balance', 'Closing Balance'],
};

export default function ModeStep({ file, mode, setMode, schemaFields, setSchemaFields, onContinue, onBack }) {
  const [fieldDraft, setFieldDraft] = useState('');

  function addField(value) {
    const v = value.trim();
    if (!v || schemaFields.includes(v)) return;
    setSchemaFields([...schemaFields, v]);
    setFieldDraft('');
  }
  function removeField(v) {
    setSchemaFields(schemaFields.filter((f) => f !== v));
  }

  const canContinue = mode !== 'custom' || schemaFields.length > 0;

  return (
    <div style={{ fontFamily: T.font, maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: '1.3rem' }}>📄</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: T.ink }}>{file?.name}</div>
          <div style={{ fontSize: '0.72rem', color: T.muted }}>{(file?.size / 1024).toFixed(0)} KB</div>
        </div>
        <button onClick={onBack} style={{ marginLeft: 'auto', fontSize: '0.78rem', color: T.accentDark, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline', fontFamily: T.font }}>Change file</button>
      </div>

      <div style={{ fontWeight: 800, fontSize: '1rem', color: T.ink, marginBottom: 14 }}>What do you want to do with it?</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              textAlign: 'left', padding: 16, borderRadius: 14, cursor: 'pointer', fontFamily: T.font,
              border: mode === m.id ? `2px solid ${T.accent}` : `1px solid ${T.border}`,
              background: mode === m.id ? T.accentTint : 'white',
            }}
          >
            <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>{m.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: T.ink, marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: '0.75rem', color: T.mutedDark, lineHeight: 1.4 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {mode === 'custom' && (
        <div style={{ padding: 18, borderRadius: 14, background: T.accentTint, border: `1px solid ${T.accentBorder}`, marginBottom: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: T.ink, marginBottom: 10 }}>Which fields do you want extracted?</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={fieldDraft}
              onChange={(e) => setFieldDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField(fieldDraft); } }}
              placeholder="e.g. Invoice Number"
              style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: '0.85rem', fontFamily: T.font }}
            />
            <button onClick={() => addField(fieldDraft)} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: T.accent, color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: T.font }}>Add</button>
          </div>

          {schemaFields.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {schemaFields.map((f) => (
                <span key={f} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: 'white', border: `1px solid ${T.accentBorder}`, fontSize: '0.78rem', fontWeight: 600, color: T.accentDark }}>
                  {f}
                  <button onClick={() => removeField(f)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.mutedDark, fontSize: '0.9rem', lineHeight: 1, padding: 0 }} aria-label={`Remove ${f}`}>×</button>
                </span>
              ))}
            </div>
          )}

          <div style={{ fontSize: '0.72rem', color: T.mutedDark, marginBottom: 6 }}>Quick start:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(SUGGESTED_SCHEMAS).map(([label, fields]) => (
              <button
                key={label}
                onClick={() => setSchemaFields(Array.from(new Set([...schemaFields, ...fields])))}
                style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 600, color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font }}
              >
                {label} fields
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onContinue}
        disabled={!canContinue}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', fontWeight: 700, fontSize: '0.92rem', fontFamily: T.font,
          background: canContinue ? T.accentGradient : '#E2E8F0', color: canContinue ? 'white' : T.muted, cursor: canContinue ? 'pointer' : 'default',
        }}
      >
        Parse Document →
      </button>
    </div>
  );
}
