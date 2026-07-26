'use client';

import { useRef } from 'react';

const TYPE_STYLE = {
  added: { bg: '#DCFCE7', border: '#86EFAC', text: '#166534', label: 'Added' },
  removed: { bg: '#FEE2E2', border: '#FECACA', text: '#991B1B', label: 'Removed' },
  modified: { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E', label: 'Modified' },
};

function pageLabel(entry) {
  const a = entry.pageA != null ? `Original p.${entry.pageA + 1}` : null;
  const b = entry.pageB != null ? `Revised p.${entry.pageB + 1}` : null;
  return [a, b].filter(Boolean).join(' / ');
}

export function WordDiffLine({ wordDiff }) {
  return (
    <>
      {wordDiff.map((w, i) => {
        if (w.type === 'same') return <span key={i}>{w.text}</span>;
        if (w.type === 'added') return <span key={i} style={{ background: '#DCFCE7', color: '#166534' }}>{w.text}</span>;
        return <span key={i} style={{ background: '#FEE2E2', color: '#991B1B', textDecoration: 'line-through' }}>{w.text}</span>;
      })}
    </>
  );
}

export function PageThumb({ image, pageNumber, highlighted, widthPx, placeholder }) {
  if (!image) {
    return (
      <div style={{ width: widthPx, minHeight: widthPx * 1.3, border: '1px dashed #CBD5E1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC' }}>
        <p style={{ fontSize: '0.7rem', color: '#94A3B8', textAlign: 'center', padding: 8 }}>{placeholder || 'No page'}</p>
      </div>
    );
  }
  return (
    <div>
      <img
        src={image.dataUrl}
        alt={`Page ${pageNumber}`}
        style={{ width: widthPx, display: 'block', border: highlighted ? '3px solid #F59E0B' : '1px solid #E2E8F0', borderRadius: 8 }}
      />
      <p style={{ fontSize: '0.7rem', color: '#64748B', textAlign: 'center', margin: '4px 0 0' }}>Page {pageNumber}{highlighted ? ' · changed' : ''}</p>
    </div>
  );
}

export function DiffSummaryView({ summary, changes, currentChangeIndex, onJumpToChange, onPrev, onNext, onDownloadReport, reportBusy }) {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <StatChip label="Added" value={summary.added} color="#166534" bg="#DCFCE7" />
        <StatChip label="Removed" value={summary.removed} color="#991B1B" bg="#FEE2E2" />
        <StatChip label="Modified" value={summary.modified} color="#92400E" bg="#FEF3C7" />
        <StatChip label="Pages affected" value={summary.pagesAffectedCount} color="#1E3A8A" bg="#DBEAFE" />
      </div>

      {(summary.pageAdditions.length > 0 || summary.pageRemovals.length > 0) && (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, marginBottom: 14, fontSize: '0.8rem', color: '#475569' }}>
          {summary.pageRemovals.length > 0 && (
            <p style={{ margin: '0 0 4px' }}>Original page{summary.pageRemovals.length > 1 ? 's' : ''} {summary.pageRemovals.map((p) => p + 1).join(', ')} have no matching content in the revised document.</p>
          )}
          {summary.pageAdditions.length > 0 && (
            <p style={{ margin: 0 }}>Revised page{summary.pageAdditions.length > 1 ? 's' : ''} {summary.pageAdditions.map((p) => p + 1).join(', ')} have no matching content in the original document.</p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={onPrev} disabled={changes.length === 0} style={navBtnStyle}>← Previous</button>
          <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{changes.length === 0 ? 'No differences' : `Change ${currentChangeIndex + 1} of ${changes.length}`}</span>
          <button onClick={onNext} disabled={changes.length === 0} style={navBtnStyle}>Next →</button>
        </div>
        <button onClick={onDownloadReport} disabled={reportBusy} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #2563EB', background: 'white', color: '#2563EB', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
          {reportBusy ? 'Preparing report…' : '⬇ Download Comparison Report'}
        </button>
      </div>

      <div style={{ maxHeight: 440, overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: 10 }}>
        {changes.length === 0 && (
          <p style={{ padding: 16, fontSize: '0.85rem', color: '#64748B', margin: 0 }}>No text differences were detected between these documents.</p>
        )}
        {changes.map((entry, i) => {
          const style = TYPE_STYLE[entry.type];
          return (
            <button
              key={i}
              onClick={() => onJumpToChange(i)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                borderBottom: '1px solid #F1F5F9', background: i === currentChangeIndex ? '#EFF6FF' : 'white',
                border: 'none', borderLeft: i === currentChangeIndex ? '3px solid #2563EB' : '3px solid transparent',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', color: style.text, background: style.bg, padding: '2px 8px', borderRadius: 999 }}>{style.label}</span>
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>{pageLabel(entry)}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', lineHeight: 1.5 }}>
                {entry.type === 'modified' && <WordDiffLine wordDiff={entry.wordDiff} />}
                {entry.type === 'added' && <span style={{ background: '#DCFCE7', color: '#166534' }}>{entry.textB}</span>}
                {entry.type === 'removed' && <span style={{ background: '#FEE2E2', color: '#991B1B', textDecoration: 'line-through' }}>{entry.textA}</span>}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatChip({ label, value, color, bg }) {
  return (
    <div style={{ background: bg, color, borderRadius: 10, padding: '8px 14px', fontSize: '0.78rem', fontWeight: 700 }}>
      {value} <span style={{ fontWeight: 500 }}>{label}</span>
    </div>
  );
}

const navBtnStyle = { padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E8F0', background: 'white', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 };

export function SideBySideView({ imagesA, imagesB, fileNameA, fileNameB, pagesAffectedA, pagesAffectedB, zoom }) {
  const colARef = useRef(null);
  const colBRef = useRef(null);
  const syncing = useRef(false);

  function syncScroll(from, to) {
    if (syncing.current) return;
    syncing.current = true;
    const pct = from.scrollTop / Math.max(1, from.scrollHeight - from.clientHeight);
    to.scrollTop = pct * Math.max(1, to.scrollHeight - to.clientHeight);
    requestAnimationFrame(() => { syncing.current = false; });
  }

  const widthPx = Math.round(220 * (zoom / 100));
  const pageCount = Math.max(imagesA.length, imagesB.length);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {[{ ref: colARef, other: colBRef, images: imagesA, name: fileNameA, affected: pagesAffectedA }, { ref: colBRef, other: colARef, images: imagesB, name: fileNameB, affected: pagesAffectedB }].map((col, ci) => (
        <div key={ci}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', margin: '0 0 8px', textAlign: 'center' }}>{col.name}</p>
          <div
            ref={col.ref}
            onScroll={() => col.other.current && syncScroll(col.ref.current, col.other.current)}
            style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10 }}
          >
            {Array.from({ length: pageCount }).map((_, i) => (
              <PageThumb key={i} image={col.images[i]} pageNumber={i + 1} widthPx={widthPx} highlighted={col.affected.has(i)} placeholder="No page" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function OverlayView({ imagesA, imagesB, pageIndex, onPageChange, blend, onBlendChange, showHeat, onToggleHeat, visualDiff, zoom, visualLayoutEnabled }) {
  const pageCount = Math.min(imagesA.length, imagesB.length);
  const imgA = imagesA[pageIndex];
  const imgB = imagesB[pageIndex];
  const widthPx = Math.round(420 * (zoom / 100));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button onClick={() => onPageChange(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0} style={navBtnStyle}>← Prev page</button>
        <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Page {pageIndex + 1} of {pageCount}</span>
        <button onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))} disabled={pageIndex >= pageCount - 1} style={navBtnStyle}>Next page →</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: widthPx }}>
          {imgA && <img src={imgA.dataUrl} alt="Original" style={{ width: '100%', display: 'block', border: '1px solid #E2E8F0', borderRadius: 8 }} />}
          {imgB && <img src={imgB.dataUrl} alt="Revised" style={{ width: '100%', position: 'absolute', inset: 0, opacity: blend / 100, borderRadius: 8 }} />}
          {showHeat && visualDiff && (
            <div style={{ position: 'absolute', inset: 0 }}>
              {visualDiff.cells.map((cellIdx) => {
                const col = cellIdx % visualDiff.gridW;
                const row = Math.floor(cellIdx / visualDiff.gridW);
                return (
                  <div key={cellIdx} style={{
                    position: 'absolute',
                    left: `${(col / visualDiff.gridW) * 100}%`,
                    top: `${(row / visualDiff.gridH) * 100}%`,
                    width: `${100 / visualDiff.gridW}%`,
                    height: `${100 / visualDiff.gridH}%`,
                    background: 'rgba(220, 38, 38, 0.35)',
                  }} />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 420, margin: '16px auto 0' }}>
        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
          Blend — {blend === 0 ? 'Original' : blend === 100 ? 'Revised' : `${blend}% Revised`}
        </label>
        <input type="range" min="0" max="100" value={blend} onChange={(e) => onBlendChange(Number(e.target.value))} style={{ width: '100%' }} />
        {visualLayoutEnabled ? (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#475569', marginTop: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={showHeat} onChange={(e) => onToggleHeat(e.target.checked)} />
            Highlight areas that differ visually {visualDiff && !visualDiff.differs ? '(none detected on this page)' : ''}
          </label>
        ) : (
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 10 }}>Enable "Also compare visual layout" before comparing to see a difference heat-map here.</p>
        )}
      </div>
    </div>
  );
}

export function PageByPageView({ imagesA, imagesB, pageIndex, onPageChange, pageEntries, zoom }) {
  const pageCount = Math.max(imagesA.length, imagesB.length);
  const widthPx = Math.round(260 * (zoom / 100));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <button onClick={() => onPageChange(Math.max(0, pageIndex - 1))} disabled={pageIndex === 0} style={navBtnStyle}>← Prev page</button>
        <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Page {pageIndex + 1} of {pageCount}</span>
        <button onClick={() => onPageChange(Math.min(pageCount - 1, pageIndex + 1))} disabled={pageIndex >= pageCount - 1} style={navBtnStyle}>Next page →</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textAlign: 'center', margin: '0 0 6px' }}>Original</p>
          <PageThumb image={imagesA[pageIndex]} pageNumber={pageIndex + 1} widthPx={widthPx} placeholder="No such page in original" />
        </div>
        <div>
          <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', textAlign: 'center', margin: '0 0 6px' }}>Revised</p>
          <PageThumb image={imagesB[pageIndex]} pageNumber={pageIndex + 1} widthPx={widthPx} placeholder="No such page in revised" />
        </div>
      </div>

      <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, maxHeight: 260, overflowY: 'auto' }}>
        {pageEntries.length === 0 && <p style={{ padding: 14, fontSize: '0.82rem', color: '#64748B', margin: 0 }}>No text differences on this page.</p>}
        {pageEntries.map((entry, i) => {
          const style = TYPE_STYLE[entry.type];
          return (
            <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '0.66rem', fontWeight: 800, textTransform: 'uppercase', color: style.text, background: style.bg, padding: '2px 7px', borderRadius: 999, marginRight: 8 }}>{style.label}</span>
              <span style={{ fontSize: '0.82rem', color: '#334155' }}>
                {entry.type === 'modified' && <WordDiffLine wordDiff={entry.wordDiff} />}
                {entry.type === 'added' && <span style={{ background: '#DCFCE7', color: '#166534' }}>{entry.textB}</span>}
                {entry.type === 'removed' && <span style={{ background: '#FEE2E2', color: '#991B1B', textDecoration: 'line-through' }}>{entry.textA}</span>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
