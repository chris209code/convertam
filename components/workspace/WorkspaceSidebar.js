'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useDocumentSession } from '@/components/document-session/DocumentSessionProvider';
import { tools, getTool } from '@/lib/tools-config';
import { canPullSessionDocument, isDestinationOnly, PUSH_ONLY_TOOLS } from '@/lib/workspace/toolCompatibility';
import { SectionIcon } from '@/components/icons/ToolIconSystem';

function toolLabel(slug) {
  if (!slug) return null;
  return getTool(slug)?.title || slug;
}

const GROUPS = [
  { id: 'edit', label: 'Edit' },
  { id: 'organize', label: 'Organize' },
  { id: 'security', label: 'Security' },
  { id: 'optimize', label: 'Optimize' },
  { id: 'export', label: 'Export' },
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

function ToolLink({ tool, active, onNavigate, session, doc }) {
  const pullable = canPullSessionDocument(tool.slug);
  const destinationOnly = isDestinationOnly(tool.slug);
  const note = !pullable ? (destinationOnly ? 'opens with a new upload' : 'needs a different file type') : null;

  // The one real file-type mismatch today: Images to PDF takes images, not a
  // PDF. Rather than silently letting the click through (or just the small
  // muted note), remind the visitor and offer the honest bridge — converting
  // their current PDF to images first — without blocking their original
  // intent if they'd rather start fresh with new images anyway.
  function handleClick(e) {
    if (PUSH_ONLY_TOOLS.includes(tool.slug) && doc?.mimeType === 'application/pdf') {
      const wantsConversion = window.confirm(
        `${doc.name} is a PDF — ${tool.title} works with image files (JPG/PNG), not PDFs.\n\nConvert it to images first?`
      );
      if (wantsConversion) {
        e.preventDefault();
        onNavigate?.();
        window.location.href = '/pdf-to-png';
        return;
      }
    }
    onNavigate?.();
  }

  return (
    <Link
      href={`/${tool.slug}`}
      onClick={handleClick}
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
              <SectionIcon id={g.id} suite="pdf" size={16} />{g.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {g.tools.map((t) => (
                <ToolLink key={t.slug} tool={t} active={session.currentTool === t.slug} onNavigate={onNavigate} session={session} doc={doc} />
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

// Desktop-only: a compact icon rail for the tool groups, with the specific
// tools inside a group revealed in a flyout panel on click — rather than
// every tool name always being listed inline. Document identity and
// history/restore stay exactly as in SidebarContent above them; only the
// tool-navigation part of the column changes shape. Mobile keeps the full
// always-expanded list (SidebarContent) since a flyout doesn't translate
// well to a touch drawer without its own dedicated interaction design.
function DesktopRail({ session, onClose, onRestoreOriginal }) {
  const doc = session.document;
  const groups = groupedTools();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const railRef = useRef(null);
  const { history } = session;
  const currentGroupId = groups.find((g) => g.tools.some((t) => t.slug === session.currentTool))?.id;
  const activeGroup = groups.find((g) => g.id === activeGroupId);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (railRef.current && !railRef.current.contains(e.target)) setActiveGroupId(null);
    }
    if (activeGroupId) document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [activeGroupId]);

  return (
    <div ref={railRef} style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {groups.map((g) => {
          const isOpen = activeGroupId === g.id;
          const isCurrent = currentGroupId === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setActiveGroupId(isOpen ? null : g.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 10px', marginBottom: 2,
                borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                background: isOpen ? '#E2E8F0' : isCurrent ? '#EFF6FF' : 'transparent',
                color: isCurrent ? '#1D4ED8' : '#334155', fontWeight: isCurrent ? 700 : 600, fontSize: '0.8rem',
              }}
            >
              <SectionIcon id={g.id} suite="pdf" size={18} />
              <span style={{ flex: 1 }}>{g.label}</span>
              <span style={{ fontSize: '0.62rem', color: '#94A3B8' }}>{isOpen ? '▾' : '▸'}</span>
            </button>
          );
        })}
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

      {activeGroup && (
        <div
          style={{
            position: 'fixed', left: 248, top: 64, width: 260, maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
            background: 'white', borderRight: '1px solid #E2E6ED', borderBottom: '1px solid #E2E6ED',
            boxShadow: '6px 6px 20px rgba(15,23,42,0.12)', zIndex: 1002, borderBottomRightRadius: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #EEF1F5' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', color: '#94A3B8', textTransform: 'uppercase' }}>
              {activeGroup.icon} {activeGroup.label}
            </span>
            <button
              onClick={() => setActiveGroupId(null)}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem', lineHeight: 1, padding: 2 }}
            >
              ×
            </button>
          </div>
          <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activeGroup.tools.map((t) => (
              <ToolLink key={t.slug} tool={t} active={session.currentTool === t.slug} onNavigate={() => setActiveGroupId(null)} session={session} doc={doc} />
            ))}
          </div>
        </div>
      )}
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
        <DesktopRail session={session} onClose={handleClose} onRestoreOriginal={handleRestoreOriginal} />
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
