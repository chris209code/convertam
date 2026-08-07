'use client';

import { useState } from 'react';
import { FONT_FAMILIES, INK_COLORS } from './constants';
import LayersPanel from './LayersPanel';

function tabBtn(active) {
  return {
    padding: '5px 10px', borderRadius: 6, border: '1px solid', borderColor: active ? '#2563EB' : '#E2E8F0',
    background: active ? '#EFF6FF' : 'white', color: active ? '#1D4ED8' : '#64748B', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600,
  };
}

function label(text) {
  return <p style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '10px 0 4px' }}>{text}</p>;
}

function numberField(value, onChange, { min, step = 1 } = {}) {
  return (
    <input
      type="number"
      value={Math.round(value)}
      min={min}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit' }}
    />
  );
}

function toggleBtn(active, onClick, content) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '6px 0', borderRadius: 6, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem',
        borderColor: active ? '#2563EB' : '#E2E8F0', background: active ? '#EFF6FF' : 'white', color: active ? '#2563EB' : '#475569', fontWeight: 700,
      }}
    >
      {content}
    </button>
  );
}

// Shared "Page Selection" control for every rule-object element type (Page
// Numbers, Watermark, Footer, QR Code) — all four resolve their target
// pages through pageSelection.js's resolveTargetPages(), so they share this
// one selector+custom-range-input UI instead of each duplicating the same
// five-option <select>.
function pagesRuleControl(o, onChange) {
  return (
    <>
      {label('Applies to')}
      <select value={o.pagesRule} onChange={(e) => onChange({ pagesRule: e.target.value })} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit' }}>
        <option value="all">All pages</option>
        <option value="current">This page only</option>
        <option value="odd">Odd pages</option>
        <option value="even">Even pages</option>
        <option value="custom">Custom range…</option>
      </select>
      {o.pagesRule === 'custom' && (
        <input
          type="text"
          value={o.customRange || ''}
          placeholder="e.g. 1,3,5-8"
          onChange={(e) => onChange({ customRange: e.target.value })}
          style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit', marginTop: 4 }}
        />
      )}
    </>
  );
}

