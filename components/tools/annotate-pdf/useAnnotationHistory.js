'use client';

import { useCallback, useRef, useState } from 'react';

// Caps how many snapshots we keep so a very long editing session doesn't
// grow the undo stack unboundedly; old entries just fall off the back.
const MAX_HISTORY = 80;

// Undo/redo for the annotation workspace: one flat array of annotation
// objects (each tagged with a `page` field) per history entry, rather than
// per-page nested arrays. A flat model is what lets cross-page features
// (Review Panel grouped-by-page, copy/paste across pages, thumbnail
// reordering) work without restructuring storage later. Snapshots are full
// shallow-array copies rather than a command/diff log — deliberately, this
// is a client-side single-user session-scoped tool, and cloning an array of
// a few hundred small plain objects per commit is not the bottleneck; the
// thing that actually keeps interactions smooth is callers batching related
// mutations into one commit() instead of one per touched object.
export function useAnnotationHistory() {
  const [history, setHistory] = useState({ stack: [[]], index: 0 });
  const nextIdRef = useRef(1);
  const nextZRef = useRef(1);

  const objects = history.stack[history.index];

  // Re-seeds the history (new document loaded, or "Start Over"), and resets
  // the id/z counters so freshly created objects never collide with ones
  // from a previous document.
  const reset = useCallback((initialObjects = []) => {
    nextIdRef.current = initialObjects.reduce((m, o) => Math.max(m, o.id), 0) + 1;
    nextZRef.current = initialObjects.reduce((m, o) => Math.max(m, o.z || 0), 0) + 1;
    setHistory({ stack: [initialObjects], index: 0 });
  }, []);

  const commit = useCallback((nextObjects) => {
    setHistory((h) => {
      if (nextObjects === h.stack[h.index]) return h; // no-op guard
      const truncated = h.stack.slice(0, h.index + 1);
      const nextStack = [...truncated, nextObjects];
      const overflow = nextStack.length - MAX_HISTORY;
      const trimmed = overflow > 0 ? nextStack.slice(overflow) : nextStack;
      return { stack: trimmed, index: trimmed.length - 1 };
    });
  }, []);

  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;
  const undo = useCallback(() => setHistory((h) => (h.index > 0 ? { ...h, index: h.index - 1 } : h)), []);
  const redo = useCallback(() => setHistory((h) => (h.index < h.stack.length - 1 ? { ...h, index: h.index + 1 } : h)), []);

  const nextId = useCallback(() => nextIdRef.current++, []);
  const nextZ = useCallback(() => nextZRef.current++, []);

  return { objects, commit, undo, redo, canUndo, canRedo, reset, nextId, nextZ };
}
