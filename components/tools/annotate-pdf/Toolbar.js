'use client';

import { HIGHLIGHT_COLORS, INK_COLORS, SHAPE_KIND_ICONS, TOOLS } from './constants';
import { SHAPE_KINDS } from './objectTypes/shape';
import NumberingTool from './NumberingTool';
import StampPickerRow from './StampLibrary';
import SignaturePad from '@/components/shared/SignaturePad';

function smallBtn(active, danger) {
  return {
    padding: '7px 12px', borderRadius: 8, border: '1px solid', borderColor: danger ? '#FECACA' : (active ? '#2563EB' : '#E2E8F0'),
    background: danger ? '#FEF2F2' : (active ? '#EFF6FF' : 'white'),
    color: danger ? '#DC2626' : (active ? '#1D4ED8' : '#334155'), cursor: 'pointer', fontFamily: 'inherit',
    fontSize: '0.8rem', fontWeight: 600,
  };
}

const COLOR_TOOLS = new Set(['draw', 'note', 'text', 'underline', 'strikethrough', 'shape', 'callout', 'numbering']);

export default function Toolbar({
  pagePosition, pageCount, onPrevPage, onNextPage,
  canUndo, canRedo, onUndo, onRedo,
  hasSelection, onDeleteSelected, onDuplicateSelected, onClearPage,
  activeTool, onToolChange, onInsertImageClick,
  shapeKind, onShapeKindChange,
  highlightColor, onHighlightColorChange,
  inkColor, onInkColorChange,
  favoriteTools, onToggleFavoriteTool,
  nextNumber, onRestartNumbering,
  onPickStampPreset, onUploadCustomStamp,
  onCaptureSignature, onInsertDate,
}) {
  const favSet = new Set(favoriteTools);
  const orderedTools = [...TOOLS.filter((t) => favSet.has(t.id)), ...TOOLS.filter((t) => !favSet.has(t.id))];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onPrevPage} disabled={pagePosition === 0} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Page {pagePosition + 1} of {pageCount}</span>
          <button onClick={onNextPage} disabled={pagePosition === pageCount - 1} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer' }}>→</button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={onUndo} disabled={!canUndo} style={{ ...smallBtn(false), opacity: canUndo ? 1 : 0.5, cursor: canUndo ? 'pointer' : 'default' }}>↶ Undo</button>
          <button onClick={onRedo} disabled={!canRedo} style={{ ...smallBtn(false), opacity: canRedo ? 1 : 0.5, cursor: canRedo ? 'pointer' : 'default' }}>↷ Redo</button>
          <button onClick={onDuplicateSelected} disabled={!hasSelection} style={{ ...smallBtn(false), opacity: hasSelection ? 1 : 0.5, cursor: hasSelection ? 'pointer' : 'default' }}>⧉ Duplicate</button>
          <button onClick={onDeleteSelected} disabled={!hasSelection} style={{ ...smallBtn(false, true), opacity: hasSelection ? 1 : 0.5, cursor: hasSelection ? 'pointer' : 'default' }}>🗑 Delete Selected</button>
          <button onClick={onInsertDate} style={smallBtn(false)}>📅 Insert Date</button>
          <button onClick={onClearPage} style={smallBtn(false)}>Clear Page</button>
        </div>
      </div>

      <div role="tablist" aria-label="Annotation tool" style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {orderedTools.map((t) => (
          <span key={t.id} style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
            <button
              role="tab"
              aria-selected={activeTool === t.id}
              onClick={() => (t.id === 'image' ? onInsertImageClick() : onToolChange(t.id))}
              style={{ ...smallBtn(activeTool === t.id), paddingRight: 22 }}
            >
              {t.icon} {t.label}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavoriteTool(t.id); }}
              title={favSet.has(t.id) ? 'Unpin from favorites' : 'Pin to favorites'}
              aria-label={favSet.has(t.id) ? `Unpin ${t.label}` : `Pin ${t.label}`}
              style={{ position: 'absolute', right: 3, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.72rem', padding: 2, lineHeight: 1, color: favSet.has(t.id) ? '#F59E0B' : '#CBD5E1' }}
            >
              {favSet.has(t.id) ? '★' : '☆'}
            </button>
          </span>
        ))}
      </div>

      {activeTool === 'numbering' && (
        <NumberingTool nextNumber={nextNumber} onRestart={onRestartNumbering} />
      )}

      {activeTool === 'stamp' && (
        <StampPickerRow onPickPreset={onPickStampPreset} onUploadCustom={onUploadCustomStamp} />
      )}

      {activeTool === 'signature' && (
        <SignaturePad onCapture={onCaptureSignature} />
      )}

      {activeTool === 'shape' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Shape</span>
          {SHAPE_KINDS.map((kind) => (
            <button key={kind} onClick={() => onShapeKindChange(kind)} style={smallBtn(shapeKind === kind)}>
              {SHAPE_KIND_ICONS[kind]} <span style={{ textTransform: 'capitalize' }}>{kind}</span>
            </button>
          ))}
        </div>
      )}

      {activeTool === 'highlight' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Color</span>
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} onClick={() => onHighlightColorChange(c)} aria-label={`Highlight color ${c}`} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: highlightColor === c ? '2px solid #1E293B' : '1px solid #E2E8F0', cursor: 'pointer' }} />
          ))}
        </div>
      )}
      {COLOR_TOOLS.has(activeTool) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>Color</span>
          {INK_COLORS.map((c) => (
            <button key={c} onClick={() => onInkColorChange(c)} aria-label={`Ink color ${c}`} style={{ width: 26, height: 26, borderRadius: '50%', background: c, border: inkColor === c ? '2px solid #1E293B' : '1px solid #E2E8F0', cursor: 'pointer' }} />
          ))}
        </div>
      )}
    </>
  );
}
