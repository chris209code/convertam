'use client';

export function createDefaults({ fill = '2563EB', shapeType = 'rect' } = {}) {
  return { shapeType, fill, outline: null, background: false };
}

export function Content({ obj }) {
  const style = {
    width: '100%', height: '100%', background: `#${obj.fill}`,
    borderRadius: obj.shapeType === 'circle' ? '50%' : 0,
    border: obj.outline ? `1px solid #${obj.outline}` : 'none',
  };
  return <div style={style} />;
}
