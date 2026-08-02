'use client';

// The Numbering tool's options row (shown in Toolbar.js while it's active) —
// shows which number the next click will place and lets the series be
// restarted (e.g. starting a fresh 1, 2, 3... run for a new section of the
// document) without needing to delete/undo already-placed markers.
export default function NumberingTool({ nextNumber, onRestart }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Click the page to place a marker</span>
      <span style={{ padding: '4px 10px', borderRadius: 999, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', fontSize: '0.76rem', fontWeight: 700 }}>
        Next: {nextNumber}
      </span>
      <button
        onClick={onRestart}
        disabled={nextNumber === 1}
        style={{
          padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white',
          color: nextNumber === 1 ? '#CBD5E1' : '#334155', cursor: nextNumber === 1 ? 'default' : 'pointer',
          fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600,
        }}
      >
        ↺ Restart at 1
      </button>
    </div>
  );
}
