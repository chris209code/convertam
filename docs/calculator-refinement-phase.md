# Financial Calculator Refinement Phase (planned, not started)

This phase is deliberately deferred until every flagship financial
calculator (Salary, Expense & Budget, Loan, VAT, and any others added to
that suite) is complete. Do not begin any of the items below until that
suite is finished and the user explicitly starts this phase.

## Planned shared improvements

1. **Professional multi-page PDF reports** instead of the current
   long screenshot-style exports (html2canvas + jsPDF of the on-screen
   summary panel).
2. **Shared report renderer** used by all financial calculators, so
   each tool doesn't reinvent its own export pipeline.
3. **Proper A4 pagination** with repeated table headers where
   applicable (e.g. the Loan Calculator's amortization schedule).
4. **Shared report styling, branding, and page numbering** across every
   calculator's exported report.
5. **Loan Calculator enhancement**:
   - Calendar-based Start Date and End/Maturity Date inputs.
   - Optional "Running Loan" mode.
   - Payment schedule generated from the actual dates entered, instead
     of assuming repayment starts next month.

## Status

Not started. Recorded here on 2026-07-20 per explicit instruction to
defer this work until the flagship calculator suite is done.
