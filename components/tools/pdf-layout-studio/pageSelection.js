// Shared "Page Selection" resolver for every rule-object element type
// (Page Numbers, Watermark, Footer, QR Code) — the one place all four now
// go through for "which pages does this apply to", replacing each type's
// own ad hoc all/current-only check (see each type module's earlier header
// comments, which explicitly deferred odd/even/custom support to this
// cross-cutting pass rather than half-building it four
// separate times). Consolidating here is what makes it cheap to have added
// odd/even/custom-range support once for every element type at once.

// Parses a user-typed page range like "1,3,5-8" (1-based, matching what a
// user would type) into a de-duplicated, sorted, in-bounds list of 0-based
// page indices. Silently drops anything unparseable or out of range rather
// than throwing — a typo in the range shouldn't fail the whole export, it
// should just not match that one term.
export function parseCustomRange(rangeStr, totalPages) {
  const out = new Set();
  (rangeStr || '').split(',').forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) return;
    const rangeMatch = trimmed.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Math.max(1, parseInt(rangeMatch[1], 10));
      const end = Math.min(totalPages, parseInt(rangeMatch[2], 10));
      for (let i = start; i <= end; i++) out.add(i - 1);
    } else if (/^\d+$/.test(trimmed)) {
      const n = parseInt(trimmed, 10);
      if (n >= 1 && n <= totalPages) out.add(n - 1);
    }
  });
  return [...out].sort((a, b) => a - b);
}

// rule: 'all' | 'current' | 'odd' | 'even' | 'custom'
// ownPage: the 0-based page the object itself is placed on — used for both
// 'current' and as the fallback if 'custom' has no usable range.
export function resolveTargetPages(rule, customRange, ownPage, totalPages) {
  const allIdx = Array.from({ length: totalPages }, (_, i) => i);
  if (rule === 'current') return [ownPage];
  if (rule === 'odd') return allIdx.filter((i) => (i + 1) % 2 === 1);
  if (rule === 'even') return allIdx.filter((i) => (i + 1) % 2 === 0);
  if (rule === 'custom') {
    const parsed = parseCustomRange(customRange, totalPages);
    return parsed.length ? parsed : [ownPage];
  }
  return allIdx; // 'all'
}
