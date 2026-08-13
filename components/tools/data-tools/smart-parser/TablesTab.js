'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { T, confidenceColor } from './theme';
import { tableToCSV, tableToXLSXBlob, downloadBlob } from '@/lib/smartParser/exporters';
import { sendToTool } from '@/lib/dataTools/shared';

export default function TablesTab({ tables, onEditCell }) {
  const router = useRouter();
  const [activeIdx, setActiveIdx] = useState(0);

  if (!tables.length) {
    return <div style={{ fontFamily: T.font, textAlign: 'center', padding: '40px 20px', color: T.muted, fontSize: '0.85rem' }}>No tables were detected in this document. Try Extract Text instead, or Analyze with AI if you believe there should be one.</div>;
  }

  const table = tables[activeIdx];
  const colors = confidenceColor(table.level);

  async function handleDownloadXLSX() {
    const blob = await tableToXLSXBlob(table, `Table ${activeIdx + 1}`);
    downloadBlob(blob, '', `smart-parser-table-${activeIdx + 1}.xlsx`);
  }
  function handleDownloadCSV() {
    downloadBlob(tableToCSV(table), 'text/csv', `smart-parser-table-${activeIdx + 1}.csv`);
  }
  async function handleCopy() {
    try { await navigator.clipboard.writeText(tableToCSV(table)); } catch { /* clipboard unavailable */ }
  }
  function handleOpenInCsvStudio() {
    sendToTool({ tool: 'csv-studio', kind: 'csv-text', content: tableToCSV(table), sourceName: `Smart Parser table ${activeIdx + 1}` });
    router.push('/data-tools/csv-studio');
  }

  return (
    <div style={{ fontFamily: T.font }}>
      {tables.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {tables.map((t, i) => (
            <button key={i} onClick={() => setActiveIdx(i)} style={{ padding: '6px 14px', borderRadius: 8, border: i === activeIdx ? `1px solid ${T.accent}` : `1px solid ${T.border}`, background: i === activeIdx ? T.accentTint : 'white', fontSize: '0.78rem', fontWeight: 600, color: i === activeIdx ? T.accentDark : T.inkSecondary, cursor: 'pointer', fontFamily: T.font }}>
              Table {i + 1} <span style={{ opacity: 0.6 }}>({t.rows.length} rows)</span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999, background: colors.bg, color: colors.fg, border: `1px solid ${colors.border}` }}>
          {table.confidence}% confidence
        </span>
        {table.rejected && <span style={{ fontSize: '0.76rem', color: T.danger }}>⚠️ {table.message}</span>}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={handleCopy} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>📋 Copy</button>
          <button onClick={handleDownloadCSV} style={{ padding: '7px 12px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'white', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>CSV</button>
          <button onClick={handleDownloadXLSX} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: T.accent, color: 'white', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>XLSX</button>
          <button onClick={handleOpenInCsvStudio} style={{ padding: '7px 12px', borderRadius: 8, border: 'none', background: T.accentGradient, color: 'white', fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', fontFamily: T.font }}>Open in CSV Studio →</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto', border: `1px solid ${T.borderLight}`, borderRadius: 12 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {table.columns.map((c) => (
                <th key={c} style={{ textAlign: 'left', padding: '9px 12px', fontWeight: 700, color: T.ink, borderBottom: `1px solid ${T.borderLight}`, whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {table.columns.map((c) => (
                  <td key={c} style={{ padding: 0, borderBottom: `1px solid ${T.borderLight}` }}>
                    <input
                      value={row[c] ?? ''}
                      onChange={(e) => onEditCell(activeIdx, rIdx, c, e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', fontSize: '0.8rem', color: T.inkSecondary, fontFamily: T.font }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
