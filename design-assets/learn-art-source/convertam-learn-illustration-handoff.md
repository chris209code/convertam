# Convertam Learn Illustration Handoff

## Purpose

These boards are visual design direction for the Learn Center illustration refresh. They are not implementation files yet. Use them to create final optimized local assets for the Learn homepage hero, Learn category artwork, and article-card illustrations.

## Files

- `convertam-learn-category-board.png`
  - Learn homepage hero concept
  - PDF Guides
  - AI Guides
  - Business Documents
  - Image Guides
  - Calculator Guides
  - Productivity Guides
  - Workflow Guides

- `convertam-learn-article-board-1-pdf-ai-business.png`
  - How to Merge PDF Files Without Losing Quality
  - How to Compress a PDF Without Losing Quality
  - How to Convert PDF to Word Without Breaking Formatting
  - What Is OCR, and When Do You Need It?
  - How AI Document Translation Actually Works
  - Can AI Actually Improve Your Resume?
  - Invoice vs. Quotation vs. Delivery Note
  - How to Create a Professional Invoice

- `convertam-learn-article-board-2-image-calculator-productivity.png`
  - Are Digital Signatures Legally Binding?
  - JPG vs. PNG: Which Should You Use?
  - How to Compress Images Without Losing Quality
  - How to Scan a Document With Your Phone
  - How Loan Amortization Works
  - VAT Explained for Small Businesses
  - Profit Margin vs. Markup
  - How to Build a Strong Password

- `convertam-learn-article-board-3-workflows.png`
  - QR Codes for Business
  - How to Organize and Name Your Documents
  - From Scan to Signed PDF Workflow
  - Invoice to Payment Workflow
  - How to Batch Sign Multiple Documents

## Implementation Notes

- Preserve Learn Center copy, routing, metadata, business logic, backend code, and article content.
- Replace the existing mixed SVG/motif artwork with a consistent premium Convertam Learn illustration system.
- Use optimized local WebP assets for runtime.
- Keep source PNGs separately if useful.
- Do not reuse homepage category art or tool-card art directly.
- Each article should have a unique semantic illustration.
- Keep artwork readable inside the existing article-card size.
- Do not redesign Learn layouts or move components.
- Verify `/learn`, one Learn category page, and one Learn article page on desktop and mobile.
- Run lint, type-check, and production build before committing.
