'use client';

import { useRef, useState } from 'react';
import SignatureDraw from '../SignatureDraw';

const KIND_LABELS = {
  logo: 'Logo', companyText: 'Company Name & Tagline', contactInfo: 'Contact Info', bar: 'Accent Bar',
  shape: 'Background Shape', billTo: 'Billed To', meta: 'Invoice Details', table: 'Items Table',
  totals: 'Total Summary', words: 'Total in Words', notes: 'Notes', payment: 'Payment Methods', bank: 'Bank Details',
  approval: 'Approved By', signature: 'Signature', stamp: 'Company Stamp', qr: 'QR Payment',
  footer: 'Footer', letterhead: 'Letterhead', watermark: 'Watermark', terms: 'Terms & Conditions',
};

const EDITABLE_TEXT_KINDS = new Set(['companyText', 'contactInfo', 'billTo', 'meta', 'notes', 'approval', 'footer', 'terms']);

const toggleRow = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 };
const miniLabel = { fontSize: 11, color: '#8891A0', marginBottom: 4 };
const smallBtnGhost = { padding: '7px 14px', borderRadius: 7, border: '1px solid #E2E6ED', background: '#fff', color: '#334155', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const textInput = { width: '100%', height: 34, borderRadius: 7, border: '1px solid #E2E6ED', padding: '0 10px', fontSize: 12.5, color: '#334155' };

function ToggleSwitch({ on, onClick, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} style={{ width: 36, height: 20, borderRadius: 10, padding: 2, cursor: 'pointer', border: 'none', background: on ? '#2563EB' : '#E2E6ED' }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'transform .15s', transform: `translateX(${on ? 16 : 0}px)` }} />
    </button>
  );
}

function TableControls({ el, onToggleTableImages }) {
  return (
    <>
      <div style={toggleRow}>
        <span style={{ fontSize: 12.5, color: '#334155' }}>Show product images</span>
        <ToggleSwitch on={!!el.showImages} onClick={() => onToggleTableImages(el.id)} label="Show product images" />
      </div>
      <div style={{ fontSize: 11.5, color: '#8891A0', lineHeight: 1.6, marginTop: 12 }}>
        Use the <strong>+ Add Line Item</strong> button under the table to add a row. Each row has its own image, reorder, and remove controls.
      </div>
    </>
  );
}

function StampControls({ el, onImageUpload, onImageRemove, onStampOpacityChange, onCommitStampOpacity }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onImageUpload(el.id, file);
    setError(err || '');
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button type="button" onClick={() => inputRef.current?.click()} style={smallBtnGhost}>{el.src ? 'Change Stamp' : 'Upload Stamp'}</button>
        {el.src && <button type="button" onClick={() => onImageRemove(el.id)} style={smallBtnGhost}>Remove</button>}
      </div>
      {error && <div style={{ color: '#DC2626', fontSize: 11.5, marginBottom: 10 }}>{error}</div>}
      <div style={miniLabel}>Opacity</div>
      <input
        type="range" min="10" max="100" value={el.opacity ?? 100}
        onChange={(e) => onStampOpacityChange(el.id, Number(e.target.value))}
        onMouseUp={onCommitStampOpacity}
        onTouchEnd={onCommitStampOpacity}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function SignatureControls({ el, onSignatureUpload, onSignatureDrawSave, onSignatureTypedSave }) {
  const initialTab = el.mode === 'typed' || !el.mode ? 'type' : 'upload';
  const [tab, setTab] = useState(initialTab);
  const [text, setText] = useState(el.text || '');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onSignatureUpload(el.id, file);
    setError(err || '');
  }

  const tabBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      style={{
        flex: 1, padding: '6px 0', borderRadius: 7, border: tab === id ? '1px solid #2563EB' : '1px solid #E2E6ED',
        background: tab === id ? '#EFF6FF' : '#fff', color: tab === id ? '#2563EB' : '#334155', fontSize: 12, fontWeight: 600, cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {tabBtn('upload', 'Upload')}
        {tabBtn('draw', 'Draw')}
        {tabBtn('type', 'Type')}
      </div>

      {tab === 'upload' && (
        <div>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
          <button type="button" onClick={() => inputRef.current?.click()} style={smallBtnGhost}>Upload Signature Image</button>
          {error && <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 8 }}>{error}</div>}
        </div>
      )}

      {tab === 'draw' && <SignatureDraw onSave={(dataUrl) => onSignatureDrawSave(el.id, dataUrl)} />}

      {tab === 'type' && (
        <div>
          <input type="text" value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onSignatureTypedSave(el.id, text)} style={textInput} placeholder="Type a name" />
          {text && <div style={{ fontFamily: "'Caveat',cursive", fontSize: 26, marginTop: 10, color: '#0F172A' }}>{text}</div>}
        </div>
      )}
    </div>
  );
}

