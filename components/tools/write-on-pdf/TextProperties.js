'use client';

import { RENDER_SCALE } from './constants';

// Manual override panel for the selected text object — shown as soon as a
// text object is selected (including immediately after placing one, since
// Stage.js selects+opens it for editing in the same action). Auto font
// matching (styleMatchPreview.js) gets it right often but not always —
// this is what lets a user fix a wrong guess themselves rather than being
// stuck with it, which is the whole point: it's an estimate, not a
// guarantee, and the UI needs a way out when it's wrong.
const FAMILIES = [
  { id: 'sans', label: 'Sans (Helvetica)' },
  { id: 'serif', label: 'Serif (Times)' },
  { id: 'mono', label: 'Mono (Courier)' },
];

function toggleBtn(active) {
  return {
    padding: '6px 11px', borderRadius: 7, border: '1px solid', borderColor: active ? '#2563EB' : '#E2E8F0',
    background: active ? '#EFF6FF' : 'white', color: active ? '#1D4ED8' : '#334155',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: 700, lineHeight: 1,
  };
}

export default function TextProperties({ obj, onChange }) {
  if (!obj) return null;

  // obj.fontSize is stored in page-space px (RENDER_SCALE-multiplied, the
  // unit every object's own geometry uses) — displayed and edited here in
  // real PDF points so the number means what it says, same reasoning as
  // the style-match chip's own pt display (styleMatchPreview.js).
  const pt = Math.round((obj.fontSize / RENDER_SCALE) * 10) / 10;
  function setPt(nextPt) {
    const clamped = Math.min(96, Math.max(6, nextPt));
    const fontSize = Math.round(clamped * RENDER_SCALE);
    // Same box-height heuristic Stage.js uses when placing styled text, so
    // growing the size here doesn't clip against a box sized for the old,
    // smaller font.
    const h = Math.max(18, Math.round(fontSize * 1.4));
    onChange({ fontSize, h });
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12, padding: '8px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Text</span>

      <select
        value={obj.fontFamily || 'sans'}
        onChange={(e) => onChange({ fontFamily: e.target.value })}
        title="Font"
        style={{ padding: '6px 8px', borderRadius: 7, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '0.78rem', background: 'white', color: '#334155' }}
      >
        {FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>

      <button style={toggleBtn(obj.bold)} onClick={() => onChange({ bold: !obj.bold })} title="Bold"><b>B</b></button>
      <button style={toggleBtn(obj.italic)} onClick={() => onChange({ italic: !obj.italic })} title="Italic"><i>I</i></button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button style={toggleBtn(false)} onClick={() => setPt(pt - 1)} title="Smaller">−</button>
        <span style={{ fontSize: '0.78rem', color: '#334155', minWidth: 38, textAlign: 'center' }}>{pt}pt</span>
        <button style={toggleBtn(false)} onClick={() => setPt(pt + 1)} title="Larger">+</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button style={toggleBtn(!obj.align || obj.align === 'left')} onClick={() => onChange({ align: 'left' })} title="Align left">L</button>
        <button style={toggleBtn(obj.align === 'center')} onClick={() => onChange({ align: 'center' })} title="Align center">C</button>
        <button style={toggleBtn(obj.align === 'right')} onClick={() => onChange({ align: 'right' })} title="Align right">R</button>
      </div>
    </div>
  );
}
