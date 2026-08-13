// Export layer — every format Smart Parser can produce, kept separate from
// the UI so any future Convertam tool consuming this parsing layer (per
// the integration note in the product brief) can reuse the same builders
// rather than re-implementing CSV/XLSX writing.

export function downloadBlob(content, mime, filename) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function tableToCSV(table) {
  const header = table.columns.map(csvCell).join(',');
  const rows = table.rows.map((row) => table.columns.map((c) => csvCell(row[c])).join(','));
  return [header, ...rows].join('\r\n');
}

export async function tableToXLSXBlob(table, sheetName = 'Sheet1') {
  const XLSX = await import('xlsx');
  const aoa = [table.columns, ...table.rows.map((row) => table.columns.map((c) => row[c] ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const arrayBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export function fieldsToCSV(fields) {
  const header = ['Field', 'Value', 'Confidence'].join(',');
  const rows = fields.map((f) => [csvCell(f.label ?? f.field), csvCell(f.value), csvCell(f.confidence)].join(','));
  return [header, ...rows].join('\r\n');
}

export function buildResultJSON({ documentType, pageCount, extraction, tables, fields, text }) {
  return JSON.stringify({
    documentType: documentType || null,
    pageCount: pageCount ?? null,
    extractedAt: new Date().toISOString(),
    fields: fields || [],
    tables: (tables || []).map((t) => ({ columns: t.columns, rows: t.rows, confidence: t.confidence })),
    extraction: extraction || null,
    text: text || null,
  }, null, 2);
}

// A compact, readable Markdown report — headings for each populated
// section, a real Markdown table per detected table, and a field list.
// Sections with nothing to show are omitted rather than printed empty.
export function buildResultMarkdown({ documentType, fields, tables, text }) {
  const lines = [`# Smart Parser Result`];
  if (documentType) lines.push('', `**Document type:** ${documentType}`);

  if (fields?.length) {
    lines.push('', '## Fields', '', '| Field | Value | Confidence |', '|---|---|---|');
    fields.forEach((f) => lines.push(`| ${f.label ?? f.field} | ${f.value ?? '—'} | ${f.confidence} |`));
  }

  if (tables?.length) {
    tables.forEach((t, i) => {
      lines.push('', `## Table ${i + 1}`, '', `| ${t.columns.join(' | ')} |`, `| ${t.columns.map(() => '---').join(' | ')} |`);
      t.rows.forEach((row) => lines.push(`| ${t.columns.map((c) => row[c] ?? '').join(' | ')} |`));
    });
  }

  if (text) lines.push('', '## Extracted Text', '', text);

  return lines.join('\n');
}
