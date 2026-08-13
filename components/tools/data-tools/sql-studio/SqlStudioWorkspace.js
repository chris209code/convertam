'use client';

import { useEffect, useMemo, useState } from 'react';
import { T } from '../smart-parser/theme';
import CodeEditor from '../shared/CodeEditor';
import DataTable from '../shared/DataTable';
import { downloadBlob, copyText, receiveHandoff } from '@/lib/dataTools/shared';
import { detectDelimiter, parseCsv, rowsToTable } from '@/lib/dataTools/csvEngine';
import { runSql, formatSql, tokenizeSql, SQL_LIMITATIONS } from '@/lib/dataTools/sqlEngine';

const TOKEN_CLASS = { keyword: 'ce-keyword', string: 'ce-string', comment: 'ce-comment', number: 'ce-number', ident: 'ce-ident', 'quoted-ident': 'ce-ident', op: 'ce-punct', punct: 'ce-punct' };

const SAMPLE_TABLES = {
  customers: {
    columns: ['id', 'name', 'country', 'revenue'],
    rows: [
      { id: '1', name: 'Acme Ltd', country: 'Nigeria', revenue: '5000' },
      { id: '2', name: 'Beta Co', country: 'Ghana', revenue: '3000' },
      { id: '3', name: 'Cee Corp', country: 'Nigeria', revenue: '8000' },
      { id: '4', name: 'Delta Inc', country: 'Kenya', revenue: '1200' },
    ],
  },
  orders: {
    columns: ['order_id', 'customer_id', 'amount'],
    rows: [
      { order_id: '101', customer_id: '1', amount: '100' },
      { order_id: '102', customer_id: '1', amount: '50' },
      { order_id: '103', customer_id: '3', amount: '200' },
    ],
  },
};

const SAMPLE_QUERY = `SELECT country, COUNT(*) AS customers, SUM(revenue) AS total_revenue
FROM customers
GROUP BY country
ORDER BY total_revenue DESC;`;

function jsonArrayToTable(data) {
  const rows = Array.isArray(data) ? data : [data];
  const columnSet = [];
  for (const r of rows) for (const k of Object.keys(r || {})) if (!columnSet.includes(k)) columnSet.push(k);
  return { columns: columnSet, rows: rows.map((r) => { const out = {}; for (const c of columnSet) out[c] = r[c] === undefined || r[c] === null ? '' : String(r[c]); return out; }) };
}

