'use client';

import { useState } from 'react';
import { HIGHLIGHT_COLORS, INK_COLORS, SHAPE_KIND_ICONS } from './constants';
import ReviewPanel from './ReviewPanel';

function tabBtn(active) {
  return {
    padding: '5px 10px', borderRadius: 6, border: '1px solid', borderColor: active ? '#2563EB' : '#E2E8F0',
    background: active ? '#EFF6FF' : 'white', color: active ? '#1D4ED8' : '#64748B', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.74rem', fontWeight: 600,
  };
}
function actionBtn(danger) {
  return {
    padding: '6px 8px', borderRadius: 6, border: '1px solid', borderColor: danger ? '#FECACA' : '#E2E8F0',
    background: danger ? '#FEF2F2' : 'white', color: danger ? '#DC2626' : '#334155', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 600, flex: 1,
  };
}
function sectionLabel(text) {
  return <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 4 }}>{text}</div>;
}
function swatchRow(colors, value, onChange) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {colors.map((c) => (
        <button key={c} onClick={() => onChange(c)} aria-label={`Color ${c}`} style={{ width: 22, height: 22, borderRadius: '50%', background: c, border: value === c ? '2px solid #1E293B' : '1px solid #E2E8F0', cursor: 'pointer' }} />
      ))}
    </div>
  );
}

const TYPE_LABELS = {
  highlight: 'Highlight', draw: 'Freehand Draw', note: 'Sticky Note', text: 'Text',
  underline: 'Underline', strikethrough: 'Strikethrough', callout: 'Callout',
  image: 'Image', numbering: 'Numbered Marker', signature: 'Signature', stamp: 'Stamp',
};
function typeLabel(o) {
  if (o.type === 'shape') return `${o.shapeKind?.[0]?.toUpperCase()}${o.shapeKind?.slice(1)} Shape`;
  return TYPE_LABELS[o.type] || o.type;
}
function typeIcon(o) {
  if (o.type === 'shape') return SHAPE_KIND_ICONS[o.shapeKind] || '⬛';
  return { highlight: '🖍️', draw: '✏️', note: '📝', text: '🅰️', underline: '𝐔', strikethrough: 'S̶', callout: '💬', image: '🖼️', numbering: '🔢', signature: '✍️', stamp: '🖋️' }[o.type] || '•';
}

function LayerControls({ locked, hidden, onToggleLock, onToggleHide, onDuplicate, onDelete, onBringForward, onSendBackward, onBringToFront, onSendToBack }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sectionLabel('Layer')}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onToggleLock} style={actionBtn(false)}>{locked ? '🔓 Unlock' : '🔒 Lock'}</button>
        <button onClick={onToggleHide} style={actionBtn(false)}>{hidden ? '👁 Show' : '🚫 Hide'}</button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onBringToFront} title="Bring to Front" style={actionBtn(false)}>⤒ Front</button>
        <button onClick={onBringForward} title="Bring Forward" style={actionBtn(false)}>▲ Forward</button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onSendToBack} title="Send to Back" style={actionBtn(false)}>⤓ Back</button>
        <button onClick={onSendBackward} title="Send Backward" style={actionBtn(false)}>▼ Backward</button>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onDuplicate} style={actionBtn(false)}>⧉ Duplicate</button>
        <button onClick={onDelete} style={actionBtn(true)}>🗑 Delete</button>
      </div>
    </div>
  );
}

