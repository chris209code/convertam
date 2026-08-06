// Cleans extracted PDF page text before it ever reaches the AI: strips
// running headers/footers repeated across most pages, page-number lines,
// and drops pages that are effectively empty (cover pages, section
// dividers). This is the first step of Summarize PDF's pipeline — the goal
// is to remove noise that adds tokens without adding meaning, before any
// AI call happens.

// Deliberately does NOT normalize away digits: a running header/footer like
// "CONVERTAM INTERNAL REPORT" is genuinely identical on every page, but a
// section heading like "Chapter 1: Section 5" would ALSO collapse to the
// same normalized form as "Chapter 1: Section 6" if digits were wildcarded
// — silently misclassifying real, page-varying content as repeated
// boilerplate and stripping it. Page numbers embedded in an otherwise-
// static line (e.g. "Page 5 of 55") are handled separately below by
// isPageNumberLine's dedicated patterns, which don't have this failure mode
// since they match the whole line's structure, not just presence of digits.
function normalizeLine(line) {
  return line.trim().replace(/\s+/g, ' ').toLowerCase();
}

const PAGE_NUMBER_PATTERNS = [
  /^\d+$/,
  /^page\s+\d+(\s+of\s+\d+)?$/i,
  /^-\s*\d+\s*-$/,
  /^\[\s*\d+\s*\]$/,
];

function isPageNumberLine(line) {
  return PAGE_NUMBER_PATTERNS.some((re) => re.test(line));
}

// Compares the first/last couple of lines on every page; a line that (once
// normalized) recurs on more than half the pages is treated as a repeated
// header/footer and stripped from all of them. Only checks the edges of
// each page — a coincidentally repeated sentence in the middle of unrelated
// pages is not a header/footer and must not be touched.
export function detectRepeatedLines(pages, { edgeLines = 2, threshold = 0.5 } = {}) {
  if (pages.length < 3) return new Set(); // too few pages for "repeated" to mean anything
  const counts = new Map();
  for (const page of pages) {
    const lines = page.text.split('\n').map((l) => l.trim()).filter(Boolean);
    const edges = [...lines.slice(0, edgeLines), ...lines.slice(-edgeLines)];
    const seenOnThisPage = new Set(edges.map(normalizeLine).filter(Boolean));
    for (const normalized of seenOnThisPage) {
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    }
  }
  const minCount = Math.ceil(pages.length * threshold);
  const repeated = new Set();
  for (const [normalized, count] of counts) {
    if (count >= minCount) repeated.add(normalized);
  }
  return repeated;
}

function stripLines(text, repeatedLines) {
  return text
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true; // blank lines collapsed later, keep for now
      if (isPageNumberLine(trimmed)) return false;
      if (repeatedLines.has(normalizeLine(trimmed))) return false;
      return true;
    })
    .join('\n');
}

export function removeEmptyPages(pages, { minChars = 10 } = {}) {
  return pages.filter((page) => page.text.trim().length >= minChars);
}

// Runs the full cleaning pipeline over a { number, text } pages array.
// Original page numbers are preserved on surviving pages (never
// renumbered) so a page-range selection or a later "what does page N
// discuss" lookup still means what the user thinks it means.
export function cleanPages(pages) {
  const repeatedLines = detectRepeatedLines(pages);
  const stripped = pages.map((page) => ({
    ...page,
    text: stripLines(page.text, repeatedLines).replace(/\n{3,}/g, '\n\n').trim(),
  }));
  return removeEmptyPages(stripped);
}
