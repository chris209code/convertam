// Layout-aware payslip field extraction — the shared engine behind BOTH
// the text-PDF path (pdfLayout.js feeds it pdf.js's positioned text items)
// and the OCR path (ocr.js feeds it Tesseract's positioned words). Neither
// adapter does its own field-matching; this is the one place that decides
// "this number belongs to that label," so the two paths can never disagree
// about how a payslip is read.
//
// Deliberately NOT a flat keyword search over the whole text: a real
// payslip is a table (Basic Pay / Gross Earnings / Allowances under
// "Income", PAYE / Pension / NHF under "Deductions", often a Current AND a
// YTD amount column side by side). Reconstructing rows and columns from
// each text item's own (x, y) position — the same idea a human's eye uses
// reading the page — is what lets this tell "PAYE  45,000  540,000" apart
// as one deduction row with a current-period amount and a running total,
// rather than just grabbing the first number near the word "PAYE" and
// risking the YTD figure instead.
import { AMOUNT_FIELD_KEYS, emptyFieldResult, fieldDef } from './fields';
import { ALL_CURRENCIES } from '@/components/tools/salary-calculator/currencies';

// Order matters only where one pattern could otherwise shadow another
// (none currently do — "gross"/"total earnings" vs "total deductions" vs
// "other deductions" are all mutually exclusive by wording).
const FIELD_LABEL_PATTERNS = {
  basicPay: /\bbasic\s*(pay|salary)?\b/i,
  grossEarnings: /\b(gross\s*(pay|salary|earnings)?|total\s*earnings)\b/i,
  allowances: /\ballowances?\b/i,
  bonuses: /\bbonus(es)?\b/i,
  paye: /\b(paye|pit|income\s*tax)\b/i,
  pension: /\bpension\b/i,
  nhf: /\bnhf\b/i,
  otherDeductions: /\bother\s*deductions?\b/i,
  totalDeductions: /\btotal\s*deductions?\b/i,
  netPay: /\bnet\s*(pay|salary)\b|\btake[\s-]?home\b/i,
};

// Section headers a payslip's own table is organized under — tracked while
// walking rows top-to-bottom so an ambiguous label (rare, but e.g. some
// payslips list a "Tax Relief" note near Earnings AND a real "Tax" line
// under Deductions) resolves to the row actually inside the right section
// rather than whichever happens to appear first on the page.
const SECTION_PATTERNS = [
  { id: 'earnings', re: /\b(earnings|income)\b/i },
  { id: 'deductions', re: /\bdeductions?\b/i },
  { id: 'contributions', re: /\b(company|employer)\s*contributions?\b/i },
  { id: 'netpay', re: /\bnet\s*pay\b/i },
];

const NUMERIC_TOKEN_RE = /^\(?[$£€¥₦₹]?-?\d{1,3}(?:[,\s]\d{3})*(?:\.\d+)?\)?$/;

function parseNumericToken(raw) {
  const negative = /^\(.*\)$/.test(raw.trim()) || raw.trim().startsWith('-');
  const digits = raw.replace(/[^\d.]/g, '');
  if (!digits) return null;
  const n = parseFloat(digits);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

// Groups items into rows by y-proximity, then left-to-right within each
// row by x — the two passes that turn a flat list of positioned text runs
// back into a table. Coordinates are assumed already normalized so y
// increases DOWN the page (pdfLayout.js/ocr.js are responsible for that;
// PDF's own coordinate space has y increasing upward, so its adapter flips
// it before handing items here).
function clusterRows(items, yTolerance) {
  const sorted = [...items].sort((a, b) => a.y - b.y);
  const rows = [];
  for (const item of sorted) {
    let row = rows.find((r) => Math.abs(r.y - item.y) <= yTolerance);
    if (!row) { row = { y: item.y, items: [] }; rows.push(row); }
    row.items.push(item);
    row.y = (row.y * (row.items.length - 1) + item.y) / row.items.length;
  }
  rows.sort((a, b) => a.y - b.y);
  rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));
  return rows;
}

// Splits one row's items into its label text (everything before the first
// numeric-looking token) and an ordered list of numeric tokens with their
// x position — the label/number split a table row actually has, not just
// "does this line contain this word."
function analyzeRow(row) {
  const numericTokens = [];
  const labelParts = [];
  let seenNumber = false;
  for (const it of row.items) {
    const s = (it.str || '').trim();
    if (!s) continue;
    if (NUMERIC_TOKEN_RE.test(s)) {
      const value = parseNumericToken(s);
      if (value != null) { numericTokens.push({ value, x: it.x }); seenNumber = true; continue; }
    }
    if (!seenNumber) labelParts.push(s);
  }
  return { labelText: labelParts.join(' ').trim(), numericTokens };
}

// Looks for a header row naming a "Current"/"This Period" column and a
// "YTD"/"Year To Date" column, and records each one's x position — when
// found, this is what lets a field's value be picked by which column it's
// actually under rather than just "the first number on the line."
function detectHeaderColumns(rows) {
  for (const row of rows) {
    const currentItem = row.items.find((i) => /^(current|this\s*period|curr\.?)$/i.test((i.str || '').trim()) || /current/i.test((i.str || '').trim()));
    const ytdItem = row.items.find((i) => /ytd|year[\s-]?to[\s-]?date/i.test((i.str || '').trim()));
    if (currentItem && ytdItem) return { currentX: currentItem.x, ytdX: ytdItem.x };
  }
  return null;
}

