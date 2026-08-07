'use client';

import { DATE_FORMATS } from './constants';

function btn(disabled) {
  return {
    padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white',
    color: disabled ? '#CBD5E1' : '#334155', cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 600,
  };
}

// Top bar of the center panel: undo/redo history controls, the
// selection-scoped duplicate/delete actions, and the date-format picker
// (governs what the Date element in ElementsPanel inserts — a small,
// standing preference rather than a per-object property, matching Write on
// PDF's own date-format selector). Per-element insert itself lives in
// ElementsPanel (left sidebar), not here — this bar is about acting on
// what's already on the page (or, for date format, how the next insert
// will look), not the insert buttons themselves.
export default function Toolbar({ canUndo, canRedo, onUndo, onRedo, hasSelection, onDuplicateSelected, onDeleteSelected, dateFormatId, onDateFormatChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
      <button onClick={onUndo} disabled={!canUndo} style={btn(!canUndo)}>↶ Undo</button>
      <button onClick={onRedo} disabled={!canRedo} style={btn(!canRedo)}>↷ Redo</button>
      <span style={{ width: 1, height: 20, background: '#E2E8F0' }} />
      <button onClick={onDuplicateSelected} disabled={!hasSelection} style={btn(!hasSelection)}>⧉ Duplicate</button>
      <button onClick={onDeleteSelected} disabled={!hasSelection} style={btn(!hasSelection)}>🗑 Delete</button>
      <span style={{ width: 1, height: 20, background: '#E2E8F0' }} />
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: '#64748B' }}>
        Date format
        <select value={dateFormatId} onChange={(e) => onDateFormatChange(e.target.value)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '0.76rem' }}>
          {DATE_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </label>
    </div>
  );
}
