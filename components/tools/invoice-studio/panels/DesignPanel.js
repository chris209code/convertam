'use client';

import { useRef, useState } from 'react';
import { HEADING_FONT_OPTIONS, BODY_FONT_OPTIONS } from '@/lib/invoice-studio/fonts';
import { CURRENCIES } from '@/lib/invoice-studio/constants';

const sectionTitle = { fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: '#8891A0', textTransform: 'uppercase', marginBottom: 10, marginTop: 22 };
const miniLabel = { fontSize: 11, color: '#8891A0', marginBottom: 4 };
const colorInput = { width: '100%', height: 34, borderRadius: 7, border: '1px solid #E2E6ED', cursor: 'pointer', padding: 2 };
const select = { width: '100%', height: 34, borderRadius: 7, border: '1px solid #E2E6ED', padding: '0 8px', fontSize: 12.5, color: '#334155', background: '#fff' };
const numberInput = { ...select, padding: '0 10px' };
const smallBtnGhost = { padding: '7px 14px', borderRadius: 7, border: '1px solid #E2E6ED', background: '#fff', color: '#334155', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' };
const smallBtn = { ...smallBtnGhost, border: 'none', background: '#2563EB', color: '#fff' };

const DISPLAY_TOGGLES = [
  { id: 'qr', label: 'Show QR Payment' },
  { id: 'signature', label: 'Show Signature' },
  { id: 'stamp', label: 'Show Company Stamp' },
  { id: 'paymentMethods', label: 'Show Payment Methods' },
  { id: 'bankDetails', label: 'Show Bank Details' },
  { id: 'totalWords', label: 'Show Total in Words' },
  { id: 'watermark', label: 'Show Watermark' },
  { id: 'terms', label: 'Show Terms and Conditions' },
];

function ToggleRow({ label, on, onClick }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 12.5, color: '#334155' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={onClick}
        style={{ width: 36, height: 20, borderRadius: 10, padding: 2, cursor: 'pointer', border: 'none', background: on ? '#2563EB' : '#E2E6ED' }}
      >
        <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'transform .15s', transform: `translateX(${on ? 16 : 0}px)` }} />
      </button>
    </div>
  );
}

function LogoUpload({ elements, onImageUpload, onImageRemove }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const logo = elements.find((e) => e.id === 'logo');
  if (!logo) return null;

  async function handleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = await onImageUpload('logo', file);
    setError(err || '');
  }

  return (
    <div>
      <div style={sectionTitle}>Logo</div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" onClick={() => inputRef.current?.click()} style={smallBtnGhost}>{logo.src ? 'Change Logo' : 'Upload Logo'}</button>
        {logo.src && <button type="button" onClick={() => onImageRemove('logo')} style={smallBtnGhost}>Remove</button>}
      </div>
      {error && <div style={{ color: '#DC2626', fontSize: 11.5, marginTop: 6 }}>{error}</div>}
    </div>
  );
}

function LetterheadSection({ letterheadEl, onOpenCrop, onLetterheadRemove }) {
  if (!letterheadEl) return null;
  const hasLetterhead = !!letterheadEl.src;
  return (
    <div>
      <div style={sectionTitle}>Letterhead</div>
      <div style={{ fontSize: 11.5, color: '#8891A0', marginBottom: 8, lineHeight: 1.5 }}>Replaces the header block with your printed letterhead.</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onOpenCrop} style={smallBtnGhost}>{hasLetterhead ? 'Re-crop' : 'Upload'}</button>
        {hasLetterhead && <button type="button" onClick={onLetterheadRemove} style={smallBtnGhost}>Remove</button>}
      </div>
    </div>
  );
}

export default function DesignPanel({
  brand, onBrandChange, elements, onToggleVisible, docSettings, onDocSettingChange, onCommitDocSetting,
  onImageUpload, onImageRemove, letterheadEl, onOpenCrop, onLetterheadRemove,
}) {
  return (
    <div>
      <div style={{ ...sectionTitle, marginTop: 0 }}>Colours</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={miniLabel}>Primary</div>
          <input type="color" value={brand.brandPrimary} onChange={(e) => onBrandChange('brandPrimary', e.target.value)} style={colorInput} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={miniLabel}>Secondary</div>
          <input type="color" value={brand.brandSecondary} onChange={(e) => onBrandChange('brandSecondary', e.target.value)} style={colorInput} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={miniLabel}>Accent</div>
          <input type="color" value={brand.brandAccent} onChange={(e) => onBrandChange('brandAccent', e.target.value)} style={colorInput} />
        </div>
      </div>

      <div style={sectionTitle}>Typography</div>
      <div style={{ marginBottom: 8 }}>
        <div style={miniLabel}>Heading Font</div>
        <select value={brand.headingFont} onChange={(e) => onBrandChange('headingFont', e.target.value)} style={select}>
          {HEADING_FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <div style={miniLabel}>Body Font</div>
        <select value={brand.bodyFont} onChange={(e) => onBrandChange('bodyFont', e.target.value)} style={select}>
          {BODY_FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <LogoUpload elements={elements} onImageUpload={onImageUpload} onImageRemove={onImageRemove} />
      <LetterheadSection letterheadEl={letterheadEl} onOpenCrop={onOpenCrop} onLetterheadRemove={onLetterheadRemove} />

      <div style={{ fontSize: 11.5, color: '#8891A0', lineHeight: 1.6, marginTop: 18 }}>
        Signature and stamp uploads are in the Element panel — select the signature or stamp on the canvas.
      </div>

      <div style={sectionTitle}>Display Options</div>
      {DISPLAY_TOGGLES.map((t) => {
        const el = elements.find((e) => e.id === t.id);
        if (!el) return null;
        return <ToggleRow key={t.id} label={t.label} on={el.visible} onClick={() => onToggleVisible(t.id)} />;
      })}

      <div style={sectionTitle}>Document</div>
      <div style={{ marginBottom: 8 }}>
        <div style={miniLabel}>Currency</div>
        <select
          value={docSettings.currency}
          onChange={(e) => { onDocSettingChange('currency', e.target.value); onCommitDocSetting(); }}
          style={select}
        >
          {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={miniLabel}>Discount amount ({docSettings.currency})</div>
        <input
          type="number" min="0" value={docSettings.discount}
          onChange={(e) => onDocSettingChange('discount', parseFloat(e.target.value) || 0)}
          onBlur={onCommitDocSetting}
          style={numberInput}
        />
      </div>
      <div>
        <div style={miniLabel}>Default VAT % (new items)</div>
        <input
          type="number" min="0" max="100" step="0.5" value={docSettings.vatRate}
          onChange={(e) => onDocSettingChange('vatRate', parseFloat(e.target.value) || 0)}
          onBlur={onCommitDocSetting}
          style={numberInput}
        />
      </div>
    </div>
  );
}
