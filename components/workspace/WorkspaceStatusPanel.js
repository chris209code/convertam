'use client';

import { useState } from 'react';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import { getTool } from '@/lib/tools-config';

function toolLabel(slug) {
  if (!slug) return null;
  return getTool(slug)?.title || slug;
}

// Compact "you're inside an active workspace" indicator — just the active
// state, the visible operation history, and Restore Original. Document
// identity, current tool, grouped navigation and Close Workspace all live
// in WorkspaceSidebar now (Phase 2) so this panel doesn't repeat them; it
// stays deliberately small and keeps working exactly the same on mobile,
// where the sidebar is tucked behind a drawer trigger instead of always
// visible. `onRestoreOriginal` is supplied by the calling tool so it can
// reload its own local editor state afterward.
export default function WorkspaceStatusPanel({ onRestoreOriginal }) {
  const { session } = useDocumentSession();
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);

  if (session.status !== 'active' || !session.document) return null;
  const { history } = session;

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

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, background: '#F8FAFC', padding: '10px 14px', marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.03em', color: '#059669', textTransform: 'uppercase' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          Workspace Active
        </span>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.74rem', color: '#64748B', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
        >
          {history.length} operation{history.length === 1 ? '' : 's'} completed {expanded ? '▾' : '▸'}
        </button>
        {history.length > 0 && (
          <button
            onClick={handleRestore}
            disabled={busy}
            style={{ marginLeft: 'auto', padding: '5px 10px', borderRadius: 7, border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontSize: '0.72rem', fontWeight: 600, cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit' }}
          >
            ↺ Restore Original
          </button>
        )}
      </div>

      {expanded && (
        <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <li style={{ fontSize: '0.75rem', color: '#334155' }}>✓ Uploaded</li>
          {history.map((entry) => (
            <li key={entry.id} style={{ fontSize: '0.75rem', color: '#334155' }}>
              ✓ {entry.label || toolLabel(entry.toolSlug) || 'Edited'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
