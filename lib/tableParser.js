// Shared table parsing + validation for AI Data Analyst. Extracted into its
// own module (same pattern as dataAnalysisEngine.js) so parsing reliability
// is independently testable and applied uniformly across every input path
// — paste, Excel, image, and PDF — rather than paste being the one fragile,
// ad-hoc path while everything else goes through a real library or Gemini.

const DELIMITER_CANDIDATES = ['\t', ',', ';'];

function splitLine(line, delimiter) {
  if (delimiter === ' ') return line.trim().split(/\s{2,}/); // whitespace-delimited: 2+ spaces as separator
  if (delimiter === '\t') {
    // A line can legitimately use multiple spaces instead of a real tab
    // character — most commonly the header row itself, since it's often
    // manually aligned or pasted from a slightly different source than the
    // data rows below it. Treating a run of 2+ spaces as equivalent to a
    // tab here means that mismatch doesn't cause the header to be
    // misidentified as a title row and skipped.
    return line.split(/\t+|\s{2,}/);
  }
  return line.split(delimiter);
}

function modeOf(arr) {
  const counts = {};
  arr.forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
  return Number(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]);
}

// Picks whichever delimiter produces the most CONSISTENT column count
// across sampled lines, not just whichever character appears in the first
// line — this is what lets a title row above the real header not derail
// delimiter detection.
export function detectDelimiter(lines) {
  const sample = lines.slice(0, Math.min(10, lines.length));
  let best = { delimiter: ',', score: -1, columnCount: 1 };
  for (const delimiter of [...DELIMITER_CANDIDATES, ' ']) {
    const counts = sample.map((l) => splitLine(l, delimiter).length);
    const nonTrivial = counts.filter((c) => c > 1);
    if (!nonTrivial.length) continue;
    const mode = modeOf(nonTrivial);
    const matching = nonTrivial.filter((c) => c === mode).length;
    const score = (matching / sample.length) * mode; // rewards both consistency and column richness
    if (score > best.score) best = { delimiter, score, columnCount: mode };
  }
  return best;
}

// Finds the real header row, skipping any optional title row(s) above it.
// The header row is identified as the first line whose cell count matches
// the majority column count detected across the sample — a title row
// typically has far fewer cells than the real table.
export function findHeaderRowIndex(lines, delimiter, expectedColumnCount) {
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cells = splitLine(lines[i], delimiter).map((c) => c.trim());
    if (cells.length === expectedColumnCount && cells.some((c) => c !== '')) return i;
  }
  return 0;
}

// If the row immediately after the detected header looks like a units row
// (short tokens, recognizable unit words, same cell count as the header),
// merge it into the header names instead of treating it as a data row —
// e.g. "Production" + "kg" becomes "Production (kg)".
const UNIT_TOKEN_RE = /^(%|kg|g|l|ml|hl|hrs?|min|days?|units?|pcs|\$|₦|€|£|usd|ngn|eur)$/i;
export function mergeWrappedHeaders(headerCells, nextRowCells) {
  if (!nextRowCells || nextRowCells.length !== headerCells.length) return { merged: headerCells, consumed: false };
  const looksLikeUnitsRow = nextRowCells.every((c) => c.trim() === '' || UNIT_TOKEN_RE.test(c.trim()) || c.trim().length <= 4);
  const hasAtLeastOneRealUnit = nextRowCells.some((c) => UNIT_TOKEN_RE.test(c.trim()));
  if (looksLikeUnitsRow && hasAtLeastOneRealUnit) {
    const merged = headerCells.map((h, i) => (nextRowCells[i]?.trim() ? `${h} (${nextRowCells[i].trim()})` : h));
    return { merged, consumed: true };
  }
  return { merged: headerCells, consumed: false };
}

