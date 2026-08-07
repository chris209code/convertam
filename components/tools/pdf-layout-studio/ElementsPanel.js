'use client';

import { useRef } from 'react';
import { STAMP_PRESETS } from './constants';

// Left sidebar: the palette of things a user can add to the page. Clicking
// an element inserts it centered on the current page, already selected —
// the user then drags it into position on the canvas, rather than picking a
// "tool" and clicking somewhere on the page first (Write on PDF's model).
// This is the more Canva-like interaction the redesign asks for: adding an
// element is a single click, positioning is always a direct canvas drag.
//
// Remaining element types (Barcode) land in a later phase; it'll add one
// entry here without changing this panel's shape.
function sectionLabel(text) {
  return <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '10px 0 4px' }}>{text}</p>;
}

function elBtn() {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '12px 6px', borderRadius: 10, border: '1px solid #E2E8F0', background: 'white',
    cursor: 'pointer', fontFamily: 'inherit', width: '100%',
  };
}

export default function ElementsPanel({
  onAddText, onChooseImage, onChooseLogo, onToggleSignaturePad, onInsertDateTime, onAddShape, onAddPageNumber,
  onChooseLetterhead, onAddWatermark, onAddStamp, onAddFooter, onAddQrCode,
}) {
  const imageInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const letterheadInputRef = useRef(null);

  return (
    <div style={{ width: 148, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {sectionLabel('Elements')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={onAddText} title="Add a text box" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🅣</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Text</span>
        </button>
        <button onClick={() => imageInputRef.current?.click()} title="Upload a photo or graphic" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🖼️</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Image</span>
        </button>
        <button onClick={() => logoInputRef.current?.click()} title="Upload your logo" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🏷️</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Logo</span>
        </button>
        <button onClick={onToggleSignaturePad} title="Draw, upload, or type a signature" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">✍️</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Signature</span>
        </button>
      </div>

      {sectionLabel('Shapes')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <button onClick={() => onAddShape('rectangle')} title="Rectangle" style={elBtn()}>
          <span style={{ fontSize: '1.1rem' }} aria-hidden="true">▭</span>
        </button>
        <button onClick={() => onAddShape('ellipse')} title="Ellipse" style={elBtn()}>
          <span style={{ fontSize: '1.1rem' }} aria-hidden="true">⬭</span>
        </button>
        <button onClick={() => onAddShape('line')} title="Line" style={elBtn()}>
          <span style={{ fontSize: '1.1rem' }} aria-hidden="true">➖</span>
        </button>
      </div>

      {sectionLabel('Document')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <button onClick={onInsertDateTime} title="Insert today's date" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">📅</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Date</span>
        </button>
        <button onClick={onAddPageNumber} title="Add page numbers" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">#️⃣</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Page #</span>
        </button>
        <button onClick={() => letterheadInputRef.current?.click()} title="Upload a letterhead header/footer graphic" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">📰</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Letterhead</span>
        </button>
        <button onClick={onAddFooter} title="Add a footer line, optionally with page numbers" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">📏</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Footer</span>
        </button>
        <button onClick={onAddWatermark} title="Add a diagonal watermark across every page" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">💧</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>Watermark</span>
        </button>
        <button onClick={onAddQrCode} title="Add a scannable QR code" style={elBtn()}>
          <span style={{ fontSize: '1.3rem' }} aria-hidden="true">🔳</span>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#1E293B' }}>QR Code</span>
        </button>
      </div>

      {sectionLabel('Stamps')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {STAMP_PRESETS.map((p) => (
          <button key={p.id} onClick={() => onAddStamp(p.id)} title={`Add a "${p.label}" stamp`} style={{ ...elBtn(), padding: '8px 4px' }}>
            <span style={{ fontSize: '0.62rem', fontWeight: 800, color: p.color, letterSpacing: '0.02em' }}>{p.label}</span>
          </button>
        ))}
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={(e) => { onChooseImage(e); e.target.value = ''; }} />
      <input ref={logoInputRef} type="file" accept="image/*" hidden onChange={(e) => { onChooseLogo(e); e.target.value = ''; }} />
      <input ref={letterheadInputRef} type="file" accept="image/*" hidden onChange={(e) => { onChooseLetterhead(e); e.target.value = ''; }} />
      <p style={{ fontSize: '0.68rem', color: '#94A3B8', marginTop: 4 }}>Barcodes are on the way.</p>
    </div>
  );
}
