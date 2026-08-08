'use client';

import { useState } from 'react';
import { TYPE_LABELS } from './objectTypes';

function actionBtn(danger, disabled) {
  return {
    padding: '6px 8px', borderRadius: 6, border: '1px solid', borderColor: danger ? '#FECACA' : '#E2E8F0',
    background: danger ? '#FEF2F2' : 'white', color: disabled ? '#CBD5E1' : danger ? '#DC2626' : '#334155',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
    fontFamily: 'inherit', fontSize: '0.72rem', fontWeight: 600, flex: 1,
  };
}

function typeIcon(o) {
  if (o.type === 'shape') return { rectangle: '▭', ellipse: '⬭', line: '➖' }[o.shapeKind] || '⬛';
  if (o.type === 'image') return o.kind === 'logo' ? '🏷️' : '🖼️';
  return { text: '🅣', signature: '✍️', pageNumber: '#️⃣', letterhead: '📰', watermark: '💧', stamp: '🖋️', footer: '📏', qrcode: '🔳' }[o.type] || '•';
}

// Layers tab content: every object on the current page, front-to-back
// (z descending, matching visual stacking), click-to-select, with inline
// lock/hide toggles and double-click-to-rename. Ports the same
// reorderZ/toggleLock/toggleHide logic Annotate PDF already proved out
// (AnnotatePdfWorkspace.js), adapted to this tool's single-selection object
// model — there's no multi-select here, unlike Annotate's Set-based one.
export default function LayersPanel({
  pageObjects, selectedId, onSelectId,
  onToggleLockById, onToggleHideById, onRenameObject,
  onReorderZ, onDuplicateSelected, onDeleteSelected,
}) {
  const [renamingId, setRenamingId] = useState(null);
  const [draftName, setDraftName] = useState('');

  function startRename(o) {
    setRenamingId(o.id);
    setDraftName(o.name || TYPE_LABELS[o.type] || o.type);
  }
  function commitRename() {
    if (renamingId) onRenameObject(renamingId, draftName.trim() || null);
    setRenamingId(null);
  }

  if (!pageObjects.length) {
    return <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>No elements on this page yet.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 360, overflowY: 'auto' }}>
        {[...pageObjects].sort((a, b) => b.z - a.z).map((o) => {
          const isSelected = o.id === selectedId;
          return (
            <div
              key={o.id}
              onClick={() => onSelectId(o.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                background: isSelected ? '#EFF6FF' : 'white', border: '1px solid', borderColor: isSelected ? '#93C5FD' : '#E2E8F0',
                opacity: o.hidden ? 0.5 : 1,
              }}
            >
              <span aria-hidden="true">{typeIcon(o)}</span>
              {renamingId === o.id ? (
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur(); }}
                  onClick={(e) => e.stopPropagation()}
                  style={{ flex: 1, minWidth: 0, fontSize: '0.76rem', padding: '2px 4px', borderRadius: 4, border: '1px solid #93C5FD', fontFamily: 'inherit' }}
                />
              ) : (
                <span
                  onDoubleClick={(e) => { e.stopPropagation(); startRename(o); }}
                  title="Double-click to rename"
                  style={{ flex: 1, fontSize: '0.76rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {o.name || TYPE_LABELS[o.type] || o.type}
                </span>
              )}
              <button onClick={(e) => { e.stopPropagation(); onToggleLockById(o.id); }} title={o.locked ? 'Unlock' : 'Lock'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem' }}>{o.locked ? '🔒' : '🔓'}</button>
              <button onClick={(e) => { e.stopPropagation(); onToggleHideById(o.id); }} title={o.hidden ? 'Show' : 'Hide'} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem' }}>{o.hidden ? '🚫' : '👁'}</button>
            </div>
          );
        })}
      </div>

      {selectedId && (() => {
        // Reordering only changes stacking AMONG objects on this page — it
        // can't move anything "behind" the real PDF page itself, which
        // always renders beneath every placed object regardless of z. With
        // a single object (or the selection already at that end of the
        // stack), Front/Back genuinely have nothing to do; disabling them
        // here says so, instead of looking broken when clicked.
        const sorted = [...pageObjects].sort((a, b) => a.z - b.z);
        const index = sorted.findIndex((o) => o.id === selectedId);
        const isTop = index === sorted.length - 1;
        const isBottom = index === 0;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onReorderZ('front')} disabled={isTop} title="Bring to Front" style={actionBtn(false, isTop)}>⤒ Front</button>
              <button onClick={() => onReorderZ('forward')} disabled={isTop} title="Bring Forward" style={actionBtn(false, isTop)}>▲ Forward</button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onReorderZ('back')} disabled={isBottom} title="Send to Back" style={actionBtn(false, isBottom)}>⤓ Back</button>
              <button onClick={() => onReorderZ('backward')} disabled={isBottom} title="Send Backward" style={actionBtn(false, isBottom)}>▼ Backward</button>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onDuplicateSelected} style={actionBtn(false, false)}>⧉ Duplicate</button>
              <button onClick={onDeleteSelected} style={actionBtn(true, false)}>🗑 Delete</button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
