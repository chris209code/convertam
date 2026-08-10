'use client';

// Text object type — renders plain or bulleted text. Same {createDefaults,
// Content} shape as pdf-layout-studio's objectTypes registry. Font size on
// these objects is in POINTS (pt), not inches — geometry (x/y/w/h) is
// inches, converted to px by the caller before rendering; ptToPx handles
// the separate points->px conversion.
function ptToPx(v) { return v * (96 / 72); }

export function createDefaults({ color = '1F2937', fontFace = 'Calibri' } = {}) {
  return { text: 'New text', fontSize: 16, bold: false, italic: false, color, align: 'left', fontFace, bulleted: false, lines: [] };
}

export function Content({ obj, isEditing, onCommitText }) {
  const style = {
    width: '100%', height: '100%', fontFamily: obj.fontFace, fontSize: ptToPx(obj.fontSize),
    fontWeight: obj.bold ? 700 : 400, fontStyle: obj.italic ? 'italic' : 'normal', color: `#${obj.color}`,
    textAlign: obj.align || 'left', overflow: 'hidden',
  };

  if (isEditing) {
    const value = obj.bulleted ? (obj.lines || []).join('\n') : (obj.text || '');
    return (
      <textarea
        autoFocus
        defaultValue={value}
        onBlur={(e) => {
          const raw = e.target.value;
          onCommitText(obj.bulleted ? raw.split('\n').filter((l) => l.trim()) : raw, obj.bulleted ? 'lines' : 'text');
        }}
        style={{ ...style, border: '1px dashed #2563EB', resize: 'none', outline: 'none', background: 'rgba(255,255,255,0.9)', padding: 0 }}
      />
    );
  }

  const boxStyle = { ...style, display: 'flex', flexDirection: 'column', justifyContent: obj.align === 'center' && !obj.bulleted ? 'center' : 'flex-start' };
  if (obj.bulleted) {
    return (
      <ul style={{ ...boxStyle, margin: 0, paddingLeft: 18, listStyle: 'disc' }}>
        {(obj.lines || []).map((line, i) => <li key={i} style={{ marginBottom: 4 }}>{line}</li>)}
      </ul>
    );
  }
  return <div style={boxStyle}>{obj.text}</div>;
}
