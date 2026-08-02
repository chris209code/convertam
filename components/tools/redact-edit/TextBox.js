'use client';

import { useEffect, useRef, useState } from 'react';
import { cssFontFamily } from './constants';
import TransformableBox from '@/components/shared/TransformableBox';

// Renders one text object as an absolutely-positioned element inside the
// page-space-scaled stage (see RedactPdfWorkspace). All coordinates here
// (obj.x/y/w/h/fontSizePx) are authored directly in that same page-space —
// the parent's CSS transform:scale handles fitting everything to the
// viewport, so this component never needs to know about display scale
// except to convert pointer *deltas* (client px) back into page-space px.
//
// Move/resize/rotate/commit mechanics live in the shared TransformableBox
// primitive (components/shared/TransformableBox.js) — this component only
// supplies the text-specific rendering (display div vs. edit textarea) and
// the text-draft/commit state around them.
export default function TextBox({ obj, scale, isSelected, isEditing, onSelect, onStartEdit, onCommitText, onCommitTransform, onLiveTransform }) {
  const skipNextBlurRef = useRef(false);
  const taRef = useRef(null);
  const [draftText, setDraftText] = useState(obj.text);

  useEffect(() => {
    if (isEditing) {
      setDraftText(obj.text);
      requestAnimationFrame(() => {
        taRef.current?.focus();
        taRef.current?.select();
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing]);

  function commitDraft() {
    if (skipNextBlurRef.current) { skipNextBlurRef.current = false; return; }
    // Grow (never shrink) the box to fit what was actually typed, so text
    // never silently clips against a too-small box the user forgot to resize.
    const measuredH = taRef.current ? Math.max(obj.h, taRef.current.scrollHeight + 4) : obj.h;
    onCommitText(draftText, measuredH !== obj.h ? { h: measuredH } : null);
  }

  function cancelEdit() {
    // Revert to the original text explicitly, rather than setDraftText()
    // then immediately blurring — blur's onBlur closure can fire before
    // that state update has flushed, committing the pre-revert draft
    // instead of the cancellation. skipNextBlurRef swallows the *natural*
    // onBlur this triggers so it doesn't re-commit on top of this.
    skipNextBlurRef.current = true;
    onCommitText(obj.text, null);
    taRef.current?.blur();
  }

  const weight = obj.bold ? 700 : 400;
  const style = obj.italic ? 'italic' : 'normal';
  const decoration = obj.underline ? 'underline' : 'none';
  const fontFamily = cssFontFamily(obj.fontFamily);

  return (
    <TransformableBox
      obj={obj}
      scale={scale}
      isSelected={isSelected}
      isEditing={isEditing}
      onSelect={onSelect}
      onStartEdit={onStartEdit}
      onCommitTransform={onCommitTransform}
      onLiveTransform={onLiveTransform}
    >
      {(display, { isEditing: editing }) => (editing ? (
        <textarea
          ref={taRef}
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') cancelEdit();
          }}
          style={{
            width: '100%', height: '100%', resize: 'none', boxSizing: 'border-box',
            border: '1px dashed #2563EB', outline: 'none', background: 'rgba(255,255,255,0.85)',
            fontFamily, fontSize: obj.fontSizePx, fontWeight: weight, fontStyle: style,
            textDecoration: decoration, color: obj.color, textAlign: obj.align,
            lineHeight: obj.lineHeight, letterSpacing: obj.letterSpacing, padding: 2,
            whiteSpace: 'pre-wrap', overflow: 'hidden',
          }}
        />
      ) : (
        <div
          style={{
            width: '100%', height: '100%', boxSizing: 'border-box', cursor: 'move',
            fontFamily, fontSize: obj.fontSizePx, fontWeight: weight, fontStyle: style,
            textDecoration: decoration, color: obj.color, textAlign: obj.align,
            lineHeight: obj.lineHeight, letterSpacing: obj.letterSpacing, padding: 2,
            whiteSpace: 'pre-wrap', overflowWrap: 'break-word', overflow: 'hidden',
            border: isSelected ? '1.5px dashed #2563EB' : '1px dashed transparent',
            userSelect: 'none',
          }}
        >
          {obj.text || (isSelected ? '' : ' ')}
        </div>
      ))}
    </TransformableBox>
  );
}
