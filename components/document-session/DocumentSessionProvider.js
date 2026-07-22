'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { readSessionRecord, writeSessionRecord, clearSessionRecord } from '@/lib/documentSession/idbStore';

// The live Document Session — one document, shared in memory across every
// session-compatible tool page. app/layout.js mounts this once at the root;
// because client-side <Link> navigation between tool routes doesn't remount
// the root layout, this Context (and the document it holds) survives moving
// from tool to tool. A cold visitor who never uploads into a compatible
// tool never creates a session at all, so this is purely additive — see the
// architecture plan at /root/.claude/plans/radiant-dazzling-oasis.md.

const SESSION_VERSION = 1;
const WRITE_DEBOUNCE_MS = 500;

const DocumentSessionContext = createContext(null);

function uuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `sess-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

// Bytes, not a File, are already in hand at every call site here — PDFDocument
// happily loads from either, so this stays a thin local helper rather than
// forcing a round trip through lib/pdf-tools.js's File-shaped getPdfPageCount.
// Only ever attempted for actual PDFs — Document Translator is the first
// tool to hold a non-PDF file in the session, and there's no point handing
// DOCX/PPTX/TXT bytes to pdf-lib just to watch it fail and swallow the error.
async function getPageCount(bytes, mimeType) {
  if (mimeType !== 'application/pdf') return null;
  try {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    return doc.getPageCount();
  } catch {
    return null;
  }
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

// Session document `type` — used by the sidebar/pull-card UI to describe
// what's active without every caller re-deriving it from a raw mimeType.
function mimeTypeToType(mimeType) {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === DOCX_MIME) return 'docx';
  if (mimeType === PPTX_MIME) return 'pptx';
  if (mimeType === 'text/plain') return 'txt';
  return 'unknown';
}

function idleState() {
  return { sessionId: null, status: 'idle', document: null, currentTool: null, history: [] };
}

export function DocumentSessionProvider({ children }) {
  const [session, setSession] = useState(idleState);
  const [hydrated, setHydrated] = useState(false);
  const writeTimerRef = useRef(null);

  // Hydrate once from IndexedDB — recovers a session across a hard refresh,
  // back button, or tab close. A version mismatch or missing bytes just
  // discards rather than crashing.
  useEffect(() => {
    let cancelled = false;
    readSessionRecord().then((record) => {
      if (cancelled) return;
      if (record && record.version === SESSION_VERSION && record.status !== 'idle' && record.document?.bytes) {
        setSession({
          sessionId: record.sessionId,
          status: 'active',
          document: {
            ...record.document,
            bytes: new Uint8Array(record.document.bytes),
            originalBytes: record.document.originalBytes ? new Uint8Array(record.document.originalBytes) : new Uint8Array(record.document.bytes),
          },
          currentTool: record.currentTool || null,
          history: record.history || [],
        });
      }
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Write-behind sync — debounced and best-effort, never blocks the UI.
  useEffect(() => {
    if (!hydrated) return undefined;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    if (session.status !== 'active') {
      clearSessionRecord();
      return undefined;
    }
    writeTimerRef.current = setTimeout(() => {
      writeSessionRecord({
        version: SESSION_VERSION,
        status: session.status,
        sessionId: session.sessionId,
        document: session.document,
        currentTool: session.currentTool,
        history: session.history,
        updatedAt: Date.now(),
      });
    }, WRITE_DEBOUNCE_MS);
    return () => clearTimeout(writeTimerRef.current);
  }, [session, hydrated]);

  const startSession = useCallback(async (file, { toolSlug } = {}) => {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = file.type || 'application/pdf';
    const pageCount = await getPageCount(bytes, mimeType);
    const now = Date.now();
    setSession({
      sessionId: uuid(),
      status: 'active',
      document: {
        bytes,
        // Immutable snapshot of exactly what was uploaded, kept alongside the
        // working copy so "Restore Original" can always get back to it —
        // deliberately separate from tool-level Undo/Redo (see restoreOriginal).
        originalBytes: bytes,
        originalPageCount: pageCount,
        name: file.name,
        type: mimeTypeToType(mimeType),
        mimeType,
        pageCount,
        sizeBytes: bytes.byteLength,
        hasTextLayer: true,
        createdAt: now,
        updatedAt: now,
      },
      currentTool: toolSlug || null,
      history: [],
    });
  }, []);

  const updateDocument = useCallback(async (newBytes, { toolSlug, label, hasTextLayer, mimeType: newMimeType, name: newName } = {}) => {
    const bytes = newBytes instanceof Uint8Array ? newBytes : new Uint8Array(newBytes);
    // Most tools produce a same-format result (PDF in, PDF out) and never
    // pass mimeType/name — Document Translator is the one caller that can
    // genuinely change format (e.g. DOCX in, translated DOCX out with a
    // renamed file), so both are optional overrides layered onto whatever
    // the session already holds.
    const pageCount = await getPageCount(bytes, newMimeType || 'application/pdf');
    const now = Date.now();
    setSession((prev) => {
      if (prev.status !== 'active' || !prev.document) return prev;
      const mimeType = newMimeType || prev.document.mimeType;
      const entry = {
        id: uuid(), toolSlug, label, timestamp: now,
        resultSizeBytes: bytes.byteLength, resultPageCount: pageCount,
      };
      return {
        ...prev,
        currentTool: toolSlug || prev.currentTool,
        document: {
          ...prev.document,
          bytes,
          name: newName || prev.document.name,
          type: newMimeType ? mimeTypeToType(mimeType) : prev.document.type,
          mimeType,
          pageCount,
          sizeBytes: bytes.byteLength,
          hasTextLayer: hasTextLayer === undefined ? prev.document.hasTextLayer : hasTextLayer,
          updatedAt: now,
        },
        history: [...prev.history, entry],
      };
    });
  }, []);

  const discardSession = useCallback(() => {
    setSession(idleState());
    clearSessionRecord();
  }, []);

  // Ends the workspace outright — used only for an explicit "Close Workspace"
  // action or starting a genuinely new document. Downloading a copy does NOT
  // call this: the workspace stays active until the user closes it, starts a
  // new document, or discards it, matching how desktop document editors work.
  const endSession = useCallback(() => {
    setSession(idleState());
    clearSessionRecord();
  }, []);

  const setCurrentTool = useCallback((toolSlug) => {
    setSession((prev) => (prev.status === 'active' ? { ...prev, currentTool: toolSlug } : prev));
  }, []);

  // Resets the working document back to exactly what was first uploaded —
  // distinct from a tool's own Undo/Redo, and always available for the life
  // of the session regardless of which tool made the destructive edit.
  // Returns a File built from the restored bytes so the calling tool can
  // immediately reload its own view without waiting on a state re-render.
  const restoreOriginal = useCallback(async () => {
    if (session.status !== 'active' || !session.document?.originalBytes) return null;
    const { originalBytes, originalPageCount, name, mimeType } = session.document;
    const now = Date.now();
    setSession((prev) => (prev.status === 'active' ? {
      ...prev,
      document: {
        ...prev.document,
        bytes: originalBytes,
        pageCount: originalPageCount,
        sizeBytes: originalBytes.byteLength,
        hasTextLayer: true,
        updatedAt: now,
      },
      history: [...prev.history, {
        id: uuid(), toolSlug: null, label: 'Restored original', timestamp: now,
        resultSizeBytes: originalBytes.byteLength, resultPageCount: originalPageCount,
      }],
    } : prev));
    return new File([originalBytes], name, { type: mimeType });
  }, [session]);

  const getDocumentAsFile = useCallback(() => {
    if (!session.document) return null;
    return new File([session.document.bytes], session.document.name, { type: session.document.mimeType });
  }, [session.document]);

  const value = useMemo(() => ({
    session, hydrated, startSession, updateDocument, discardSession, endSession, setCurrentTool, getDocumentAsFile, restoreOriginal,
  }), [session, hydrated, startSession, updateDocument, discardSession, endSession, setCurrentTool, getDocumentAsFile, restoreOriginal]);

  return (
    <DocumentSessionContext.Provider value={value}>
      {children}
    </DocumentSessionContext.Provider>
  );
}

export function useDocumentSession() {
  const ctx = useContext(DocumentSessionContext);
  if (!ctx) throw new Error('useDocumentSession must be used within a DocumentSessionProvider');
  return ctx;
}
