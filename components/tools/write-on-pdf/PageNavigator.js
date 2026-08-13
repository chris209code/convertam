'use client';

import { useEffect, useRef, useState } from 'react';

const THUMB_WIDTH = 64;

// Small canvas-drawImage thumbnail, the same technique as the shared
// ThumbnailRail — not reused directly, since that component is built around
// drag-to-reorder state (pageOrder/onReorder) that Write on PDF has no use
// for (this tool never reorders pages), and bolting a no-op onReorder onto
// it would leave a draggable handle that silently does nothing.
function Thumb({ page }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c || !page) return;
    const scale = THUMB_WIDTH / page.width;
    c.width = THUMB_WIDTH;
    c.height = page.height * scale;
    c.getContext('2d').drawImage(page.canvas, 0, 0, c.width, c.height);
  }, [page]);
  return <canvas ref={ref} style={{ width: THUMB_WIDTH, height: 'auto', display: 'block', borderRadius: 4 }} />;
}

// Prev/Next, a type-a-page-number jump, and a horizontal thumbnail strip —
// click any thumbnail to jump straight there. Rendered as a horizontal
// scrollable row above the stage (not a left-hand sidebar like Annotate
// PDF's ThumbnailRail) so it doesn't need a two-column layout change and
// degrades to a simple horizontal scroll on mobile instead of squeezing the
// canvas.
export default function PageNavigator({ pages, activePage, onSelectPage }) {
  const [jumpValue, setJumpValue] = useState(String(activePage + 1));

  useEffect(() => { setJumpValue(String(activePage + 1)); }, [activePage]);

  if (pages.length <= 1) return null;

  function commitJump() {
    const n = parseInt(jumpValue, 10);
    if (Number.isFinite(n) && n >= 1 && n <= pages.length) onSelectPage(n - 1);
    else setJumpValue(String(activePage + 1));
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <button className="btn-ghost-sm" disabled={activePage === 0} onClick={() => onSelectPage(activePage - 1)}>← Prev</button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#64748B' }}>
          Page
          <input
            type="text"
            inputMode="numeric"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value.replace(/[^0-9]/g, ''))}
            onBlur={commitJump}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
            aria-label="Jump to page"
            style={{ width: 40, textAlign: 'center', padding: '3px 4px', borderRadius: 6, border: '1px solid #E2E8F0', fontFamily: 'inherit', fontSize: '0.78rem' }}
          />
          of {pages.length}
        </span>
        <button className="btn-ghost-sm" disabled={activePage === pages.length - 1} onClick={() => onSelectPage(activePage + 1)}>Next →</button>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {pages.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelectPage(i)}
            aria-current={activePage === i}
            aria-label={`Go to page ${i + 1}`}
            style={{
              flexShrink: 0, cursor: 'pointer', border: '2px solid', borderColor: activePage === i ? '#2563EB' : 'transparent',
              borderRadius: 8, padding: 3, background: activePage === i ? '#EFF6FF' : 'transparent',
            }}
          >
            <Thumb page={p} />
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#64748B', textAlign: 'center', marginTop: 2 }}>{i + 1}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
