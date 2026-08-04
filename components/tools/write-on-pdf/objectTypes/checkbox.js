'use client';

// A free-placed checkbox — vector on screen (CSS box + checkmark) and vector
// at export (pdf-lib drawRectangle + drawLine, never a rasterized PNG), so
// output stays sharp at any zoom level. Distinct from a real AcroForm
// checkbox field (see formFields.js): this is tier-3 free placement for
// documents that don't have one at that spot. Movable/resizable like any
// other object; toggled by double-click (see Stage.js) rather than a normal
// single click, since TransformableBox already uses a plain click for
// select/move.
export const interaction = 'toggle';

export function createDefaults({ color = '#111827' } = {}) {
  return { checked: false, color, w: 22, h: 22, opacity: 1 };
}

export function Content({ obj }) {
  return (
    <div
      style={{
        width: '100%', height: '100%', boxSizing: 'border-box', cursor: 'move',
        border: `2px solid ${obj.color}`, borderRadius: 3, background: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: obj.opacity ?? 1,
      }}
    >
      {obj.checked && (
        <svg viewBox="0 0 24 24" style={{ width: '76%', height: '76%' }} aria-hidden="true">
          <path d="M4 12.5 L9.5 18 L20 5" fill="none" stroke={obj.color} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
