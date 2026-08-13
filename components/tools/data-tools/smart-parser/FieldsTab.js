'use client';
import { T, confidenceColor } from './theme';
import { fieldsToCSV, downloadBlob } from '@/lib/smartParser/exporters';

export default function FieldsTab({ fields, onEditValue }) {
  if (!fields.length) {
    return <div style={{ fontFamily: T.font, textAlign: 'center', padding: '40px 20px', color: T.muted, fontSize: '0.85rem' }}>No fields were detected. Try Custom Schema mode to specify exactly what you're looking for, or Analyze with AI.</div>;
  }

  function handleDownloadCSV() {
    downloadBlob(fieldsToCSV(fields), 'text/csv', 'smart-parser-fields.csv');
  }

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={handleDownloadCSV} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font, color: T.inkSecondary }}>Download CSV</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {fields.map((f, i) => {
          const colors = confidenceColor(f.confidence);
          return (
            <div key={i} style={{ padding: 14, borderRadius: 12, background: 'white', border: `1px solid ${T.borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: T.mutedDark, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{f.label ?? f.field}</span>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}` }}>{f.confidence}</span>
              </div>
              <input
                value={f.value ?? ''}
                placeholder="Not found"
                onChange={(e) => onEditValue(i, e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${T.border}`, fontSize: '0.86rem', fontWeight: 600, color: T.ink, fontFamily: T.font }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