// Full pasted-table parser: detects delimiter, skips optional title rows,
// merges a wrapped units row if present, trims every cell, and reports a
// raw column-count consistency ratio computed BEFORE normalization (the
// signal that would otherwise be lost once every row gets padded out to
// match the header's column count).
export function parsePastedTable(text) {
  const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim() !== '');
  if (!lines.length) return { columns: [], rows: [], skippedTitleRows: 0, mergedHeaderRow: false, rawConsistencyRatio: 0 };

  const { delimiter, columnCount } = detectDelimiter(lines);
  const headerIdx = findHeaderRowIndex(lines, delimiter, columnCount);

  let headerCells = splitLine(lines[headerIdx], delimiter).map((c) => c.trim());
  let dataStartIdx = headerIdx + 1;
  let mergedHeaderRow = false;

  if (dataStartIdx < lines.length) {
    const nextCells = splitLine(lines[dataStartIdx], delimiter).map((c) => c.trim());
    const { merged, consumed } = mergeWrappedHeaders(headerCells, nextCells);
    if (consumed) { headerCells = merged; dataStartIdx += 1; mergedHeaderRow = true; }
  }

  const columns = headerCells.map((c, i) => c || `Column ${i + 1}`);
  const dataLines = lines.slice(dataStartIdx);

  const rawCellCounts = dataLines.map((line) => splitLine(line, delimiter).length);
  const matchingRaw = rawCellCounts.filter((c) => c === columns.length).length;
  const rawConsistencyRatio = dataLines.length ? matchingRaw / dataLines.length : 0;

  const rows = dataLines.map((line) => {
    const cells = splitLine(line, delimiter);
    const row = {};
    columns.forEach((col, i) => { row[col] = (cells[i] ?? '').trim(); });
    return row;
  });

  return { columns, rows, skippedTitleRows: headerIdx, mergedHeaderRow, delimiter, rawConsistencyRatio };
}

// Applied uniformly to the result of every input path — paste, Excel,
// image-extraction, PDF-extraction — so confidence is reported the same
// way regardless of source, and a genuinely malformed table is rejected
// rather than silently analyzed. `rawConsistencyRatio` is an optional hint
// from parsers that have it (paste); sources without it (Excel via a real
// library, or Gemini-extracted tables) default to full trust on that
// dimension since their underlying parser is already more reliable.
// Catches the header row itself being data that leaked upward (e.g. a
// month value or a raw number ending up as a "column name") — a strong
// signal something went wrong upstream in header detection, regardless of
// how well-formed the rest of the table otherwise looks.
function looksLikeDataNotLabel(headerCell) {
  const s = String(headerCell).trim();
  if (!s) return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return true; // a bare number, e.g. "4320" or "78.4"
  if (/^\d{1,2}[/\-.]\d{1,2}([/\-.]\d{2,4})?$/.test(s)) return true; // a date-shaped value, e.g. "01/24"
  if (/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-\s]\d{2,4}$/i.test(s)) return true; // e.g. "Jan-24"
  return false;
}

export function validateParsedTable(columns, rows, rawConsistencyRatio = 1) {
  if (!columns.length || !rows.length) {
    return { confidence: 0, level: 'low', rejected: true, message: 'We could not confidently reconstruct your table. Please review the detected table below or upload the file.' };
  }

  const nonEmptyHeaders = columns.filter((c) => c && String(c).trim() !== '');
  const uniqueHeaders = new Set(nonEmptyHeaders.map((c) => String(c).toLowerCase().trim()));
  const headerQuality = columns.length ? uniqueHeaders.size / columns.length : 0;

  // Fill ratio: a column that's almost entirely empty across every row is a
  // sign of column misalignment (rows had fewer real fields than headers),
  // even though normalization already padded every row out to full width.
  const fillRatios = columns.map((col) => {
    const filled = rows.filter((r) => r[col] !== undefined && String(r[col]).trim() !== '').length;
    return rows.length ? filled / rows.length : 0;
  });
  const avgFillRatio = fillRatios.reduce((a, b) => a + b, 0) / fillRatios.length;

  const suspiciousHeaderCount = columns.filter(looksLikeDataNotLabel).length;
  const headersLookLikeData = suspiciousHeaderCount > 0;

  let confidence = Math.round(rawConsistencyRatio * 40 + headerQuality * 25 + avgFillRatio * 35);
  // Headers that look like data values are never allowed to score high
  // confidence, regardless of how consistent the rest of the table is —
  // this is exactly the "reports 100% confidence while the header row is
  // actually wrong" failure mode, closed as a hard rule, not just a nudge.
  if (headersLookLikeData) confidence = Math.min(confidence, 55);

  const level = confidence >= 80 ? 'high' : confidence >= 55 ? 'medium' : 'low';
  const rejected = confidence < 40 || columns.length < 2 || rows.length < 1;

  return {
    confidence, level, rejected, headersLookLikeData,
    message: rejected ? 'We could not confidently reconstruct your table. Please review the detected table below or upload the file.' : '',
  };
}
