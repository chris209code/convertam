// Deterministic table detection, built on top of the confidence-scored
// parser AI Data Analyst already uses for pasted tables (lib/tableParser.js)
// — reused rather than reimplemented, since delimiter detection, header-row
// finding, and confidence scoring are exactly the same problem here.
//
// A CSV file (or a direct xlsx read from ingest.js) IS the table — no
// detection needed. A PDF/DOCX/TXT extraction is free-form text that MAY
// contain one or more tables mixed in with prose, so those go through a
// block-splitting pass first: paragraphs (blank-line-separated runs of
// text) are individually tested as table candidates, and only blocks that
// validate as a real table are kept — a paragraph of ordinary prose does
// not get misreported as a low-quality table.

import { parsePastedTable, validateParsedTable } from '@/lib/tableParser';

const MAX_TABLES = 10;
const MIN_LINES_PER_BLOCK = 2;

function splitIntoBlocks(text) {
  return text
    .split(/\n\s*\n+/)
    .map((b) => b.trim())
    .filter((b) => b.split('\n').filter((l) => l.trim()).length >= MIN_LINES_PER_BLOCK);
}

function detectFromFreeText(rawText) {
  const blocks = splitIntoBlocks(rawText);
  const tables = [];
  for (const block of blocks) {
    if (tables.length >= MAX_TABLES) break;
    const { columns, rows, rawConsistencyRatio, headerCountMismatch } = parsePastedTable(block);
    if (!columns.length || !rows.length) continue;
    const validation = validateParsedTable(columns, rows, rawConsistencyRatio, headerCountMismatch);
    // A block that reads as ordinary prose (parsePastedTable falls back to
    // one giant "Column 1" with the whole paragraph as a single row) isn't
    // a real table — require at least 2 real columns and low rejection.
    if (validation.rejected || columns.length < 2) continue;
    tables.push({ columns, rows, confidence: validation.confidence, level: validation.level, source: 'detected' });
  }
  return tables;
}

// `ingestResult` is whatever lib/smartParser/ingest.js returned. Returns a
// flat array of tables (possibly empty) — the single shape every UI/export
// consumer works with, regardless of whether the source was a ground-truth
// xlsx read or a heuristically-detected block inside a PDF.
export function detectTables(ingestResult) {
  if (ingestResult.table) return [ingestResult.table]; // xlsx: already ground truth
  if (ingestResult.kind === 'csv') {
    const { columns, rows, rawConsistencyRatio, headerCountMismatch } = parsePastedTable(ingestResult.rawText);
    if (!columns.length || !rows.length) return [];
    const validation = validateParsedTable(columns, rows, rawConsistencyRatio, headerCountMismatch);
    return [{ columns, rows, confidence: validation.confidence, level: validation.level, source: 'csv', rejected: validation.rejected, message: validation.message }];
  }
  if (!ingestResult.rawText) return [];
  return detectFromFreeText(ingestResult.rawText);
}
