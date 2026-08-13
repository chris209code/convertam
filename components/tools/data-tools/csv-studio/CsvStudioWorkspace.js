'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { T } from '../smart-parser/theme';
import DataTable from '../shared/DataTable';
import { downloadBlob, copyText, formatBytes, sendToTool, receiveHandoff } from '@/lib/dataTools/shared';
import {
  detectDelimiter, parseCsv, stringifyCsv, rowsToTable, tableToRawRows,
  detectColumnType, columnStats, trimWhitespace, removeEmptyRows, removeDuplicateRows,
  normalizeCase, findAndReplace, fillEmptyCells, convertColumnType, renameColumn,
  addColumn, removeColumn, reorderColumns, addRow, removeRows, editCell,
  tableToJson, tableToCsvText,
} from '@/lib/dataTools/csvEngine';

const SAMPLE_CSV = `name,email,country,revenue,active,joined
Acme Ltd,billing@acme.com,Nigeria,5000,true,2023-01-15
Beta Co,hello@beta.com,Ghana,3000,true,2023-03-02
Cee Corp,,Nigeria,8000,false,2022-11-20
Delta Inc,info@delta.com,Kenya,1200,true,2024-02-10`;

const CLEAN_OPS = [
  { id: 'trim', label: 'Trim whitespace' },
  { id: 'remove-empty-rows', label: 'Remove empty rows' },
  { id: 'remove-duplicates', label: 'Remove duplicate rows' },
];

function useHistory(initial) {
  const [stack, setStack] = useState([initial]);
  const [index, setIndex] = useState(0);
  const current = stack[index];
  function set(next) {
    setStack((prev) => [...prev.slice(0, index + 1), next]);
    setIndex((i) => i + 1);
  }
  function reset(next) {
    setStack([next]);
    setIndex(0);
  }
  const undo = () => setIndex((i) => Math.max(0, i - 1));
  const redo = () => setIndex((i) => Math.min(stack.length - 1, i + 1));
  return { current, set, reset, undo, redo, canUndo: index > 0, canRedo: index < stack.length - 1 };
}

