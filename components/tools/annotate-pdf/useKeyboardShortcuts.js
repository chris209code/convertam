'use client';

import { useEffect } from 'react';

function isEditableTarget(target) {
  const tag = target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
}

// Global keyboard shortcuts for the workspace. Disabled while focus is in a
// text input/textarea (typing a note/text/callout's contents, a color hex
// field in the Properties panel, etc.) so shortcuts don't fight with normal
// typing — the same isEditableTarget guard Stage.js already uses for the
// Space-to-pan shortcut.
export function useKeyboardShortcuts({
  onUndo, onRedo, onDelete, onDuplicate, onSelectAll, onDeselect, onNudge,
  onBringForward, onSendBackward, onBringToFront, onSendToBack,
  enabled = true,
}) {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e) {
      if (isEditableTarget(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); onUndo?.(); return; }
      if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); onRedo?.(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); onDuplicate?.(); return; }
      if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); onSelectAll?.(); return; }
      if (mod && e.shiftKey && e.key === ']') { e.preventDefault(); onBringToFront?.(); return; }
      if (mod && e.shiftKey && e.key === '[') { e.preventDefault(); onSendToBack?.(); return; }
      if (mod && e.key === ']') { e.preventDefault(); onBringForward?.(); return; }
      if (mod && e.key === '[') { e.preventDefault(); onSendBackward?.(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); onDelete?.(); return; }
      if (e.key === 'Escape') { onDeselect?.(); return; }

      const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0;
      const dy = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0;
      if (dx || dy) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        onNudge?.(dx * step, dy * step);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, onUndo, onRedo, onDelete, onDuplicate, onSelectAll, onDeselect, onNudge, onBringForward, onSendBackward, onBringToFront, onSendToBack]);
}
