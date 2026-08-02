'use client';

import { useEffect, useRef, useState } from 'react';

const THUMB_WIDTH = 96;

function Thumbnail({ page, rotation }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !page) return;
    const scale = THUMB_WIDTH / page.width;
    const w = THUMB_WIDTH;
    const h = page.height * scale;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(page.canvas, 0, 0, w, h);
  }, [page]);
  return (
    <canvas
      ref={canvasRef}
      style={{
        width: THUMB_WIDTH, height: 'auto', display: 'block', borderRadius: 4,
        boxShadow: '0 1px 4px rgba(15,23,42,0.18)',
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
      }}
    />
  );
}

// Left panel: one thumbnail per page, in the user's chosen display order
// (pageOrder — a list of original page indices, decoupled from the objects
// array so reordering never has to touch annotation data). Click jumps to
// a page; drag-and-drop reorders it (native HTML5 DnD — no library, same
// "hand-roll it with browser primitives" approach as the rest of this tool).
export default function ThumbnailRail({ pages, pageOrder, activePage, pageRotations, onSelectPage, onReorder }) {
  const [dragPos, setDragPos] = useState(null);

  if (!pages.length) return null;

  function handleDrop(pos) {
    if (dragPos === null || dragPos === pos) { setDragPos(null); return; }
    const next = [...pageOrder];
    const [moved] = next.splice(dragPos, 1);
    next.splice(pos, 0, moved);
    onReorder(next);
    setDragPos(null);
  }

  return (
    <div style={{ width: 120, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 680, overflowY: 'auto', paddingRight: 4 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pages</div>
      {pageOrder.map((origIdx, pos) => (
        <div
          key={origIdx}
          draggable
          onDragStart={() => setDragPos(pos)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(pos)}
          onDragEnd={() => setDragPos(null)}
          onClick={() => onSelectPage(origIdx)}
          role="button"
          tabIndex={0}
          aria-current={activePage === origIdx}
          style={{
            cursor: 'grab',
            border: '2px solid', borderColor: activePage === origIdx ? '#2563EB' : 'transparent',
            borderRadius: 8, padding: 4,
            background: activePage === origIdx ? '#EFF6FF' : 'transparent',
            opacity: dragPos === pos ? 0.4 : 1,
          }}
        >
          <Thumbnail page={pages[origIdx]} rotation={pageRotations[origIdx] || 0} />
          <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#64748B', textAlign: 'center', marginTop: 4 }}>{pos + 1}</div>
        </div>
      ))}
    </div>
  );
}
