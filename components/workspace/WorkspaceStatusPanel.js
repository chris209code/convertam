'use client';

import { useState } from 'react';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import { getTool } from '@/lib/tools-config';

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function toolLabel(slug) {
  if (!slug) return null;
  return getTool(slug)?.title || slug;
}

// Compact "you're inside an active workspace" status strip — document
// identity, size, current tool, and a visible history of completed
// operations, plus Restore Original / Close Workspace controls. Renders
// nothing outside an active session. `onRestoreOriginal`/`onClose` are
// supplied by the calling tool so it can reload its own local editor state
// after either action (the session itself only tracks the document bytes).
export default function WorkspaceStatusPanel({ onRestoreOriginal, onClose }) {
  const { session } = useDocumentSession();
  const [busy, setBusy] = useState(false);

  if (session.status !== 'active' || !session.document) return null;
  const { document: doc, history, currentTool } = session;

  async function handleRestore() {
    if (busy) return;
    if (!window.confirm('Restore the original uploaded document? Changes made in this workspace will no longer be applied.')) return;
    setBusy(true);
    try {
      await onRestoreOriginal?.();
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    if (!window.confirm('Close this workspace? Your document will no longer be carried between tools.')) return;
    onClose?.();
  }

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, background: '#F8FAFC', padding: '14px 16px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.03em', color: '#059669', textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          Workspace Active
        </span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc.name}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', fontSize: '0.74rem', color: '#64748B', marginBottom: 10 }}>
        {doc.pageCount != null && <span>{doc.pageCount} page{doc.pageCount === 1 ? '' : 's'}</span>}
        <span>{formatBytes(doc.sizeBytes)}</span>
        {currentTool && <span>Current tool: <strong style={{ color: '#334155' }}>{toolLabel(currentTool)}</strong></span>}
        <span>{history.length} operation{history.length === 1 ? '' : 's'} completed</span>
      </div>

      {history.length > 0 && (
        <ul style={{ listStyle: 'none', margin: '0 0 10px', padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <li style={{ fontSize: '0.75rem', color: '#334155' }}>✓ Uploaded</li>
          {history.map((entry) => (
            <li key={entry.id} style={{ fontSize: '0.75rem', color: '#334155' }}>
              ✓ {entry.label || toolLabel(entry.toolSlug) || 'Edited'}
            </li>
          ))}
        </ul>
      )}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {history.length > 0 && (
          <button
            onClick={handleRestore}
            disabled={busy}
            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontSize: '0.74rem', fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}
          >
            ↺ Restore Original
          </button>
        )}
        <button
          onClick={handleClose}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Close Workspace
        </button>
      </div>
    </div>
  );
}