export default function SqlStudioWorkspace() {
  const [db, setDb] = useState({});
  const [sql, setSql] = useState('');
  const [results, setResults] = useState([]);
  const [runError, setRunError] = useState(null);
  const [elapsedMs, setElapsedMs] = useState(null);
  const [activeResultIdx, setActiveResultIdx] = useState(0);
  const [copyState, setCopyState] = useState('idle');

  useEffect(() => {
    const handoff = receiveHandoff();
    if (!handoff) return;
    if (handoff.tool !== 'sql-studio') return;
    const name = (handoff.tableName || 'imported').replace(/[^a-zA-Z0-9_]/g, '_') || 'imported';
    if (handoff.kind === 'table' && handoff.content) {
      setDb({ [name]: handoff.content });
    } else if (handoff.kind === 'csv-text' && handoff.content) {
      const delim = detectDelimiter(handoff.content);
      const delimChar = { comma: ',', semicolon: ';', tab: '\t', pipe: '|' }[delim];
      setDb({ [name]: rowsToTable(parseCsv(handoff.content, delimChar)) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tokenize(text) { return tokenizeSql(text); }

  function handleRun() {
    if (!sql.trim()) return;
    const t0 = performance.now();
    const r = runSql(sql, db);
    setElapsedMs(performance.now() - t0);
    setDb(r.db);
    setResults(r.results);
    setRunError(r.error);
    setActiveResultIdx(Math.max(0, r.results.length - 1));
  }

  function handleFormat() { setSql((s) => formatSql(s)); }
  function handleClear() { setSql(''); setResults([]); setRunError(null); }
  function handleLoadSample() { setDb(SAMPLE_TABLES); setSql(SAMPLE_QUERY); setResults([]); setRunError(null); }

  async function handleImportFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    const name = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_]/g, '_') || 'imported';
    try {
      if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
        const text = await file.text();
        const delim = detectDelimiter(text);
        const delimChar = { comma: ',', semicolon: ';', tab: '\t', pipe: '|' }[delim];
        setDb((prev) => ({ ...prev, [name]: rowsToTable(parseCsv(text, delimChar)) }));
      } else if (ext === 'json') {
        const text = await file.text();
        setDb((prev) => ({ ...prev, [name]: jsonArrayToTable(JSON.parse(text)) }));
      } else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }).map((r) => r.map((c) => String(c ?? '')));
        setDb((prev) => ({ ...prev, [name]: rowsToTable(raw) }));
      } else {
        setRunError({ message: `Unsupported import file type ".${ext}" — use CSV, TSV, JSON, or XLSX.`, phase: 'import' });
      }
    } catch (e) {
      setRunError({ message: `Could not import "${file.name}": ${e.message || 'the file may be malformed.'}`, phase: 'import' });
    }
  }

  const activeResult = results[activeResultIdx];

  async function handleCopyResults() {
    if (!activeResult || activeResult.kind !== 'select') return;
    const lines = [activeResult.columns.join(','), ...activeResult.rows.map((r) => activeResult.columns.map((c) => r[c]).join(','))];
    const ok = await copyText(lines.join('\n'));
    setCopyState(ok ? 'copied' : 'idle');
    if (ok) setTimeout(() => setCopyState('idle'), 1600);
  }
  function handleDownloadCsv() {
    if (!activeResult || activeResult.kind !== 'select') return;
    const escape = (v) => { const s = String(v ?? ''); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [activeResult.columns.map(escape).join(','), ...activeResult.rows.map((r) => activeResult.columns.map((c) => escape(r[c])).join(','))];
    downloadBlob(lines.join('\r\n'), 'text/csv', 'query-result.csv');
  }
  function handleDownloadJson() {
    if (!activeResult || activeResult.kind !== 'select') return;
    downloadBlob(JSON.stringify(activeResult.rows, null, 2), 'application/json', 'query-result.json');
  }
  async function handleCopySql() { const ok = await copyText(sql); setCopyState(ok ? 'copied' : 'idle'); if (ok) setTimeout(() => setCopyState('idle'), 1600); }
  function handleDownloadSql() { downloadBlob(sql, 'text/plain', 'query.sql'); }

  const tableNames = Object.keys(db);

  return (
    <div style={{ fontFamily: T.font, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 240px', gap: 16 }} className="sql-grid">
        {/* Schema sidebar */}
        <div>
          <div style={sidebarBoxStyle}>
            <div style={sidebarTitleStyle}>Tables</div>
            {tableNames.length === 0 ? (
              <div style={{ fontSize: '0.76rem', color: T.muted }}>No tables yet — import data below.</div>
            ) : (
              tableNames.map((t) => (
                <div key={t} style={{ marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.8rem', color: T.accentDark, marginBottom: 3 }}>{t}</div>
                  {db[t].columns.map((c) => (
                    <div key={c} style={{ fontSize: '0.74rem', color: T.mutedDark, paddingLeft: 8 }}>{c}</div>
                  ))}
                  <div style={{ fontSize: '0.7rem', color: T.muted, paddingLeft: 8, marginTop: 2 }}>{db[t].rows.length} rows</div>
                </div>
              ))
            )}
          </div>
          <label style={{ ...smallBtnStyle, display: 'block', textAlign: 'center', marginTop: 10 }}>
            + Import table
            <input type="file" accept=".csv,.tsv,.json,.xlsx,.xls" hidden onChange={(e) => e.target.files[0] && handleImportFile(e.target.files[0])} />
          </label>
          <button onClick={handleLoadSample} style={{ ...smallBtnStyle, width: '100%', marginTop: 8 }}>Load sample data</button>
        </div>

        {/* Editor */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={handleRun} style={primaryBtnStyle}>▶ Run</button>
            <button onClick={handleFormat} style={smallBtnStyle}>Format</button>
            <button onClick={handleClear} style={smallBtnStyle}>Clear</button>
            <button onClick={() => setSql(SAMPLE_QUERY)} style={smallBtnStyle}>Sample query</button>
            <button onClick={handleCopySql} style={smallBtnStyle}>{copyState === 'copied' ? '✓ Copied' : '📋 Copy SQL'}</button>
            <button onClick={handleDownloadSql} style={smallBtnStyle} disabled={!sql}>Download .sql</button>
          </div>
          <CodeEditor value={sql} onChange={setSql} tokenize={tokenize} tokenClass={TOKEN_CLASS} placeholder="SELECT * FROM customers WHERE country = 'Nigeria' ORDER BY revenue DESC;" minHeight={220} />
          <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: 6 }}>Runs entirely in your browser against the tables above — never against a remote database.</p>
        </div>

        {/* Query info */}
        <div>
          <div style={sidebarBoxStyle}>
            <div style={sidebarTitleStyle}>Query information</div>
            {runError ? (
              <div style={{ color: '#991B1B', fontSize: '0.78rem', fontWeight: 600 }}>⚠️ {runError.message}</div>
            ) : activeResult ? (
              <>
                <SidebarRow label="Status" value="Success" />
                {activeResult.kind === 'select' && <SidebarRow label="Rows returned" value={activeResult.rowCount} />}
                {activeResult.kind !== 'select' && <SidebarRow label="Message" value={activeResult.message} />}
                {elapsedMs != null && <SidebarRow label="Execution time" value={`${elapsedMs.toFixed(2)} ms`} />}
                {results.length > 1 && <SidebarRow label="Statements run" value={results.length} />}
              </>
            ) : (
              <div style={{ fontSize: '0.76rem', color: T.muted }}>Run a query to see results here.</div>
            )}
          </div>
          <details style={{ marginTop: 10 }}>
            <summary style={{ fontSize: '0.74rem', color: T.mutedDark, cursor: 'pointer', fontWeight: 600 }}>What&apos;s not supported</summary>
            <ul style={{ fontSize: '0.72rem', color: T.muted, paddingLeft: 16, marginTop: 6 }}>
              {SQL_LIMITATIONS.map((l) => <li key={l} style={{ marginBottom: 4 }}>{l}</li>)}
            </ul>
          </details>
        </div>
      </div>

      {/* Results table */}
      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: T.ink, marginBottom: 8 }}>Results</div>
        {results.length > 1 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {results.map((r, i) => (
              <button key={i} onClick={() => setActiveResultIdx(i)} style={pillStyle(i === activeResultIdx)}>Statement {i + 1}</button>
            ))}
          </div>
        )}
        {!activeResult ? (
          <div style={emptyStateStyle}>Run a query above to see results here.</div>
        ) : activeResult.kind !== 'select' ? (
          <div style={validBoxStyle}>✓ {activeResult.message}</div>
        ) : activeResult.rows.length === 0 ? (
          <div style={emptyStateStyle}>Query ran successfully but returned no rows.</div>
        ) : (
          <>
            <DataTable table={{ columns: activeResult.columns, rows: activeResult.rows }} editable={false} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={handleCopyResults} style={smallBtnStyle}>{copyState === 'copied' ? '✓ Copied' : '📋 Copy results'}</button>
              <button onClick={handleDownloadCsv} style={smallBtnStyle}>⬇ Download CSV</button>
              <button onClick={handleDownloadJson} style={smallBtnStyle}>⬇ Download JSON</button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .sql-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function SidebarRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', padding: '3px 0' }}>
      <span style={{ color: T.mutedDark }}>{label}</span>
      <span style={{ color: T.ink, fontWeight: 600, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

const smallBtnStyle = { padding: '7px 14px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font };
const primaryBtnStyle = { padding: '7px 16px', borderRadius: 8, border: 'none', background: T.accentGradient, color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: T.font };
const pillStyle = (active) => ({ padding: '5px 12px', borderRadius: 999, border: 'none', background: active ? T.accentGradient : '#F1F5F9', color: active ? 'white' : T.inkSecondary, fontWeight: 700, fontSize: '0.74rem', cursor: 'pointer', fontFamily: T.font });
const sidebarBoxStyle = { border: `1px solid ${T.border}`, borderRadius: 12, padding: 12, background: '#F8FAFC', maxHeight: 340, overflow: 'auto' };
const sidebarTitleStyle = { fontSize: '0.72rem', fontWeight: 700, color: T.mutedDark, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 };
const emptyStateStyle = { textAlign: 'center', padding: '32px 20px', borderRadius: 12, border: `2px dashed ${T.accentBorder}`, background: T.accentTint, fontSize: '0.85rem', color: T.mutedDark };
const validBoxStyle = { padding: '14px', borderRadius: 10, background: T.successTint, border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.82rem', fontWeight: 600 };
