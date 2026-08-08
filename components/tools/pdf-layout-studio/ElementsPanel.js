'use client';

import { useRef } from 'react';
import { STAMP_PRESETS } from './constants';

// Horizontal toolbar of everything a user can add to the page — sits above
// the editor row (not a left sidebar) so the page preview column gets the
// full width instead of splitting it three ways. Clicking an element
// inserts it centered on the current page, already selected — the user
// then drags it into position on the canvas, rather than picking a "tool"
// and clicking somewhere on the page first (Write on PDF's model). This is
// the more Canva-like interaction the redesign asks for: adding an element
// is a single click, positioning is always a direct canvas drag.
//
// Remaining element types (Barcode) land in a later phase; it'll add one
// entry here without changing this bar's shape.
function toolBtn() {
  return {
    display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8,
    border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.78rem', fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap',
  };
}

function iconBtn() {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 8,
    border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem',
  };
}

function divider() {
  return <span style={{ width: 1, alignSelf: 'stretch', background: '#E2E8F0', margin: '2px 2px' }} />;
}

export default function ElementsPanel({
  onAddText, onChooseImage, onChooseLogo, onToggleSignaturePad, onInsertDateTime, onAddShape, onAddPageNumber,
  onChooseLetterhead, onAddWatermark, onAddStamp, onAddFooter, onAddQrCode,
}) {
  const imageInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const letterheadInputRef = useRef(null);

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 12, background: 'white' }}>
        <button onClick={onAddText} title="Add a text box" style={toolBtn()}>
          <span aria-hidden="true">🅣</span> Text
        </button>
        <button onClick={() => imageInputRef.current?.click()} title="Upload a photo or graphic" style={toolBtn()}>
          <span aria-hidden="true">🖼️</span> Image
        </button>
        <button onClick={() => logoInputRef.current?.click()} title="Upload your logo" style={toolBtn()}>
          <span aria-hidden="true">🏷️</span> Logo
        </button>
        <button onClick={onToggleSignaturePad} title="Draw, upload, or type a signature" style={toolBtn()}>
          <span aria-hidden="true">✍️</span> Signature
        </button>

        {divider()}

        <button onClick={() => onAddShape('rectangle')} title="Rectangle" style={iconBtn()}>▭</button>
        <button onClick={() => onAddShape('ellipse')} title="Ellipse" style={iconBtn()}>⬭</button>
        <button onClick={() => onAddShape('line')} title="Line" style={iconBtn()}>➖</button>

        {divider()}

        <button onClick={onInsertDateTime} title="Insert today's date" style={toolBtn()}>
          <span aria-hidden="true">📅</span> Date
        </button>
        <button onClick={onAddPageNumber} title="Add page numbers" style={toolBtn()}>
          <span aria-hidden="true">#️⃣</span> Page #
        </button>
        <button onClick={() => letterheadInputRef.current?.click()} title="Upload a letterhead header graphic" style={toolBtn()}>
          <span aria-hidden="true">📰</span> Letterhead
        </button>
        <button onClick={onAddFooter} title="Add a footer line, optionally with page numbers" style={toolBtn()}>
          <span aria-hidden="true">📏</span> Footer
        </button>
        <button onClick={onAddWatermark} title="Add a diagonal watermark across every page" style={toolBtn()}>
          <span aria-hidden="true">💧</span> Watermark
        </button>
        <button onClick={onAddQrCode} title="Add a scannable QR code" style={toolBtn()}>
          <span aria-hidden="true">🔳</span> QR Code
        </button>

        {divider()}

        {STAMP_PRESETS.map((p) => (
          <button key={p.id} onClick={() => onAddStamp(p.id)} title={`Add a "${p.label}" stamp`} style={{ ...toolBtn(), color: p.color, fontWeight: 800 }}>
            {p.label}
          </button>
        ))}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(e) => { onChooseImage(e); e.target.value = ''; }} />
      <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={(e) => { onChooseLogo(e); e.target.value = ''; }} />
      <input ref={letterheadInputRef} type="file" accept="image/*" hidden onChange={(e) => { onChooseLetterhead(e); e.target.value = ''; }} />
      <p style={{ fontSize: '0.68rem', color: '#94A3B8', margin: '6px 0 0' }}>Barcodes are on the way.</p>
    </div>
  );
}
