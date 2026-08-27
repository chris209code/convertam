// Prompt for AI-based payslip document understanding — the PRIMARY
// extraction method, not a fallback. Payslips from different companies and
// countries use completely different layouts, column sets, and
// terminology, so no fixed set of keyword/position rules generalizes
// across them; a vision model reading the document the way a person would
// — noticing its sections, its table headers, which column is which — is
// what actually generalizes. Do not add per-company special-casing here;
// if a real payslip is misread, the fix is a clearer general instruction
// below, not a rule for that one layout.
export function buildPayslipPrompt() {
  return `You are an expert payslip reader. You have been given images of every page of ONE payslip, in order. Read it the way a careful accountant would: first understand its layout and sections, then its table structure, and only then extract figures.

STEP 1 — UNDERSTAND THE DOCUMENT
Identify the document's sections (they may be labeled differently across payslips, e.g. "Earnings"/"Income", "Deductions"/"Withholdings", "Employer Contributions"/"Company Contributions", "Net Pay"/"Take-Home Pay") and, for every table, read its column headers before reading any row. A payslip's earnings/deductions table can include columns such as Current, YTD (Year-to-Date), Previous, Balance, Qty/Quantity, Rate, Tax Code, or others — the same row often has several numbers, only one of which is the amount you want.

STEP 2 — READ VALUES BY COLUMN, NEVER BY POSITION
Determine every amount from the column it is actually printed under, never by assuming "the first number" or "the number closest to the label." For example, a row printed as:
  Qty | Current | Tax Code | YTD Amount
  Basic Pay      176   302,546.45   1257L   2,420,371.60
must be read as: Qty = 176, Current = 302,546.45, Tax Code = 1257L, YTD Amount = 2,420,371.60. The value you extract for Basic Pay is 302,546.45 (the CURRENT-period column) — never 176 (that's a quantity, not an amount), never 2,420,371.60 (that's the running year-to-date total), and never a tax code. Apply this same column-aware reading to every row and every field below, on every page.

STEP 3 — RECOGNIZE EQUIVALENT TERMINOLOGY
Different payslips use different words for the same thing. Use the meaning, not the exact wording. For example: "Gross Pay", "Gross Salary", "Total Earnings", and "Total Gross" all mean gross earnings. "PAYE", "PIT", and "Income Tax" all mean the same statutory tax deduction. Recognize country- and company-specific terms the same way based on context (e.g. what section they appear in, and whether they add to or subtract from pay).

STEP 4 — EXTRACT LINE ITEMS INDIVIDUALLY
List every distinct allowance, bonus/commission/overtime payment, and deduction as its own entry with its own printed label (in the "allowances", "bonuses", and "deductions" arrays) and its CURRENT-period amount — do not merge several lines into one combined figure, and do not invent a combined total that isn't printed on the payslip. Employer-paid amounts (e.g. an employer's own pension contribution, which is not deducted from the employee) go in "contributions", never in "deductions".

STEP 5 — NEVER GUESS
For every field, set status to:
- "confirmed" only when you can clearly read the value from the document.
- "needs_verification" when a number is present but hard to read clearly (blurry, cut off, overlapping text, ambiguous which column it belongs to).
- "not_found" when the payslip simply does not show that field at all.
Never invent, estimate, or calculate a value to fill in a field that is missing or unclear — an empty or uncertain field is a completely normal, expected result. In particular: if the currency is not clearly stated or shown (a symbol, code, or explicit name), set currency.status to "not_found" — do not guess a currency from the country, language, or company name. If the pay frequency cannot be determined from explicit text (not just from the fact that most payslips are monthly), set payFrequency.status to "not_found" — do not default to "monthly" or any other assumption.

STEP 6 — RECONCILE
After extracting grossEarnings, totalDeductions, and netPay (when all three are confirmed or need_verification, i.e. not "not_found"), check whether grossEarnings minus totalDeductions is approximately equal to netPay (allow for normal rounding, roughly within 1%). If it reconciles, set reconciliationNote to an empty string. If it does NOT reconcile, do not silently adjust any number — instead write a short, specific reconciliationNote describing the mismatch (e.g. "Gross minus deductions is 12,000 higher than the stated net pay — there may be an unlisted deduction.").

Return ONLY the structured JSON matching the provided schema — no extra commentary.`;
}