export default function CsvStudioWorkspace() {
  const router = useRouter();
  const history = useHistory({ columns: [], rows: [] });
  const table = history.current;

  const [fileInfo, setFileInfo] = useState(null); // {name, sizeBytes, delimiter, hasHeader}
  const [searchQuery, setSearchQuery] = useState('');
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [sortState, setSortState] = useState(null); // {column, dir}
  const [showClean, setShowClean] = useState(false);
  const [findReplace, setFindReplace] = useState({ column: '__all__', find: '', replace: '' });
  const [colOp, setColOp] = useState({ column: '', caseMode: 'upper', fillValue: '', targetType: 'text' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handoff = receiveHandoff();
    if (handoff && handoff.tool === 'csv-studio' && handoff.kind === 'csv-text') {
      loadCsvText(handoff.content, handoff.sourceName || 'Handed off from another tool');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadCsvText(text, name) {
    const delim = detectDelimiter(text);
    const delimChar = { comma: ',', semicolon: ';', tab: '\t', pipe: '|' }[delim];
    const rawRows = parseCsv(text, delimChar);
    const newTable = rowsToTable(rawRows, { hasHeader: true });
    history.reset(newTable);
    setFileInfo({ name, sizeBytes: new TextEncoder().encode(text).length, delimiter: delim, hasHeader: true });
    setSortState(null);
  }

  function handleFileImport(file) {
    file.text().then((text) => loadCsvText(text, file.name));
  }

  function handleNewCsv() {
    history.reset({ columns: ['Column 1', 'Column 2'], rows: [{ 'Column 1': '', 'Column 2': '' }] });
    setFileInfo(null);
  }

  function handlePasteApply() {
    loadCsvText(pasteText, 'Pasted CSV');
    setPasteText('');
    setPasteMode(false);
  }

  const columnTypes = useMemo(() => {
    const out = {};
    for (const c of table.columns) out[c] = detectColumnType(table, c);
    return out;
  }, [table]);

  const filteredTable = useMemo(() => {
    let t = table;
    if (sortState) {
      const rows = [...t.rows].sort((a, b) => {
        const av = a[sortState.column] ?? '';
        const bv = b[sortState.column] ?? '';
        const an = Number(av), bn = Number(bv);
        const bothNumeric = av !== '' && bv !== '' && !Number.isNaN(an) && !Number.isNaN(bn);
        const cmp = bothNumeric ? an - bn : String(av).localeCompare(String(bv));
        return sortState.dir === 'asc' ? cmp : -cmp;
      });
      t = { ...t, rows };
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      t = { ...t, rows: t.rows.filter((r) => t.columns.some((c) => String(r[c] ?? '').toLowerCase().includes(q))) };
    }
    return t;
  }, [table, sortState, searchQuery]);

  function handleSort(column) {
    setSortState((prev) => (prev?.column === column ? { column, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { column, dir: 'asc' }));
  }

  function applyClean(opId) {
    if (opId === 'trim') history.set(trimWhitespace(table));
    else if (opId === 'remove-empty-rows') history.set(removeEmptyRows(table));
    else if (opId === 'remove-duplicates') history.set(removeDuplicateRows(table));
  }

  function handleFindReplaceApply() {
    if (!findReplace.find) return;
    history.set(findAndReplace(table, findReplace));
  }

  async function handleExportCsv() {
    const delimChar = fileInfo ? { comma: ',', semicolon: ';', tab: '\t', pipe: '|' }[fileInfo.delimiter] : ',';
    downloadBlob(tableToCsvText(table, delimChar), 'text/csv', `${fileInfo?.name?.replace(/\.[^.]+$/, '') || 'data'}.csv`);
  }
  function handleExportJson() {
    downloadBlob(tableToJson(table), 'application/json', `${fileInfo?.name?.replace(/\.[^.]+$/, '') || 'data'}.json`);
  }
  function handleExportTsv() {
    downloadBlob(stringifyCsv(tableToRawRows(table), '\t'), 'text/tab-separated-values', `${fileInfo?.name?.replace(/\.[^.]+$/, '') || 'data'}.tsv`);
  }
  function handleOpenInSql() {
    sendToTool({ tool: 'sql-studio', kind: 'table', content: table, tableName: (fileInfo?.name?.replace(/\.[^.]+$/, '') || 'imported').replace(/[^a-zA-Z0-9_]/g, '_') });
    router.push('/data-tools/sql-studio');
  }

  const hasData = table.columns.length > 0;

  return (
    <div style={{ fontFamily: T.font, maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <label style={fileBtnStyle}>
          Import CSV
          <input ref={fileInputRef} type="file" accept=".csv,.tsv,text/csv" hidden onChange={(e) => e.target.files[0] && handleFileImport(e.target.files[0])} />
        </label>
        <button onClick={handleNewCsv} style={smallBtnStyle}>New CSV</button>
        <button onClick={() => setPasteMode((v) => !v)} style={smallBtnStyle}>Paste CSV</button>
        <button onClick={() => loadCsvText(SAMPLE_CSV, 'sample.csv')} style={smallBtnStyle}>Sample Data</button>
        <span style={{ width: 1, background: T.border, margin: '4px 2px' }} />
        <button onClick={history.undo} disabled={!history.canUndo} style={smallBtnStyle} title="Undo">↶ Undo</button>
        <button onClick={history.redo} disabled={!history.canRedo} style={smallBtnStyle} title="Redo">↷ Redo</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleExportCsv} style={smallBtnStyle} disabled={!hasData}>Export CSV</button>
          <button onClick={handleExportTsv} style={smallBtnStyle} disabled={!hasData}>Export TSV</button>
          <button onClick={handleExportJson} style={smallBtnStyle} disabled={!hasData}>Export JSON</button>
          <button onClick={handleOpenInSql} style={primaryBtnStyle} disabled={!hasData}>Open in SQL Studio →</button>
        </div>
      </div>

      {pasteMode && (
        <div style={{ marginBottom: 14, padding: 14, borderRadius: 12, background: T.accentTint, border: `1px solid ${T.accentBorder}` }}>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste CSV, TSV, or semicolon/pipe-delimited data here…"
            style={{ width: '100%', minHeight: 120, padding: 10, borderRadius: 8, border: `1px solid ${T.border}`, fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={handlePasteApply} style={primaryBtnStyle} disabled={!pasteText.trim()}>Load pasted data</button>
            <button onClick={() => { setPasteMode(false); setPasteText(''); }} style={smallBtnStyle}>Cancel</button>
          </div>
        </div>
      )}

      {!hasData ? (
        <div style={emptyStateStyle}>
          <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>📊</div>
          <div style={{ fontWeight: 700, color: T.ink, marginBottom: 4 }}>No data yet</div>
          <div style={{ fontSize: '0.85rem', color: T.mutedDark }}>Import a CSV file, paste data, or start with a blank sheet.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 18 }} className="csv-grid">
          <div>
            <div style={sidebarBoxStyle}>
              <div style={sidebarTitleStyle}>File info</div>
              <SidebarRow label="Rows" value={table.rows.length} />
              <SidebarRow label="Columns" value={table.columns.length} />
              {fileInfo && <SidebarRow label="Delimiter" value={fileInfo.delimiter} />}
              <SidebarRow label="Encoding" value="UTF-8" />
              <SidebarRow label="Header row" value={fileInfo?.hasHeader === false ? 'No' : 'Detected'} />
              {fileInfo?.sizeBytes != null && <SidebarRow label="Size" value={formatBytes(fileInfo.sizeBytes)} />}
            </div>

            <div style={{ ...sidebarBoxStyle, marginTop: 12 }}>
              <div style={sidebarTitleStyle}>Column types</div>
              {table.columns.map((c) => (
                <div key={c} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '3px 0', color: T.inkSecondary }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }} title={c}>{c}</span>
                  <span style={{ color: T.mutedDark, fontWeight: 600 }}>{columnTypes[c]}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setShowClean((v) => !v)} style={{ ...smallBtnStyle, width: '100%', marginTop: 12 }}>{showClean ? 'Hide' : 'Show'} Data Cleaning</button>
            {showClean && (
              <div style={{ ...sidebarBoxStyle, marginTop: 8 }}>
                <div style={sidebarTitleStyle}>Clean operations</div>
                {CLEAN_OPS.map((op) => (
                  <button key={op.id} onClick={() => applyClean(op.id)} style={cleanOpBtnStyle}>{op.label}</button>
                ))}
                <div style={{ borderTop: `1px solid ${T.borderLight}`, marginTop: 8, paddingTop: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>FIND &amp; REPLACE</div>
                  <select value={findReplace.column} onChange={(e) => setFindReplace((f) => ({ ...f, column: e.target.value }))} style={selectStyle}>
                    <option value="__all__">All columns</option>
                    {table.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input placeholder="Find" value={findReplace.find} onChange={(e) => setFindReplace((f) => ({ ...f, find: e.target.value }))} style={inputStyle} />
                  <input placeholder="Replace with" value={findReplace.replace} onChange={(e) => setFindReplace((f) => ({ ...f, replace: e.target.value }))} style={inputStyle} />
                  <button onClick={handleFindReplaceApply} style={{ ...smallBtnStyle, width: '100%', marginTop: 4 }} disabled={!findReplace.find}>Apply</button>
                </div>
                <div style={{ borderTop: `1px solid ${T.borderLight}`, marginTop: 8, paddingTop: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: T.mutedDark, marginBottom: 4 }}>PER-COLUMN OPERATIONS</div>
                  <select value={colOp.column || table.columns[0] || ''} onChange={(e) => setColOp((c) => ({ ...c, column: e.target.value }))} style={selectStyle}>
                    {table.columns.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    <select value={colOp.caseMode} onChange={(e) => setColOp((c) => ({ ...c, caseMode: e.target.value }))} style={{ ...selectStyle, marginBottom: 0, flex: 1 }}>
                      <option value="upper">UPPERCASE</option>
                      <option value="lower">lowercase</option>
                      <option value="title">Title Case</option>
                    </select>
                    <button onClick={() => history.set(normalizeCase(table, colOp.column || table.columns[0], colOp.caseMode))} style={smallBtnStyle}>Go</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    <input placeholder="Fill empty with…" value={colOp.fillValue} onChange={(e) => setColOp((c) => ({ ...c, fillValue: e.target.value }))} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                    <button onClick={() => history.set(fillEmptyCells(table, colOp.column || table.columns[0], colOp.fillValue))} style={smallBtnStyle}>Go</button>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <select value={colOp.targetType} onChange={(e) => setColOp((c) => ({ ...c, targetType: e.target.value }))} style={{ ...selectStyle, marginBottom: 0, flex: 1 }}>
                      <option value="text">Convert to Text</option>
                      <option value="integer">Convert to Integer</option>
                      <option value="decimal">Convert to Decimal</option>
                      <option value="boolean">Convert to Boolean</option>
                    </select>
                    <button onClick={() => history.set(convertColumnType(table, colOp.column || table.columns[0], colOp.targetType))} style={smallBtnStyle}>Go</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <input
                placeholder="Search…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ ...inputStyle, maxWidth: 220, marginBottom: 0 }}
              />
              <button onClick={() => history.set(addColumn(table, `Column ${table.columns.length + 1}`))} style={smallBtnStyle}>+ Add Column</button>
              <button onClick={() => history.set(addRow(table))} style={smallBtnStyle}>+ Add Row</button>
            </div>
            <DataTable
              table={filteredTable}
              editable
              selectable
              columnTypes={columnTypes}
              sortState={sortState}
              onSort={handleSort}
              onEditCell={(rowIndex, col, value) => {
                // filteredTable may be sorted/filtered — map back to the real
                // row object identity rather than trusting the visible index.
                const realRow = filteredTable.rows[rowIndex];
                const realIndex = table.rows.indexOf(realRow);
                if (realIndex === -1) return;
                history.set(editCell(table, realIndex, col, value));
              }}
              onRemoveRows={(indices) => {
                const realIndices = indices.map((i) => table.rows.indexOf(filteredTable.rows[i])).filter((i) => i !== -1);
                history.set(removeRows(table, realIndices));
              }}
              onRenameColumn={(oldName, newName) => history.set(renameColumn(table, oldName, newName))}
              onRemoveColumn={(name) => history.set(removeColumn(table, name))}
              onMoveColumn={(from, to) => history.set(reorderColumns(table, from, to))}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 800px) {
          .csv-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function SidebarRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', padding: '3px 0' }}>
      <span style={{ color: T.mutedDark }}>{label}</span>
      <span style={{ color: T.ink, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const smallBtnStyle = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font };
const fileBtnStyle = { ...smallBtnStyle, position: 'relative' };
const primaryBtnStyle = { padding: '7px 14px', borderRadius: 8, border: 'none', background: T.accentGradient, color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: T.font };
const emptyStateStyle = { textAlign: 'center', padding: '48px 20px', borderRadius: 14, border: `2px dashed ${T.accentBorder}`, background: T.accentTint };
const sidebarBoxStyle = { border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, background: '#F8FAFC' };
const sidebarTitleStyle = { fontSize: '0.72rem', fontWeight: 700, color: T.mutedDark, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 };
const cleanOpBtnStyle = { display: 'block', width: '100%', textAlign: 'left', padding: '6px 8px', borderRadius: 6, border: 'none', background: 'transparent', fontSize: '0.78rem', color: T.inkSecondary, cursor: 'pointer', fontFamily: T.font };
const selectStyle = { width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: '0.78rem', marginBottom: 6, fontFamily: T.font };
const inputStyle = { width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${T.border}`, fontSize: '0.78rem', marginBottom: 6, boxSizing: 'border-box', fontFamily: T.font };
