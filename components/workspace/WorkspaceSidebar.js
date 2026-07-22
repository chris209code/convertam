'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import { tools, getTool } from '@/lib/tools-config';
import { canPullSessionDocument, isDestinationOnly } from '@/lib/workspace/toolCompatibility';

function toolLabel(slug) {
  if (!slug) return null;
  return getTool(slug)?.title || slug;
}

const GROUPS = [
  { id: 'edit', label: 'Edit', icon: '✏️' },
  { id: 'organize', label: 'Organize', icon: '📂' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'optimize', label: 'Optimize', icon: '⚡' },
  { id: 'export', label: 'Export', icon: '⬇️' },
];

function groupedTools() {
  return GROUPS.map((g) => ({
    ...g,
    tools: tools.filter((t) => t.workspaceGroup?.includes(g.id)),
  })).filter((g) => g.tools.length > 0);
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadCurrentDocument(session) {
  if (!session.document) return;
  const blob = new Blob([session.document.bytes], { type: session.document.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = session.document.name;
  a.click();
  URL.revokeObjectURL(url);
}

function ToolLink({ tool, active, onNavigate }) {
  const pullable = canPullSessionDocument(tool.slug);
  const destinationOnly = isDestinationOnly(tool.slug);
  const note = !pullable ? (destinationOnly ? 'opens with a new upload' : 'needs a different file type') : null;

  return (
    <Link
      href={`/${tool.slug}`}
      onClick={onNavigate}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8,
        textDecoration: 'none', fontSize: '0.8rem', fontWeight: active ? 700 : 500,
        color: active ? '#1D4ED8' : note ? '#94A3B8' : '#334155',
        background: active ? '#EFF6FF' : 'transparent',
      }}
    >
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tool.title}</span>
      {note && <span style={{ fontSize: '0.62rem', color: '#B0B8C4', flexShrink: 0 }}>{note}</span>}
    </Link>
  );
}

function SidebarContent({ session, onNavigate, onClose, onRestoreOriginal }) {
  const doc = session.document;
  const groups = groupedTools();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { history } = session;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #EEF1F5' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.03em', color: '#059669', textTransform: 'uppercase', marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
          Workspace
        </div>
        <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {doc?.name}
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>
          {doc?.pageCount != null ? `${doc.pageCount} page${doc.pageCount === 1 ? '' : 's'} · ` : ''}{formatBytes(doc?.sizeBytes)}
        </div>
      </div>

      {/* The one place operation history + Restore Original live — kept out
          of every tool page itself so document status isn't asserted twice. */}
      {history.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #EEF1F5' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setHistoryOpen((v) => !v)}
              style={{ background: 'none', border: 'none', padding: 0, fontSize: '0.72rem', color: '#64748B', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              {history.length} operation{history.length === 1 ? '' : 's'} {historyOpen ? '▾' : '▸'}
            </button>
            <button
              onClick={onRestoreOriginal}
              style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: 6, border: '1px solid #E2E8F0', background: 'white', color: '#334155', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              ↺ Restore
            </button>
          </div>
          {historyOpen && (
            <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <li style={{ fontSize: '0.72rem', color: '#334155' }}>✓ Uploaded</li>
              {history.map((entry) => (
                <li key={entry.id} style={{ fontSize: '0.72rem', color: '#334155' }}>
                  ✓ {entry.label || toolLabel(entry.toolSlug) || 'Edited'}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
        {groups.map((g) => (
          <div key={g.id} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.66rem', fontWeight: 700, letterSpacing: '0.04em', color: '#94A3B8', textTransform: 'uppercase', padding: '0 10px', marginBottom: 4 }}>
              <span aria-hidden="true">{g.icon}</span>{g.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {g.tools.map((t) => (
                <ToolLink key={t.slug} tool={t} active={session.currentTool === t.slug} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #EEF1F5', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => downloadCurrentDocument(session)}
          style={{ padding: '9px 12px', borderRadius: 9, border: 'none', background: '#2563EB', color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ⬇ Download Current PDF
        </button>
        <button
          onClick={onClose}
          style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Close Workspace
        </button>
      </div>
    </div>
  );
}

// Appears only when a Document Session is active — a cold visitor with no
// session sees the page exactly as before (see WorkspaceLayoutShell, the
// only place this component is actually mounted). Desktop: sticky in-flow
// column, mirroring QuickGuideTab's right-side split-screen pattern but on
// the left. Mobile: a bottom-sheet drawer behind a small floating trigger,
// positioned bottom-left so it never collides with the Quick Guide trigger
// (top-right) or the Feedback tab (mid-right).
export default function WorkspaceSidebar() {
  const { session, endSession, restoreOriginal } = useDocumentSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (session.status !== 'active' || !session.document) return null;

  // Closing from the sidebar can happen from any tool page, so there's no
  // single local UI state to reset surgically — a reload is the simplest
  // reliable way to guarantee every tool lands back on its cold-visit view.
  function handleClose() {
    if (!window.confirm('Close this workspace? Your document will no longer be carried between tools.')) return;
    endSession();
    window.location.reload();
  }

  // Same reasoning as Close: restoring reverts the session document, and a
  // reload is the simplest reliable way for whichever tool is on screen to
  // pick that up — the same recovery path already proven for hard refresh.
  function handleRestoreOriginal() {
    if (!window.confirm('Restore the original uploaded document? Changes made in this workspace will no longer be applied.')) return;
    restoreOriginal().then(() => window.location.reload());
  }

  return (
    <>
      <div
        className="hidden md:block md:sticky md:z-[1001] md:flex-shrink-0 md:w-[248px] md:border-r md:border-[#E2E6ED] md:top-16 md:self-start md:h-[calc(100vh-64px)]"
        style={{ background: '#FAFBFC' }}
      >
        <SidebarContent session={session} onClose={handleClose} onRestoreOriginal={handleRestoreOriginal} />
      </div>

      {/* Mobile trigger pill — z-index kept above QuickGuideTab's (999/1001)
          so the Quick Guide's own auto-opening drawer, which is a
          full-viewport fixed overlay, never permanently blocks this. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed bottom-5 left-5 z-[1010] flex items-center gap-2 bg-[#0F172A] text-white border-none rounded-full cursor-pointer shadow-lg px-4 py-2.5 text-[13px] font-semibold"
      >
        <span aria-hidden="true">📄</span>
        <span>Workspace</span>
      </button>

      {/* Mobile bottom sheet */}
      <div className={`md:hidden fixed inset-0 z-[1011] ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/30 transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
        <div
          className={`absolute left-0 right-0 bottom-0 h-[75vh] rounded-t-2xl shadow-2xl overflow-hidden transition-transform duration-300 ease-out ${mobileOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ background: '#FAFBFC' }}
        >
          {/* h-[75vh] (not max-h) is required: SidebarContent's height:100%
              only resolves against a definite parent height per the CSS
              spec — a max-height-only clamp doesn't count, which otherwise
              let content overflow the sheet and pushed the footer buttons
              off-screen. */}
          <SidebarContent session={session} onNavigate={() => setMobileOpen(false)} onClose={handleClose} onRestoreOriginal={handleRestoreOriginal} />
        </div>
      </div>
    </>
  );
}
