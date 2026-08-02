'use client';

import { describeObject, isCommentBearing, typeGroupLabel } from '@/lib/annotate/reviewLabel';

const TYPE_ICONS = {
  highlight: '🖍️', draw: '✏️', note: '📝', text: '🅰️', underline: '𝐔', strikethrough: 'S̶',
  callout: '💬', shape: '⬛', image: '🖼️', numbering: '🔢', signature: '✍️', stamp: '🖋️',
};

function rowStyle() {
  return {
    display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 8,
    background: 'white', border: '1px solid #E2E8F0', cursor: 'pointer',
  };
}

// Right panel "Review" tab: a summary dashboard (total annotations, a
// per-type breakdown, and an unresolved count) sits above every annotation
// in the document grouped by page, click-to-jump, with a resolve toggle on
// comment-bearing rows (note/text/callout/signature). `objects` is the
// FULL cross-page array (not just the active page's) — this is the one
// place in the workspace that needs to see the whole document at once.
export default function ReviewPanel({ objects, pageOrder, onJumpToObject, onToggleResolved }) {
  const total = objects.length;
  const unresolved = objects.filter((o) => isCommentBearing(o) && !o.resolved).length;

  const byGroup = new Map();
  objects.forEach((o) => {
    const label = typeGroupLabel(o);
    byGroup.set(label, (byGroup.get(label) || 0) + 1);
  });
  const groups = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);

  const byPage = new Map();
  objects.forEach((o) => {
    if (!byPage.has(o.page)) byPage.set(o.page, []);
    byPage.get(o.page).push(o);
  });

  if (total === 0) {
    return <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>No annotations yet — this tab fills in as you mark up the document.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Review Summary</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A' }}>{total} annotation{total === 1 ? '' : 's'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {groups.map(([label, count]) => (
            <div key={label} style={{ fontSize: '0.78rem', color: '#475569', display: 'flex', justifyContent: 'space-between' }}>
              <span>{label}</span>
              <span style={{ fontWeight: 700, color: '#334155' }}>{count}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 4, paddingTop: 8, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
          <span style={{ color: unresolved > 0 ? '#B45309' : '#059669', fontWeight: 700 }}>
            {unresolved > 0 ? `⚠ ${unresolved} unresolved` : '✓ All resolved'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {pageOrder.map((origIdx, position) => {
          const pageObjs = byPage.get(origIdx);
          if (!pageObjs || !pageObjs.length) return null;
          return (
            <div key={origIdx}>
              <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Page {position + 1}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[...pageObjs].sort((a, b) => a.z - b.z).map((o) => (
                  <div key={o.id} onClick={() => onJumpToObject(origIdx, o.id)} style={{ ...rowStyle(), opacity: o.hidden ? 0.55 : 1 }}>
                    <span aria-hidden="true" style={{ flexShrink: 0 }}>{TYPE_ICONS[o.type] || '•'}</span>
                    <span style={{ flex: 1, fontSize: '0.78rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {describeObject(o)}
                    </span>
                    {isCommentBearing(o) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleResolved(origIdx, o.id); }}
                        title={o.resolved ? 'Mark unresolved' : 'Mark resolved'}
                        style={{
                          flexShrink: 0, border: '1px solid', borderColor: o.resolved ? '#86EFAC' : '#E2E8F0',
                          background: o.resolved ? '#F0FDF4' : 'white', color: o.resolved ? '#059669' : '#94A3B8',
                          borderRadius: 6, padding: '2px 6px', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        {o.resolved ? '✓ Resolved' : 'Resolve'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
