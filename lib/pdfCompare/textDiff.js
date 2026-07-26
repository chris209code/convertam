import { diffArrays } from './myersDiff';

// Groups a PDF.js text-content item list into visual lines by clustering
// items whose baseline y-coordinate is within a small tolerance — pdf.js
// gives per-glyph-run items with no inherent "line" concept, so this is the
// standard trick to recover something line-diff-able instead of one long
// run-on string per page (which is what the old implementation did).
function groupItemsIntoLines(items) {
  const rows = [];
  for (const item of items) {
    const y = item.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) < 2);
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push(item);
  }
  rows.sort((a, b) => b.y - a.y); // PDF y-axis grows upward; top of page first
  return rows
    .map((row) => row.items.sort((a, b) => a.transform[4] - b.transform[4]).map((it) => it.str).join(' ').replace(/\s+/g, ' ').trim())
    .filter((line) => line.length > 0);
}

export const MAX_COMPARE_PAGES = 60;

// Reads every page's lines from an already-loaded pdf.js document object.
export async function extractPageLines(pdf) {
  const pages = [];
  const pageCount = Math.min(pdf.numPages, MAX_COMPARE_PAGES);
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(groupItemsIntoLines(content.items));
  }
  return { pages, truncated: pdf.numPages > MAX_COMPARE_PAGES, totalPages: pdf.numPages };
}

function normalizeLine(text, { ignoreWhitespace }) {
  return ignoreWhitespace ? text.replace(/\s+/g, ' ').trim().toLowerCase() : text;
}

// Purely-numeric (optionally "Page X", "X of Y") short lines are the classic
// page-number footer/header — excluded from the diff so re-pagination alone
// doesn't manufacture noise on every single page.
function looksLikePageNumber(text) {
  const t = text.trim();
  if (t.length > 24) return false;
  return /^(page\s+)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?$/i.test(t);
}

function flattenPages(pages) {
  const tokens = [];
  pages.forEach((lines, pageIndex) => {
    lines.forEach((text) => tokens.push({ pageIndex, text }));
  });
  return tokens;
}

// Word-level LCS diff, scoped to a single pair of lines (small inputs, so
// the simple O(n*m) table is fine here — the expensive document-wide diff
// uses Myers instead).
function diffWordsInLine(a, b) {
  const wordsA = a.split(/(\s+)/);
  const wordsB = b.split(/(\s+)/);
  const n = wordsA.length, m = wordsB.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = wordsA[i] === wordsB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const result = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (wordsA[i] === wordsB[j]) { result.push({ type: 'same', text: wordsA[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { result.push({ type: 'removed', text: wordsA[i] }); i++; }
    else { result.push({ type: 'added', text: wordsB[j] }); j++; }
  }
  while (i < n) { result.push({ type: 'removed', text: wordsA[i] }); i++; }
  while (j < m) { result.push({ type: 'added', text: wordsB[j] }); j++; }
  return result;
}

// Builds the full comparison: a page-aware diff, change entries grouped
// into added/removed/modified blocks (a delete immediately followed by an
// insert is treated as one "modified" line, word-diffed for fine
// highlighting — the same heuristic unified-diff tools use), and a summary.
export function buildDiff(pagesA, pagesB, options = {}) {
  const { ignoreWhitespace = false, ignorePageNumbers = false } = options;

  const rawTokensA = flattenPages(pagesA);
  const rawTokensB = flattenPages(pagesB);

  const keep = (t) => !(ignorePageNumbers && looksLikePageNumber(t.text));
  const tokensA = rawTokensA.filter(keep);
  const tokensB = rawTokensB.filter(keep);

  const eq = (x, y) => normalizeLine(x.text, { ignoreWhitespace }) === normalizeLine(y.text, { ignoreWhitespace });
  const script = diffArrays(tokensA, tokensB, eq);

  // Pair up adjacent delete-runs and insert-runs into "modified" entries.
  const entries = [];
  let i = 0;
  while (i < script.length) {
    const op = script[i];
    if (op.type === 'equal') {
      entries.push({ type: 'equal', pageA: tokensA[op.aIndex].pageIndex, pageB: tokensB[op.bIndex].pageIndex, textA: tokensA[op.aIndex].text, textB: tokensB[op.bIndex].text });
      i++;
      continue;
    }
    const deletes = [];
    const inserts = [];
    let j = i;
    while (j < script.length && script[j].type === 'delete') { deletes.push(script[j]); j++; }
    while (j < script.length && script[j].type === 'insert') { inserts.push(script[j]); j++; }
    const pairCount = Math.min(deletes.length, inserts.length);
    for (let k = 0; k < pairCount; k++) {
      const dOp = deletes[k], iOp = inserts[k];
      const textA = tokensA[dOp.aIndex].text, textB = tokensB[iOp.bIndex].text;
      entries.push({
        type: 'modified',
        pageA: tokensA[dOp.aIndex].pageIndex,
        pageB: tokensB[iOp.bIndex].pageIndex,
        textA, textB,
        wordDiff: diffWordsInLine(textA, textB),
      });
    }
    for (let k = pairCount; k < deletes.length; k++) {
      const dOp = deletes[k];
      entries.push({ type: 'removed', pageA: tokensA[dOp.aIndex].pageIndex, pageB: null, textA: tokensA[dOp.aIndex].text });
    }
    for (let k = pairCount; k < inserts.length; k++) {
      const iOp = inserts[k];
      entries.push({ type: 'added', pageA: null, pageB: tokensB[iOp.bIndex].pageIndex, textB: tokensB[iOp.bIndex].text });
    }
    i = j;
  }

  // Page alignment: a page counts as matched with whichever opposite-side
  // page its "equal" lines most often line up with. A page with zero equal
  // lines at all is reported as wholly added/removed — the only case where
  // that claim is reliably determinable from line-level matching alone.
  const matchCounts = new Map(); // `${pageA}` -> Map(pageB -> count)
  entries.filter((e) => e.type === 'equal').forEach((e) => {
    if (!matchCounts.has(e.pageA)) matchCounts.set(e.pageA, new Map());
    const m = matchCounts.get(e.pageA);
    m.set(e.pageB, (m.get(e.pageB) || 0) + 1);
  });
  const matchedPagesA = new Set(matchCounts.keys());
  const matchedPagesB = new Set();
  matchCounts.forEach((m) => m.forEach((_, pB) => matchedPagesB.add(pB)));

  const pageAdditions = pagesB.map((_, idx) => idx).filter((idx) => !matchedPagesB.has(idx));
  const pageRemovals = pagesA.map((_, idx) => idx).filter((idx) => !matchedPagesA.has(idx));

  const pagesAffected = new Set();
  entries.forEach((e) => {
    if (e.type !== 'equal') {
      if (e.pageA != null) pagesAffected.add(`A${e.pageA}`);
      if (e.pageB != null) pagesAffected.add(`B${e.pageB}`);
    }
  });

  const summary = {
    added: entries.filter((e) => e.type === 'added').length,
    removed: entries.filter((e) => e.type === 'removed').length,
    modified: entries.filter((e) => e.type === 'modified').length,
    pagesAffectedCount: pagesAffected.size,
    pageAdditions,
    pageRemovals,
    totalPagesA: pagesA.length,
    totalPagesB: pagesB.length,
  };

  return { entries, summary };
}

// Ordered list of just the non-equal entries, for "next/previous difference" navigation.
export function changeEntries(entries) {
  return entries.filter((e) => e.type !== 'equal');
}