function QrControls({ el, onQrValueBlur }) {
  const [value, setValue] = useState(el.value || '');
  const [busy, setBusy] = useState(false);

  async function commit() {
    setBusy(true);
    try {
      await onQrValueBlur(el.id, value);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={miniLabel}>Payment link, bank details, invoice reference, or any text</div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        rows={3}
        style={{ ...textInput, height: 'auto', padding: 10, resize: 'vertical' }}
        placeholder="e.g. https://pay.example.com/invoice/INV-2026-0714"
      />
      <div style={{ fontSize: 11.5, color: '#8891A0', marginTop: 8 }}>{busy ? 'Generating QR code…' : 'The QR code updates automatically when you click away.'}</div>
    </div>
  );
}

export default function ElementPanel({
  selectedElement, onDeselect, onToggleTableImages,
  onImageUpload, onImageRemove, onSignatureUpload, onSignatureDrawSave, onSignatureTypedSave,
  onStampOpacityChange, onCommitStampOpacity, onQrValueBlur,
}) {
  if (!selectedElement) {
    return <div style={{ fontSize: 13, color: '#8891A0', padding: '20px 0', textAlign: 'center' }}>Click an element on the canvas to edit it.</div>;
  }

  const kind = selectedElement.kind;

  return (
    <div>
      <div style={{ fontFamily: 'var(--cs-font-poppins), Poppins, sans-serif', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>
        {KIND_LABELS[kind] || kind}
      </div>

      {EDITABLE_TEXT_KINDS.has(kind) && (
        <div style={{ fontSize: 11.5, color: '#8891A0', lineHeight: 1.6, marginBottom: 16 }}>
          Click directly on the text in the canvas to edit it. Drag to move, or drag a corner handle to resize.
        </div>
      )}

      {kind === 'table' && <TableControls el={selectedElement} onToggleTableImages={onToggleTableImages} />}
      {kind === 'payment' && (
        <div style={{ fontSize: 11.5, color: '#8891A0', lineHeight: 1.6 }}>Click a payment method on the canvas to show or hide it.</div>
      )}
      {kind === 'stamp' && (
        <StampControls el={selectedElement} onImageUpload={onImageUpload} onImageRemove={onImageRemove} onStampOpacityChange={onStampOpacityChange} onCommitStampOpacity={onCommitStampOpacity} />
      )}
      {kind === 'signature' && (
        <SignatureControls el={selectedElement} onSignatureUpload={onSignatureUpload} onSignatureDrawSave={onSignatureDrawSave} onSignatureTypedSave={onSignatureTypedSave} />
      )}
      {kind === 'qr' && <QrControls el={selectedElement} onQrValueBlur={onQrValueBlur} />}
      {(kind === 'logo' || kind === 'letterhead') && (
        <div style={{ fontSize: 11.5, color: '#8891A0', lineHeight: 1.6 }}>
          {kind === 'logo' ? 'Upload/remove the logo in the Design panel.' : 'Upload/crop the letterhead in the Design panel.'} Drag/resize handles work here on the canvas.
        </div>
      )}

      <button onClick={onDeselect} style={{ marginTop: 20, fontSize: 12, color: '#8891A0', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
        Deselect
      </button>
    </div>
  );
}
