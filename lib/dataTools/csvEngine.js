// A strict, dependency-free RFC4180-style CSV/TSV engine — deliberately not
// lib/tableParser.js, which is a fuzzy, confidence-scored heuristic parser
// built for "someone pasted a rough table" (AI Data Analyst, Smart Parser's
// free-text table detection). CSV Studio needs the opposite guarantee: a
// real CSV file must survive parse -> edit -> export without ever losing or
// mangling a quoted comma, an embedded newline, an escaped quote, or a
// Unicode character. This is a small state machine, not a library, because
// none of the project's existing dependencies (xlsx included) expose a
// "parse with a specific delimiter and give me back raw string cells,
// including delimiter/quote character detection" API — sheet_to_json widens
// scope well beyond what a plain CSV editor needs.

export const DELIMITERS = [
  { id: 'comma', char: ',', label: 'Comma (,)' },
  { id: 'semicolon', char: ';', label: 'Semicolon (;)' },
  { id: 'tab', char: '\t', label: 'Tab' },
  { id: 'pipe', char: '|', label: 'Pipe (|)' },
];

export function detectDelimiter(text) {
  const sample = text.split(/\r\n|\r|\n/).slice(0, 20).join('\n');
  let best = { id: 'comma', char: ',', score: -1 };
  for (const d of DELIMITERS) {
    const lines = sample.split(/\r\n|\r|\n/).filter((l) => l.length);
    if (!lines.length) continue;
    const counts = lines.map((l) => countUnquoted(l, d.char));
    const nonZero = counts.filter((c) => c > 0);
    if (!nonZero.length) continue;
    const mode = modeOf(nonZero);
    const consistency = nonZero.filter((c) => c === mode).length / lines.length;
    const score = consistency * mode;
    if (score > best.score) best = { id: d.id, char: d.char, score };
  }
  return best.id;
}

function countUnquoted(line, delimiter) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === delimiter && !inQuotes) count++;
  }
  return count;
}

function modeOf(arr) {
  const counts = {};
  arr.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

// Full RFC4180 state-machine parse: handles quoted fields, "" as an escaped
// quote inside a quoted field, delimiters/newlines embedded inside quotes,
// and CRLF/LF/CR line endings uniformly. Returns rows as arrays of raw
// strings (no type coercion here — that's a separate, explicit step).
export function parseCsv(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  function endField() { row.push(field); field = ''; }
  function endRow() { endField(); rows.push(row); row = []; }

  while (i < n) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { inQuotes = true; i++; continue; }
    if (ch === delimiter) { endField(); i++; continue; }
    if (ch === '\r' && text[i + 1] === '\n') { endRow(); i += 2; continue; }
    if (ch === '\n' || ch === '\r') { endRow(); i++; continue; }
    field += ch; i++;
  }
  // Trailing field/row (file may or may not end with a newline).
  if (field !== '' || row.length > 0) endRow();

  // Drop a single fully-empty trailing row (typical "file ends with a
  // newline" artifact) without ever dropping a real blank data row.
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
    rows.pop();
  }
  return rows;
}

// True RFC4180 quoting: only quote a field when it actually needs it
// (contains the delimiter, a quote, or a line break), and always double
// internal quotes. Always uses CRLF per RFC4180 — matches how every other
// export in this codebase (lib/tableParser.js consumers, jsonEngine's
// jsonToCsv) already emits CSV, so round-tripping through any Convertam
// tool stays consistent.
export function stringifyCsv(rows, delimiter = ',') {
  return rows.map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ''), delimiter)).join(delimiter)).join('\r\n');
}

