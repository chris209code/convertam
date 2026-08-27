// Prompt for the payslip AI-extraction fallback. Only ever called when the
// user explicitly clicks "Try AI extraction" after local layout parsing/OCR
// couldn't reliably read a payslip — so the instructions below matter as
// much for what they forbid (guessing, estimating, using YTD figures) as
// for what they ask the model to find.
export function buildPayslipPrompt() {
  return `You are reading ONE payslip (a pay stub / salary slip) and extracting specific figures from it.

CRITICAL RULES — follow these exactly:
1. Only report a value that is EXPLICITLY printed on the payslip. Never estimate, calculate, infer, or guess a figure that is not directly stated.
2. If a field is not present on the payslip, or you are not confident you can read it correctly, set "found": false for that field and leave the value out. Do NOT put your best guess in a field just because it's a common payslip line item.
3. Many payslips show BOTH a "Current" (this pay period) amount AND a "YTD" (year-to-date, cumulative) amount for the same line item, often in two separate columns. You must extract the CURRENT PERIOD amount for every field below — never the YTD/cumulative figure. If you can only find a YTD figure and cannot clearly identify a separate current-period amount for that line, set "found": false for it rather than reporting the YTD number.
4. "label" (where requested) should be the exact or near-exact wording used on the payslip for that line (e.g. "PIT" if that's what it says, not "PAYE").
5. currencyCode must be a real ISO 4217 currency code (e.g. NGN, USD, GBP) inferred only from an explicit currency symbol, code, or clearly stated country/employer location on the payslip. If genuinely unclear, set found: false.
6. payPeriod must be exactly one of: "hourly", "daily", "weekly", "biweekly", "monthly", "annually" — based on explicit evidence on the payslip (a stated pay frequency, or the pay period dates shown). If unclear, set found: false.

Fields to extract (all current-period, not YTD):
- basicPay — Basic Pay / Basic Salary
- grossEarnings — Gross Pay / Gross Salary / Total Earnings (the sum of all earnings before deductions)
- allowances — total of any allowances (housing, transport, meal, etc.) shown as earnings
- bonuses — any bonus/incentive/commission amount shown as earnings
- paye — PAYE / PIT / Income Tax deduction
- pension — Pension contribution deduction
- nhf — NHF (National Housing Fund) deduction
- otherDeductions — any other deduction not covered above
- totalDeductions — the stated total of all deductions, if the payslip shows one
- netPay — Net Pay / Net Salary / Take-Home Pay
- payPeriod — the pay frequency this payslip covers
- currencyCode — the ISO currency code this payslip is denominated in

Return ONLY the structured JSON matching the provided schema.`;
}
