'use client';

import { useMemo, useState } from 'react';

const PAGE_SIZE = 100;

const TYPE_BADGE = {
  integer: { label: '123', color: '#7C3AED' },
  decimal: { label: '1.2', color: '#7C3AED' },
  date: { label: 'date', color: '#0E7490' },
  boolean: { label: 'bool', color: '#B45309' },
  text: { label: 'text', color: '#64748B' },
  empty: { label: '—', color: '#94A3B8' },
};

// The shared editable/paginated grid behind CSV Studio's spreadsheet view
// and SQL Studio's results table (read-only there via editable=false).
// Deliberately plain HTML <table> + windowed pagination rather than a
// virtualization library — PAGE_SIZE=100 rows keeps the DOM small without
// adding a dependency, and "Handle reasonably large CSV files without
// freezing the UI" is satisfied by paging, not rendering 50,000 rows at
// once.
export default function DataTable({
  table, editable = false, selectable = false, columnTypes = null,
  onEditCell, onRemoveRows, onRenameColumn, onRemoveColumn, onMoveColumn,
  onSort, sortState,
}) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [editingHeader, setEditingHeader] = useState(null);

  const totalPages = Math.max(1, Math.ceil(table.rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return table.rows.slice(start, start + PAGE_SIZE).map((row, i) => ({ row, index: start + i }));
  }, [table.rows, page]);

  function toggleSelect(idx) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }
  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageRows.every((r) => next.has(r.index));
      pageRows.forEach((r) => (allSelected ? next.delete(r.index) : next.add(r.index)));
      return next;
    });
  }

  if (!table.rows.length && !table.columns.length) {
    return <div className="dt-empty">No data yet — import or paste something to see it here.</div>;
  }

  return (
    <div className="dt-wrap">
      {selectable && selected.size > 0 && (
        <div className="dt-selbar">
          {selected.size} row(s) selected
          <button className="dt-selbar-btn" onClick={() => { onRemoveRows?.([...selected]); setSelected(new Set()); }}>Remove selected</button>
          <button className="dt-selbar-btn dt-selbar-ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      <div className="dt-scroll">
        <table className="dt-table">
          <thead>
            <tr>
              {selectable && (
                <th className="dt-th dt-th-check">
                  <input type="checkbox" checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.index))} onChange={toggleSelectAllOnPage} aria-label="Select all rows on this page" />
                </th>
              )}
              {table.columns.map((col, colIdx) => {
                const type = columnTypes ? columnTypes[col] : null;
                const badge = type ? TYPE_BADGE[type] : null;
                return (
                  <th key={col} className="dt-th">
                    <div className="dt-th-inner">
                      {editingHeader === col ? (
                        <input
                          autoFocus
                          className="dt-th-input"
                          defaultValue={col}
                          onBlur={(e) => { onRenameColumn?.(col, e.target.value.trim()); setEditingHeader(null); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditingHeader(null); }}
                        />
                      ) : (
                        <button className="dt-th-label" onClick={() => onRenameColumn && setEditingHeader(col)} title={onRenameColumn ? 'Click to rename' : col}>{col}</button>
                      )}
                      {badge && <span className="dt-type-badge" style={{ color: badge.color, borderColor: badge.color }}>{badge.label}</span>}
                      {onSort && (
                        <button className="dt-th-icon" onClick={() => onSort(col)} title="Sort" aria-label={`Sort by ${col}`}>
                          {sortState?.column === col ? (sortState.dir === 'asc' ? '▲' : '▼') : '↕'}
                        </button>
                      )}
                      {onMoveColumn && colIdx > 0 && <button className="dt-th-icon" onClick={() => onMoveColumn(colIdx, colIdx - 1)} title="Move left" aria-label={`Move ${col} left`}>←</button>}
                      {onMoveColumn && colIdx < table.columns.length - 1 && <button className="dt-th-icon" onClick={() => onMoveColumn(colIdx, colIdx + 1)} title="Move right" aria-label={`Move ${col} right`}>→</button>}
                      {onRemoveColumn && <button className="dt-th-icon dt-th-danger" onClick={() => onRemoveColumn(col)} title="Remove column" aria-label={`Remove column ${col}`}>×</button>}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ row, index }) => (
              <tr key={index} className={selected.has(index) ? 'dt-row-selected' : ''}>
                {selectable && (
                  <td className="dt-td dt-td-check">
                    <input type="checkbox" checked={selected.has(index)} onChange={() => toggleSelect(index)} aria-label={`Select row ${index + 1}`} />
                  </td>
                )}
                {table.columns.map((col) => (
                  <td key={col} className="dt-td">
                    {editable ? (
                      <input
                        className="dt-cell-input"
                        value={row[col] ?? ''}
                        onChange={(e) => onEditCell?.(index, col, e.target.value)}
                      />
                    ) : (
                      <span className="dt-cell-text">{String(row[col] ?? '')}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="dt-pagination">
          <button className="dt-page-btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</button>
          <span className="dt-page-label">Page {page + 1} of {totalPages} · {table.rows.length} rows</span>
          <button className="dt-page-btn" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>Next →</button>
        </div>
      )}
      <style jsx>{`
        .dt-wrap { display: flex; flex-direction: column; gap: 8px; }
        .dt-empty { padding: 40px 20px; text-align: center; color: #94A3B8; font-size: 0.85rem; }
        .dt-selbar { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 10px; background: #ECFEFF; border: 1px solid #A5F3FC; font-size: 0.8rem; color: #0E7490; font-weight: 600; }
        .dt-selbar-btn { padding: 5px 12px; border-radius: 8px; border: none; background: #0891B2; color: white; font-size: 0.76rem; font-weight: 700; cursor: pointer; }
        .dt-selbar-ghost { background: transparent; color: #0E7490; border: 1px solid #A5F3FC; }
        .dt-scroll { overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 12px; max-width: 100%; }
        .dt-table { border-collapse: collapse; width: 100%; font-size: 0.8rem; }
        .dt-th { text-align: left; padding: 0; background: #F8FAFC; border-bottom: 2px solid #E2E8F0; white-space: nowrap; }
        .dt-th-inner { display: flex; align-items: center; gap: 4px; padding: 8px 10px; }
        .dt-th-label { border: none; background: none; font-weight: 700; color: #0F172A; cursor: pointer; padding: 0; font-size: 0.8rem; font-family: inherit; }
        .dt-th-input { font-weight: 700; font-size: 0.8rem; border: 1px solid #0891B2; border-radius: 4px; padding: 2px 4px; width: 100px; font-family: inherit; }
        .dt-type-badge { font-size: 0.62rem; font-weight: 700; padding: 1px 5px; border-radius: 999px; border: 1px solid; text-transform: uppercase; }
        .dt-th-icon { border: none; background: none; color: #94A3B8; cursor: pointer; font-size: 0.7rem; padding: 2px; line-height: 1; }
        .dt-th-icon:hover { color: #0891B2; }
        .dt-th-danger:hover { color: #DC2626; }
        .dt-td { padding: 0; border-bottom: 1px solid #EEF2F6; }
        .dt-cell-input { width: 100%; min-width: 90px; padding: 7px 10px; border: none; background: transparent; font-size: 0.8rem; color: #334155; font-family: inherit; }
        .dt-cell-input:focus { outline: 2px solid #0891B2; outline-offset: -2px; }
        .dt-cell-text { display: block; padding: 7px 10px; color: #334155; }
        .dt-row-selected { background: #ECFEFF; }
        .dt-td-check, .dt-th-check { padding: 8px 10px; }
        .dt-pagination { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 4px 0; }
        .dt-page-btn { padding: 5px 12px; border-radius: 8px; border: 1px solid #E2E8F0; background: white; font-size: 0.76rem; font-weight: 600; cursor: pointer; }
        .dt-page-btn:disabled { opacity: 0.4; cursor: default; }
        .dt-page-label { font-size: 0.76rem; color: #64748B; }
      `}</style>
    </div>
  );
}