function escapeCsvCell(value, delimiter) {
  if (value.includes('"') || value.includes(delimiter) || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ---------------------------------------------------------------------
// TABLE MODEL — {columns: [string], rows: [{col: value}]}, the shape every
// UI piece (DataTable, stats sidebar, SQL Studio import) works with.
// ---------------------------------------------------------------------

export function rowsToTable(rawRows, { hasHeader = true } = {}) {
  if (!rawRows.length) return { columns: [], rows: [] };
  const width = Math.max(...rawRows.map((r) => r.length));
  const headerRow = hasHeader ? rawRows[0] : null;
  const columns = Array.from({ length: width }, (_, i) => {
    const label = headerRow ? (headerRow[i] ?? '').trim() : '';
    return label || `Column ${i + 1}`;
  });
  // Duplicate header names would silently collide as object keys — make
  // every column name unique so no data is ever dropped on import.
  const seen = new Map();
  const uniqueColumns = columns.map((c) => {
    const count = seen.get(c) || 0;
    seen.set(c, count + 1);
    return count === 0 ? c : `${c} (${count + 1})`;
  });
  const dataRows = hasHeader ? rawRows.slice(1) : rawRows;
  const rows = dataRows.map((r) => {
    const obj = {};
    uniqueColumns.forEach((c, i) => { obj[c] = r[i] ?? ''; });
    return obj;
  });
  return { columns: uniqueColumns, rows };
}

export function tableToRawRows(table, { includeHeader = true } = {}) {
  const raw = [];
  if (includeHeader) raw.push([...table.columns]);
  for (const row of table.rows) raw.push(table.columns.map((c) => (row[c] ?? '')));
  return raw;
}

// ---------------------------------------------------------------------
// TYPE DETECTION — per-column, sampled across all rows (cheap: values are
// already in memory). Never throws on messy input; falls back to 'text'.
// ---------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(:\d{2})?)?$|^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
const BOOL_VALUES = new Set(['true', 'false', 'yes', 'no']);

function detectCellType(v) {
  const s = String(v ?? '').trim();
  if (s === '') return 'empty';
  if (BOOL_VALUES.has(s.toLowerCase())) return 'boolean';
  if (DATE_RE.test(s)) return 'date';
  if (/^-?\d+$/.test(s)) return 'integer';
  if (/^-?\d*\.\d+$/.test(s) || /^-?\d+\.\d*$/.test(s)) return 'decimal';
  return 'text';
}

export function detectColumnType(table, column) {
  const counts = {};
  for (const row of table.rows) {
    const t = detectCellType(row[column]);
    counts[t] = (counts[t] || 0) + 1;
  }
  const nonEmpty = Object.entries(counts).filter(([t]) => t !== 'empty');
  if (!nonEmpty.length) return 'empty';
  nonEmpty.sort((a, b) => b[1] - a[1]);
  return nonEmpty[0][0];
}

export function columnStats(table, column) {
  const type = detectColumnType(table, column);
  const values = table.rows.map((r) => r[column]);
  const missing = values.filter((v) => String(v ?? '').trim() === '').length;
  const stats = { column, type, total: values.length, missing };
  if (type === 'integer' || type === 'decimal') {
    const nums = values.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (nums.length) {
      stats.min = Math.min(...nums);
      stats.max = Math.max(...nums);
      stats.avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    }
  }
  if (type === 'text' || type === 'boolean') {
    stats.distinct = new Set(values.map((v) => String(v ?? ''))).size;
  }
  return stats;
}

// ---------------------------------------------------------------------
// CLEANING OPERATIONS — each returns a NEW table, never mutates the input,
// same "rebuild, don't mutate" discipline as jsonEngine.js's transforms.
// ---------------------------------------------------------------------

export function trimWhitespace(table) {
  return { ...table, rows: table.rows.map((r) => {
    const out = {};
    for (const c of table.columns) out[c] = String(r[c] ?? '').trim();
    return out;
  }) };
}

export function removeEmptyRows(table) {
  return { ...table, rows: table.rows.filter((r) => table.columns.some((c) => String(r[c] ?? '').trim() !== '')) };
}

export function removeDuplicateRows(table) {
  const seen = new Set();
  const rows = [];
  for (const r of table.rows) {
    const key = table.columns.map((c) => r[c]).join('');
    if (!seen.has(key)) { seen.add(key); rows.push(r); }
  }
  return { ...table, rows };
}

export function normalizeCase(table, column, mode) {
  return { ...table, rows: table.rows.map((r) => {
    const v = String(r[column] ?? '');
    let out = v;
    if (mode === 'upper') out = v.toUpperCase();
    else if (mode === 'lower') out = v.toLowerCase();
    else if (mode === 'title') out = v.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
    return { ...r, [column]: out };
  }) };
}

export function findAndReplace(table, { column, find, replace, useRegex = false, matchCase = false }) {
  const cols = column === '__all__' ? table.columns : [column];
  let pattern;
  try {
    pattern = useRegex ? new RegExp(find, matchCase ? 'g' : 'gi') : new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
  } catch {
    return table; // invalid regex — no-op rather than throwing mid-edit
  }
  return { ...table, rows: table.rows.map((r) => {
    const out = { ...r };
    for (const c of cols) out[c] = String(r[c] ?? '').replace(pattern, replace);
    return out;
  }) };
}

export function fillEmptyCells(table, column, value) {
  return { ...table, rows: table.rows.map((r) => (
    String(r[column] ?? '').trim() === '' ? { ...r, [column]: value } : r
  )) };
}

export function convertColumnType(table, column, targetType) {
  return { ...table, rows: table.rows.map((r) => {
    const raw = String(r[column] ?? '').trim();
    if (raw === '') return r;
    let out = raw;
    if (targetType === 'integer') { const n = parseInt(raw, 10); out = Number.isNaN(n) ? raw : String(n); }
    else if (targetType === 'decimal') { const n = parseFloat(raw); out = Number.isNaN(n) ? raw : String(n); }
    else if (targetType === 'boolean') { out = /^(true|yes|1)$/i.test(raw) ? 'true' : /^(false|no|0)$/i.test(raw) ? 'false' : raw; }
    else if (targetType === 'text') { out = raw; }
    return { ...r, [column]: out };
  }) };
}

export function renameColumn(table, oldName, newName) {
  if (!newName || newName === oldName || table.columns.includes(newName)) return table;
  const columns = table.columns.map((c) => (c === oldName ? newName : c));
  const rows = table.rows.map((r) => {
    const out = {};
    for (const c of table.columns) out[c === oldName ? newName : c] = r[c];
    return out;
  });
  return { columns, rows };
}

export function addColumn(table, name, defaultValue = '') {
  let col = name || `Column ${table.columns.length + 1}`;
  let n = 1;
  while (table.columns.includes(col)) col = `${name || 'Column'} (${++n})`;
  return {
    columns: [...table.columns, col],
    rows: table.rows.map((r) => ({ ...r, [col]: defaultValue })),
  };
}

export function removeColumn(table, name) {
  return {
    columns: table.columns.filter((c) => c !== name),
    rows: table.rows.map((r) => { const { [name]: _drop, ...rest } = r; return rest; }),
  };
}

export function reorderColumns(table, fromIndex, toIndex) {
  const columns = [...table.columns];
  const [moved] = columns.splice(fromIndex, 1);
  columns.splice(toIndex, 0, moved);
  return { ...table, columns };
}

export function addRow(table, atIndex = table.rows.length) {
  const blank = {};
  for (const c of table.columns) blank[c] = '';
  const rows = [...table.rows];
  rows.splice(atIndex, 0, blank);
  return { ...table, rows };
}

export function removeRows(table, indices) {
  const remove = new Set(indices);
  return { ...table, rows: table.rows.filter((_, i) => !remove.has(i)) };
}

export function editCell(table, rowIndex, column, value) {
  const rows = table.rows.map((r, i) => (i === rowIndex ? { ...r, [column]: value } : r));
  return { ...table, rows };
}

// ---------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------

export function tableToJson(table) {
  return JSON.stringify(table.rows, null, 2);
}

export function tableToCsvText(table, delimiter = ',') {
  return stringifyCsv(tableToRawRows(table), delimiter);
}
