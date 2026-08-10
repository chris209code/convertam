'use client';

// Editable speaker notes for the current slide. Notes live on slidesMeta,
// never as a canvas object — they must never render on the visible slide.
export default function NotesPanel({ notes, onChange }) {
  return (
    <div style={{ marginTop: 12 }}>
      <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Speaker notes (not shown on slide)</label>
      <textarea
        value={notes || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add notes for the presenter…"
        style={{ width: '100%', minHeight: 70, padding: '8px 10px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.8rem', fontFamily: 'inherit', resize: 'vertical' }}
      />
    </div>
  );
}