// Right sidebar: tabbed Properties / Layers, matching Annotate PDF's
// Properties/Layers/Review precedent (minus the Review tab, which doesn't
// apply here — this tool has no comment/reply workflow). Properties shows
// geometry + type-specific controls for whichever object is selected;
// generic geometry (position/size/rotation/opacity) applies to every type,
// the type-specific block below it is looked up by obj.type. Layers lists
// every object on the current page regardless of selection, so it stays
// usable even with nothing selected (unlike the old Properties-only panel,
// which had nothing to show in that state).
export default function PropertiesPanel({
  selectedObject, onChange, onDeselect,
  pageObjects, selectedId, onSelectId,
  onToggleLockById, onToggleHideById, onRenameObject,
  onReorderZ, onDuplicateSelected, onDeleteSelected,
  onRegenerateQrCode,
}) {
  const [tab, setTab] = useState('properties');
  const o = selectedObject;

  return (
    <div style={{ width: 240, flexShrink: 0, maxHeight: 640, overflowY: 'auto' }}>
      <div role="tablist" aria-label="Panel" style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        <button role="tab" aria-selected={tab === 'properties'} onClick={() => setTab('properties')} style={tabBtn(tab === 'properties')}>Properties</button>
        <button role="tab" aria-selected={tab === 'layers'} onClick={() => setTab('layers')} style={tabBtn(tab === 'layers')}>Layers</button>
      </div>

      {tab === 'layers' && (
        <LayersPanel
          pageObjects={pageObjects}
          selectedId={selectedId}
          onSelectId={onSelectId}
          onToggleLockById={onToggleLockById}
          onToggleHideById={onToggleHideById}
          onRenameObject={onRenameObject}
          onReorderZ={onReorderZ}
          onDuplicateSelected={onDuplicateSelected}
          onDeleteSelected={onDeleteSelected}
        />
      )}

      {tab === 'properties' && !o && (
        <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Select an element on the page to edit its properties.</p>
      )}

      {tab === 'properties' && o && (
        <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
        <button onClick={onDeselect} title="Deselect" style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}>✕</button>
      </div>

      {label('Position & size')}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>X</span>
          {numberField(o.x, (v) => onChange({ x: v }))}
        </div>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Y</span>
          {numberField(o.y, (v) => onChange({ y: v }))}
        </div>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Width</span>
          {numberField(o.w, (v) => {
            if ((o.type === 'image' || o.type === 'signature') && o.lockAspect && o.naturalWidth) {
              onChange({ w: v, h: Math.round((v / o.naturalWidth) * o.naturalHeight) });
            } else onChange({ w: v });
          }, { min: 8 })}
        </div>
        <div>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Height</span>
          {numberField(o.h, (v) => {
            if ((o.type === 'image' || o.type === 'signature') && o.lockAspect && o.naturalHeight) {
              onChange({ h: v, w: Math.round((v / o.naturalHeight) * o.naturalWidth) });
            } else onChange({ h: v });
          }, { min: 8 })}
        </div>
      </div>

      {label('Rotation')}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="range" min={-180} max={180} value={o.rotation || 0} onChange={(e) => onChange({ rotation: Number(e.target.value) })} style={{ flex: 1 }} />
        <span style={{ fontSize: '0.72rem', color: '#64748B', width: 34, textAlign: 'right' }}>{Math.round(o.rotation || 0)}°</span>
      </div>
      {(o.rotation || 0) !== 0 && (
        <button onClick={() => onChange({ rotation: 0 })} style={{ marginTop: 4, background: 'none', border: 'none', color: '#2563EB', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Reset rotation</button>
      )}

      {label('Opacity')}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input type="range" min={0.1} max={1} step={0.05} value={o.opacity ?? 1} onChange={(e) => onChange({ opacity: Number(e.target.value) })} style={{ flex: 1 }} />
        <span style={{ fontSize: '0.72rem', color: '#64748B', width: 34, textAlign: 'right' }}>{Math.round((o.opacity ?? 1) * 100)}%</span>
      </div>

      {o.type === 'text' && (
        <>
          {label('Font')}
          <select value={o.fontFamily} onChange={(e) => onChange({ fontFamily: e.target.value })} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit' }}>
            {FONT_FAMILIES.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>

          {label('Size')}
          {numberField(o.fontSize, (v) => onChange({ fontSize: Math.max(6, v) }), { min: 6 })}

          {label('Style')}
          <div style={{ display: 'flex', gap: 6 }}>
            {toggleBtn(o.bold, () => onChange({ bold: !o.bold }), 'B')}
            {toggleBtn(o.italic, () => onChange({ italic: !o.italic }), <span style={{ fontStyle: 'italic' }}>I</span>)}
            {toggleBtn(o.underline, () => onChange({ underline: !o.underline }), <span style={{ textDecoration: 'underline' }}>U</span>)}
          </div>

          {label('Alignment')}
          <div style={{ display: 'flex', gap: 6 }}>
            {toggleBtn(o.align === 'left', () => onChange({ align: 'left' }), '⟸')}
            {toggleBtn(o.align === 'center', () => onChange({ align: 'center' }), '⟺')}
            {toggleBtn(o.align === 'right', () => onChange({ align: 'right' }), '⟹')}
          </div>

          {label('Letter spacing')}
          {numberField(o.letterSpacing || 0, (v) => onChange({ letterSpacing: v }), { min: -2 })}

          {label('Color')}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {INK_COLORS.map((c) => (
              <button key={c} onClick={() => onChange({ color: c })} title={c} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: o.color === c ? '2px solid #1E293B' : '1px solid #E2E8F0', cursor: 'pointer', padding: 0 }} />
            ))}
            <input type="color" value={o.color} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
          </div>

          {label('Background')}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => onChange({ background: o.background ? null : '#FEF3C7' })} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
              {o.background ? 'Remove' : 'Add'}
            </button>
            {o.background && <input type="color" value={o.background} onChange={(e) => onChange({ background: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />}
          </div>

          {label('Border')}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => onChange({ borderWidth: o.borderWidth > 0 ? 0 : 1, borderColor: o.borderColor || '#111827' })} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
              {o.borderWidth > 0 ? 'Remove' : 'Add'}
            </button>
            {o.borderWidth > 0 && (
              <>
                <input type="color" value={o.borderColor} onChange={(e) => onChange({ borderColor: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
                {numberField(o.borderWidth, (v) => onChange({ borderWidth: Math.max(1, v) }), { min: 1 })}
              </>
            )}
          </div>
        </>
      )}

      {(o.type === 'image' || o.type === 'signature') && (
        <>
          {label('Aspect ratio')}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!o.lockAspect} onChange={(e) => onChange({ lockAspect: e.target.checked })} />
            Lock aspect ratio
          </label>
        </>
      )}

      {o.type === 'shape' && (
        <>
          {label('Shape')}
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0, textTransform: 'capitalize' }}>{o.shapeKind}</p>

          {label(o.shapeKind === 'line' ? 'Line color' : 'Border color')}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="color" value={o.color} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
            {numberField(o.borderWidth, (v) => onChange({ borderWidth: Math.max(1, v) }), { min: 1 })}
          </div>

          {o.shapeKind !== 'line' && (
            <>
              {label('Fill')}
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button onClick={() => onChange({ fillColor: o.fillColor ? null : '#DBEAFE' })} style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit' }}>
                  {o.fillColor ? 'Remove' : 'Add'}
                </button>
                {o.fillColor && <input type="color" value={o.fillColor} onChange={(e) => onChange({ fillColor: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />}
              </div>
            </>
          )}
        </>
      )}

      {o.type === 'pageNumber' && (
        <>
          {pagesRuleControl(o, onChange)}

          {label('Format')}
          <select value={o.format} onChange={(e) => onChange({ format: e.target.value })} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit' }}>
            <option value="pageOfTotal">Page 1 of 10</option>
            <option value="number">1</option>
          </select>

          {label('Alignment')}
          <div style={{ display: 'flex', gap: 6 }}>
            {toggleBtn(o.align === 'left', () => onChange({ align: 'left' }), '⟸')}
            {toggleBtn(o.align === 'center', () => onChange({ align: 'center' }), '⟺')}
            {toggleBtn(o.align === 'right', () => onChange({ align: 'right' }), '⟹')}
          </div>

          {label('Size')}
          {numberField(o.fontSize, (v) => onChange({ fontSize: Math.max(6, v) }), { min: 6 })}

          {label('Color')}
          <input type="color" value={o.color} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
        </>
      )}

      {o.type === 'watermark' && (
        <>
          {pagesRuleControl(o, onChange)}

          {label('Size')}
          {numberField(o.fontSize, (v) => onChange({ fontSize: Math.max(10, v) }), { min: 10 })}

          {label('Color')}
          <input type="color" value={o.color} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
        </>
      )}

      {o.type === 'stamp' && (
        <>
          {label('Preset')}
          <p style={{ fontSize: '0.78rem', color: '#475569', margin: 0 }}>{o.label}</p>

          {label('Border & text color')}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="color" value={o.color} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
            {numberField(o.borderWidth, (v) => onChange({ borderWidth: Math.max(1, v) }), { min: 1 })}
          </div>

          {label('Size')}
          {numberField(o.fontSize, (v) => onChange({ fontSize: Math.max(8, v) }), { min: 8 })}
        </>
      )}

      {o.type === 'footer' && (
        <>
          {pagesRuleControl(o, onChange)}

          {label('Alignment')}
          <div style={{ display: 'flex', gap: 6 }}>
            {toggleBtn(o.align === 'left', () => onChange({ align: 'left' }), '⟸')}
            {toggleBtn(o.align === 'center', () => onChange({ align: 'center' }), '⟺')}
            {toggleBtn(o.align === 'right', () => onChange({ align: 'right' }), '⟹')}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#475569', cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={!!o.includePageNumber} onChange={(e) => onChange({ includePageNumber: e.target.checked })} />
            Include page number
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#475569', cursor: 'pointer' }}>
            <input type="checkbox" checked={!!o.showDivider} onChange={(e) => onChange({ showDivider: e.target.checked })} />
            Show divider line
          </label>

          {label('Size')}
          {numberField(o.fontSize, (v) => onChange({ fontSize: Math.max(6, v) }), { min: 6 })}

          {label('Color')}
          <input type="color" value={o.color} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
        </>
      )}

      {o.type === 'qrcode' && (
        <>
          {pagesRuleControl(o, onChange)}

          {label('Content (URL or text)')}
          <textarea
            value={o.value}
            onChange={(e) => onChange({ value: e.target.value })}
            rows={2}
            style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #E2E8F0', fontSize: '0.78rem', fontFamily: 'inherit', resize: 'vertical' }}
          />
          <button
            onClick={() => onRegenerateQrCode(o.id, o.value, o.color)}
            style={{ marginTop: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, fontFamily: 'inherit' }}
          >
            Update QR Code
          </button>

          {label('Color')}
          <input type="color" value={o.color} onChange={(e) => onChange({ color: e.target.value })} style={{ width: 22, height: 22, padding: 0, border: 'none', cursor: 'pointer' }} />
        </>
      )}
        </>
      )}
    </div>
  );
}
