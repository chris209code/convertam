'use client';

// Vector shapes — rectangle, ellipse, line. Rendered with plain CSS (no
// canvas, no SVG) so the DOM preview and the real pdf-lib export
// (drawRectangle/drawEllipse/drawLine in PdfLayoutStudioWorkspace.js) stay
// simple and exactly proportional to the object's own w/h — no separate
// coordinate system to keep in sync.
export const interaction = 'select';

export function createDefaults({ shapeKind = 'rectangle', color = '#111827' } = {}) {
  return {
    shapeKind, color, fillColor: null, borderWidth: 2,
    w: shapeKind === 'line' ? 160 : 140,
    h: shapeKind === 'line' ? 4 : 100,
  };
}

export function Content({ obj }) {
  const { shapeKind, color, fillColor, borderWidth, opacity } = obj;
  const opacityStyle = { opacity: opacity ?? 1, cursor: 'move' };

  if (shapeKind === 'line') {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', ...opacityStyle }}>
        <div style={{ width: '100%', height: Math.max(1, borderWidth), background: color }} />
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%', height: '100%', boxSizing: 'border-box',
        background: fillColor || 'transparent',
        border: `${borderWidth}px solid ${color}`,
        borderRadius: shapeKind === 'ellipse' ? '50%' : 0,
        ...opacityStyle,
      }}
    />
  );
}
