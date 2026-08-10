'use client';

import { THEMES } from '@/lib/presentation/themes';

const btnStyle = { fontSize: '0.75rem', fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', color: '#334155' };
const btnDisabled = { ...btnStyle, color: '#CBD5E1', cursor: 'not-allowed' };

export default function Toolbar({ themeKey, onThemeChange, onAddText, onAddShape, onAddImage, onAddChart, onUndo, onRedo, canUndo, canRedo, onDeleteSelected, onDuplicateSelected, hasSelection }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, padding: '8px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
      <button style={btnStyle} onClick={onAddText}>+ Text</button>
      <button style={btnStyle} onClick={onAddShape}>+ Shape</button>
      <button style={btnStyle} onClick={onAddImage}>+ Image</button>
      <button style={btnStyle} onClick={onAddChart}>+ Chart</button>
      <span style={{ width: 1, height: 20, background: '#E2E8F0' }} />
      <button style={hasSelection ? btnStyle : btnDisabled} disabled={!hasSelection} onClick={onDuplicateSelected}>⧉ Duplicate</button>
      <button style={hasSelection ? { ...btnStyle, color: '#DC2626' } : btnDisabled} disabled={!hasSelection} onClick={onDeleteSelected}>✕ Delete</button>
      <span style={{ width: 1, height: 20, background: '#E2E8F0' }} />
      <button style={canUndo ? btnStyle : btnDisabled} disabled={!canUndo} onClick={onUndo}>↶ Undo</button>
      <button style={canRedo ? btnStyle : btnDisabled} disabled={!canRedo} onClick={onRedo}>↷ Redo</button>
      <span style={{ width: 1, height: 20, background: '#E2E8F0' }} />
      <label style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Theme:</label>
      <select value={themeKey} onChange={(e) => onThemeChange(e.target.value)} style={{ ...btnStyle, cursor: 'pointer' }}>
        {Object.values(THEMES).map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>
    </div>
  );
}