// Right panel: "Properties" shows real per-type editing controls for the
// current selection (single-object type controls, or an alignment toolbar
// once 2+ objects are selected) plus shared lock/hide/z-order/duplicate/
// delete actions. "Layers" lists every annotation on the current page,
// click-to-select, with inline lock/hide toggles — the plan's "future-ready"
// Layers tab now has real content instead of being an inert placeholder.
export default function PropertiesPanel({
  selectedObjects, pageObjects,
  onUpdateSelected,
  onToggleLockSelected, onToggleHideSelected, onDuplicateSelected, onDeleteSelected,
  onBringForward, onSendBackward, onBringToFront, onSendToBack,
  onAlign, onDistribute,
  onSelectObjectId, onToggleLockById, onToggleHideById,
  allObjects, pageOrder, onJumpToObject, onToggleResolvedById,
}) {
  const [tab, setTab] = useState('properties');
  const sole = selectedObjects.length === 1 ? selectedObjects[0] : null;

  return (
    <div style={{ width: 230, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div role="tablist" aria-label="Panel" style={{ display: 'flex', gap: 6 }}>
        <button role="tab" aria-selected={tab === 'properties'} onClick={() => setTab('properties')} style={tabBtn(tab === 'properties')}>Properties</button>
        <button role="tab" aria-selected={tab === 'layers'} onClick={() => setTab('layers')} style={tabBtn(tab === 'layers')}>Layers</button>
        <button role="tab" aria-selected={tab === 'review'} onClick={() => setTab('review')} style={tabBtn(tab === 'review')}>Review</button>
      </div>

      {tab === 'properties' && (
        selectedObjects.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Select an annotation to see its properties.</p>
        ) : sole ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden="true">{typeIcon(sole)}</span> {typeLabel(sole)}
            </div>

            {sole.type === 'highlight' && (
              <>
                {sectionLabel('Color')}
                {swatchRow(HIGHLIGHT_COLORS, sole.color, (color) => onUpdateSelected({ color }))}
                {sectionLabel('Opacity')}
                <input type="range" min={0.15} max={1} step={0.05} value={sole.opacity ?? 0.42} onChange={(e) => onUpdateSelected({ opacity: Number(e.target.value) })} />
              </>
            )}

            {(sole.type === 'underline' || sole.type === 'strikethrough') && (
              <>
                {sectionLabel('Style')}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onUpdateSelected({ style: 'solid' })} style={actionBtn(false)}>Solid</button>
                  <button onClick={() => onUpdateSelected({ style: 'dashed' })} style={actionBtn(false)}>Dashed</button>
                </div>
                {sectionLabel('Color')}
                {swatchRow(INK_COLORS, sole.color, (color) => onUpdateSelected({ color }))}
              </>
            )}

            {sole.type === 'draw' && (
              <>
                {sectionLabel('Thickness')}
                <input type="range" min={1} max={16} step={1} value={sole.thickness ?? 5} onChange={(e) => onUpdateSelected({ thickness: Number(e.target.value) })} />
                {sectionLabel('Color')}
                {swatchRow(INK_COLORS, sole.color, (color) => onUpdateSelected({ color }))}
              </>
            )}

            {sole.type === 'shape' && (
              <>
                {sectionLabel('Thickness')}
                <input type="range" min={1} max={12} step={1} value={sole.thickness ?? 3} onChange={(e) => onUpdateSelected({ thickness: Number(e.target.value) })} />
                {sectionLabel('Color')}
                {swatchRow(INK_COLORS, sole.color, (color) => onUpdateSelected({ color }))}
                {sole.shapeKind !== 'line' && sole.shapeKind !== 'arrow' && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#334155' }}>
                    <input type="checkbox" checked={!!sole.fill} onChange={(e) => onUpdateSelected({ fill: e.target.checked })} /> Fill shape
                  </label>
                )}
                {(sole.rotation || 0) !== 0 && (
                  <button onClick={() => onUpdateSelected({ rotation: 0 })} style={actionBtn(false)}>↺ Reset rotation</button>
                )}
              </>
            )}

            {sole.type === 'note' && (
              <>
                {sectionLabel('Color')}
                {swatchRow(INK_COLORS, sole.color, (color) => onUpdateSelected({ color }))}
              </>
            )}

            {sole.type === 'text' && (
              <>
                {sectionLabel('Font Size')}
                <input type="range" min={12} max={72} step={2} value={sole.size ?? 28} onChange={(e) => onUpdateSelected({ size: Number(e.target.value) })} />
                {sectionLabel('Color')}
                {swatchRow(INK_COLORS, sole.color, (color) => onUpdateSelected({ color }))}
              </>
            )}

            {sole.type === 'callout' && (
              <>
                {sectionLabel('Color')}
                {swatchRow(INK_COLORS, sole.color, (color) => onUpdateSelected({ color }))}
              </>
            )}

            {(sole.type === 'image' || sole.type === 'signature' || sole.type === 'stamp') && (
              <>
                {sectionLabel('Opacity')}
                <input type="range" min={0.2} max={1} step={0.05} value={sole.opacity ?? 1} onChange={(e) => onUpdateSelected({ opacity: Number(e.target.value) })} />
                {(sole.rotation || 0) !== 0 && (
                  <button onClick={() => onUpdateSelected({ rotation: 0 })} style={actionBtn(false)}>↺ Reset rotation</button>
                )}
              </>
            )}

            <LayerControls
              locked={sole.locked} hidden={sole.hidden}
              onToggleLock={onToggleLockSelected} onToggleHide={onToggleHideSelected}
              onDuplicate={onDuplicateSelected} onDelete={onDeleteSelected}
              onBringForward={onBringForward} onSendBackward={onSendBackward}
              onBringToFront={onBringToFront} onSendToBack={onSendToBack}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>{selectedObjects.length} annotations selected</div>

            {sectionLabel('Align')}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onAlign('left')} style={actionBtn(false)}>⇤ Left</button>
              <button onClick={() => onAlign('center-h')} style={actionBtn(false)}>↔ Center</button>
              <button onClick={() => onAlign('right')} style={actionBtn(false)}>⇥ Right</button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onAlign('top')} style={actionBtn(false)}>⤒ Top</button>
              <button onClick={() => onAlign('center-v')} style={actionBtn(false)}>↕ Middle</button>
              <button onClick={() => onAlign('bottom')} style={actionBtn(false)}>⤓ Bottom</button>
            </div>
            {selectedObjects.length >= 3 && (
              <>
                {sectionLabel('Distribute')}
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => onDistribute('horizontal')} style={actionBtn(false)}>Horizontally</button>
                  <button onClick={() => onDistribute('vertical')} style={actionBtn(false)}>Vertically</button>
                </div>
              </>
            )}

            <LayerControls
              locked={selectedObjects.every((o) => o.locked)} hidden={selectedObjects.every((o) => o.hidden)}
              onToggleLock={onToggleLockSelected} onToggleHide={onToggleHideSelected}
              onDuplicate={onDuplicateSelected} onDelete={onDeleteSelected}
              onBringForward={onBringForward} onSendBackward={onSendBackward}
              onBringToFront={onBringToFront} onSendToBack={onSendToBack}
            />
          </div>
        )
      )}

      {tab === 'layers' && (
        pageObjects.length === 0 ? (
          <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>No annotations on this page yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto' }}>
            {[...pageObjects].sort((a, b) => b.z - a.z).map((o) => (
              <div
                key={o.id}
                onClick={() => onSelectObjectId(o.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                  background: 'white', border: '1px solid #E2E8F0', opacity: o.hidden ? 0.5 : 1,
                }}
              >
                <span aria-hidden="true">{typeIcon(o)}</span>
                <span style={{ flex: 1, fontSize: '0.76rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{typeLabel(o)}</span>
                <button onClick={(e) => { e.stopPropagation(); onToggleLockById(o.id); }} title={o.locked ? 'Unlock' : 'Lock'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem' }}>{o.locked ? '🔒' : '🔓'}</button>
                <button onClick={(e) => { e.stopPropagation(); onToggleHideById(o.id); }} title={o.hidden ? 'Show' : 'Hide'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem' }}>{o.hidden ? '🚫' : '👁'}</button>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'review' && (
        <ReviewPanel
          objects={allObjects}
          pageOrder={pageOrder}
          onJumpToObject={onJumpToObject}
          onToggleResolved={onToggleResolvedById}
        />
      )}
    </div>
  );
}
