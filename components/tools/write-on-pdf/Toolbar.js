'use client';

// Quick Insert toolbar — deliberately not styled as a full ribbon like
// Annotate PDF's Toolbar; the brief is explicit that this tool should stay
// lightweight by comparison. Text/Checkbox/Highlight are persistent tools
// (stay active across multiple placements, like a pen); Date/Signature/
// Initials/Image are one-shot inserts that place immediately and return to
// Select, mirroring Annotate PDF's own insertDate()/insertSignature().
const DATE_FORMATS = [
  { id: 'long', label: 'Jan 1, 2026', format: (d) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) },
  { id: 'short', label: '01/01/2026', format: (d) => d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' }) },
  { id: 'iso', label: '2026-01-01', format: (d) => d.toISOString().slice(0, 10) },
];

export { DATE_FORMATS };

function toolBtn(active) {
  return {
    padding: '7px 14px', borderRadius: 8, border: '1px solid', borderColor: active ? '#2563EB' : '#E2E8F0',
    background: active ? '#EFF6FF' : 'white', color: active ? '#1D4ED8' : '#334155',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 6,
  };
}

function iconBtn(disabled) {
  return {
    padding: '7px 11px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white',
    color: disabled ? '#CBD5E1' : '#334155', cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600,
  };
}

export default function Toolbar({
  activeTool, onToolChange,
  canUndo, canRedo, onUndo, onRedo,
  hasSelection, onDeleteSelected, onDuplicateSelected,
  dateFormatId, onDateFormatChange, onInsertDate,
  onToggleSignaturePad, showSignaturePad,
  onChooseImage,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, padding: '8px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
      <button style={toolBtn(activeTool === 'select')} onClick={() => onToolChange('select')}>
        <span aria-hidden="true">🖱️</span> Select
      </button>
      <button style={toolBtn(activeTool === 'text')} onClick={() => onToolChange('text')}>
        <span aria-hidden="true">🅰️</span> Text
      </button>
      <button style={toolBtn(activeTool === 'checkbox')} onClick={() => onToolChange('checkbox')}>
        <span aria-hidden="true">☑️</span> Checkbox
      </button>
      <button style={toolBtn(activeTool === 'highlight')} onClick={() => onToolChange('highlight')} title="Drag to draw a highlight">
        <span aria-hidden="true">🖍️</span> Highlight
      </button>

      <span style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 2px' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button style={iconBtn(false)} onClick={onInsertDate} title="Insert today's date">
          <span aria-hidden="true">📅</span> Date
        </button>
        <select
          value={dateFormatId}
          onChange={(e) => onDateFormatChange(e.target.value)}
          title="Date format"
          style={{ padding: '6px 6px', borderRadius: 7, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '0.72rem', color: '#64748B', background: 'white' }}
        >
          {DATE_FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      <button style={toolBtn(showSignaturePad)} onClick={onToggleSignaturePad}>
        <span aria-hidden="true">✍️</span> Signature
      </button>

      <label style={{ ...iconBtn(false), display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
        <span aria-hidden="true">🖼️</span> Image
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onChooseImage} />
      </label>

      <span style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 2px' }} />

      <button style={iconBtn(!hasSelection)} disabled={!hasSelection} onClick={onDuplicateSelected} title="Duplicate (Ctrl+D)">⧉</button>
      <button style={iconBtn(!hasSelection)} disabled={!hasSelection} onClick={onDeleteSelected} title="Delete (Del)">🗑️</button>

      <span style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 2px' }} />

      <button style={iconBtn(!canUndo)} disabled={!canUndo} onClick={onUndo} title="Undo (Ctrl+Z)">↶</button>
      <button style={iconBtn(!canRedo)} disabled={!canRedo} onClick={onRedo} title="Redo (Ctrl+Y)">↷</button>
    </div>
  );
}