// Which of a row's numeric tokens is the CURRENT-period figure — the whole
// point of being layout-aware rather than a flat text search: a payslip
// with both Current and YTD amounts must never let the YTD figure silently
// become "the" value the calculator uses.
function pickCurrentValue(numericTokens, headerColumns) {
  if (!numericTokens.length) return null;
  if (numericTokens.length === 1) return numericTokens[0];
  if (headerColumns) {
    const beforeYtd = numericTokens.filter((t) => t.x < headerColumns.ytdX + 5);
    if (beforeYtd.length) {
      return [...beforeYtd].sort((a, b) => Math.abs(a.x - headerColumns.currentX) - Math.abs(b.x - headerColumns.currentX))[0];
    }
  }
  // No detected header, or nothing clearly fell left of the YTD column —
  // fall back to the near-universal convention that the current-period
  // amount is the leftmost figure on the line, YTD (if shown at all)
  // trailing after it.
  return numericTokens[0];
}

function findFieldValue(analyzedRows, fieldKey, headerColumns) {
  const pattern = FIELD_LABEL_PATTERNS[fieldKey];
  const def = fieldDef(fieldKey);
  let candidate = null;
  for (const row of analyzedRows) {
    if (!row.labelText || !row.numericTokens.length) continue;
    if (!pattern.test(row.labelText)) continue;
    const inSection = !def.section || row.section === def.section;
    if (!candidate) candidate = { row, inSection };
    if (inSection) { candidate = { row, inSection }; break; } // first correctly-sectioned match wins outright
  }
  if (!candidate) return { found: false, amount: null, label: '' };
  const picked = pickCurrentValue(candidate.row.numericTokens, headerColumns);
  if (picked == null) return { found: false, amount: null, label: candidate.row.labelText };
  return { found: true, amount: picked.value, label: candidate.row.labelText };
}

function detectPayPeriod(fullText) {
  const labeled = fullText.match(/\bpay\s*(period|frequency)\b[:\s-]*([A-Za-z-]+)/i);
  const scope = labeled ? labeled[2] : fullText;
  if (/bi[\s-]?weekly|fortnightly/i.test(scope)) return { found: true, value: 'biweekly' };
  if (/annual|yearly/i.test(scope)) return { found: true, value: 'annually' };
  if (/weekly/i.test(scope)) return { found: true, value: 'weekly' };
  if (/monthly/i.test(scope)) return { found: true, value: 'monthly' };
  if (/daily/i.test(scope)) return { found: true, value: 'daily' };
  if (/hourly/i.test(scope)) return { found: true, value: 'hourly' };
  return { found: false, value: '' };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectCurrency(fullText) {
  // Symbols first — every symbol in this app's own currency list is
  // unambiguous by construction (CAD/AUD/SGD/etc. use prefixed forms like
  // CA$/A$/S$ specifically so a bare $/£/€/¥ never collides with them).
  // A handful of symbols are themselves plain letters (ZAR's "R", for
  // instance) — a naive substring check would "find" one inside completely
  // unrelated words like "CURRENT" or "CURRENCY", so every symbol is
  // matched as its own isolated token (not glued to other letters/digits
  // on either side), not just "appears somewhere in the text."
  for (const c of ALL_CURRENCIES) {
    if (!c.symbol) continue;
    const re = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(c.symbol)}(?![A-Za-z0-9])`);
    if (re.test(fullText)) return { found: true, value: c.code };
  }
  for (const c of ALL_CURRENCIES) {
    if (new RegExp(`\\b${c.code}\\b`).test(fullText)) return { found: true, value: c.code };
  }
  return { found: false, value: '' };
}

// items: [{ str, x, y }] — one entry per text run/word, already normalized
// so y increases downward the page. yTolerance is in the same units as x/y
// (PDF points for the pdf.js adapter, image pixels for the OCR adapter) —
// each adapter picks a value matched to its own coordinate scale.
export function extractPayslipFieldsFromItems(items, { yTolerance = 5 } = {}) {
  if (!items.length) return { fields: emptyFieldResult(), usedColumnHeuristic: true };

  const rows = clusterRows(items, yTolerance);
  const headerColumns = detectHeaderColumns(rows);

  let currentSection = null;
  const analyzedRows = rows.map((row) => {
    const info = analyzeRow(row);
    if (!info.numericTokens.length && info.labelText) {
      const match = SECTION_PATTERNS.find((p) => p.re.test(info.labelText));
      if (match) currentSection = match.id;
    }
    return { ...info, section: currentSection };
  });

  const fields = emptyFieldResult();
  for (const key of AMOUNT_FIELD_KEYS) fields[key] = findFieldValue(analyzedRows, key, headerColumns);

  const fullText = items.map((i) => i.str).join(' ');
  fields.payPeriod = detectPayPeriod(fullText);
  fields.currencyCode = detectCurrency(fullText);

  return { fields, usedColumnHeuristic: !headerColumns };
}

// Merges per-page extraction results for a multi-page payslip — most real
// payslips fit on one page, but a multi-page one might split Earnings and
// Deductions across pages, or repeat a header on page 2. Earlier pages win
// on conflict (a field found on page 1 is trusted over the same field
// re-detected differently on page 2), and usedColumnHeuristic is true only
// if every page had to fall back to it.
export function mergePageResults(pageResults) {
  const fields = emptyFieldResult();
  for (const key of [...AMOUNT_FIELD_KEYS, 'payPeriod', 'currencyCode']) {
    for (const r of pageResults) {
      if (r.fields[key]?.found) { fields[key] = r.fields[key]; break; }
    }
  }
  return { fields, usedColumnHeuristic: pageResults.every((r) => r.usedColumnHeuristic) };
}
