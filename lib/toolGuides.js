// Structured data for the Universal Tool Guide framework — the floating
// "Quick Guide" (split-screen panel on desktop, bottom sheet on mobile),
// plus the Full FAQ / Related Tools sections rendered below the tool. Only
// tools with an entry here get the new guide UI (see
// components/ToolPageClient.js); every other tool keeps its existing
// steps/tips/related rendering untouched.
//
// Every entry follows the same seven-part shape:
//   title        — panel header, e.g. "PDF to Word Guide"
//   what         — opening paragraph: what the tool actually does
//   whenToUse    — a sentence or two on when this is the right tool to reach for
//   steps        — "Step-by-step workflow", [{ title, body }] or plain strings
//   tips         — "Tips for best results", short bullet list
//   mistakes     — "Common mistakes to avoid", short bullet list
//   quickFaqs    — "Quick FAQs" shown in the guide panel (reused as fullFaqs below the tool)
//   fullFaqs     — the list shown below the tool — set to quickFaqs unless it needs to differ
//   recommendation — { icon, prompt, slug, label } single related-tool nudge, shown inline in the panel
//   relatedTools — [{ slug, icon }] shown in the Related Tools card below the tool
//   extraSection — optional { title, items: [{ label, body }] } for a tool that
//                  genuinely needs an 8th section (e.g. PDF to Word's "what kind
//                  of files convert best") — most tools should not set this.

export const toolGuides = {
  'pdf-to-word': {
    title: 'PDF to Word Guide',
    what: "Converting a PDF to an editable Word document is one of the most common document tasks — whether you're updating an old contract, editing a resume that only exists as a PDF, or pulling text out of a report to reuse elsewhere. Here's exactly how to do it with Convertam, and what to expect from the result.",
    steps: [
      {
        title: 'Upload your PDF file',
        body: "Click the upload area (or drag and drop) and select the PDF you want to convert. There's no account or sign-up required — the file is processed and never stored longer than needed to complete your conversion.",
      },
      {
        title: 'Convertam converts the file',
        body: "Once uploaded, Convertam analyzes the PDF's structure — text, formatting, tables, and layout — and rebuilds it as a native Word document (.docx). This typically takes just a few seconds for standard documents; larger or more complex files may take a little longer.",
      },
      {
        title: 'Download your Word document',
        body: 'When conversion finishes, your .docx file is ready to download instantly. Open it in Microsoft Word, Google Docs, or any compatible word processor to continue editing.',
      },
    ],
    extraSection: {
      title: 'What kind of files convert best',
      items: [
        {
          label: 'Text-based PDFs',
          body: '(created from Word, Google Docs, or similar) convert most reliably — headings, paragraphs, and basic formatting are preserved accurately.',
        },
        {
          label: 'PDFs with tables',
          body: 'generally convert well, though very complex or irregularly-structured tables may need minor manual adjustment afterward.',
        },
        {
          label: 'Scanned PDFs or photographed pages',
          body: 'are essentially images of text rather than real text, so results will vary — if your PDF was scanned rather than digitally created, expect the converted document to need more cleanup.',
        },
      ],
    },
    mistakes: [
      "Uploading a scanned PDF and expecting perfect results — run it through OCR PDF first if the document is a photo or scan, not a digitally-created file.",
      "Not checking the page count/complexity before paying — very large or scanned files cost slightly more, and the price is shown before you confirm.",
      "Expecting pixel-perfect layout on design-heavy PDFs — multi-column magazines or heavily styled flyers are a fundamentally different format from Word and will need manual cleanup.",
    ],
    quickFaqs: [
      {
        q: 'Will my formatting be preserved?',
        a: "Fonts, headings, bullet points, and basic layout are carried over in most cases. Very design-heavy PDFs (multi-column magazine-style layouts, heavy graphic design) are harder for any converter to reproduce exactly, since Word documents don't work the same way PDFs do internally.",
      },
      {
        q: 'Is there a file size limit?',
        a: 'Yes — files up to 100MB are supported, which comfortably covers the vast majority of everyday documents, resumes, contracts, and reports.',
      },
      {
        q: 'Is my file kept private?',
        a: "Your document is processed solely to perform the conversion you requested and isn't shared, sold, or used for anything else — it's automatically deleted afterward.",
      },
      {
        q: 'Can I convert multiple pages, or just part of a PDF?',
        a: "The full PDF converts as a single Word document, with page breaks preserved — you can then delete or edit any sections you don't need, directly in Word.",
      },
      {
        q: "What if the result doesn't look quite right?",
        a: "Because PDF and Word are fundamentally different formats — one is a laid-out final page, the other an editable document — some manual touch-up is normal for complex documents. Simple text-based PDFs need the least cleanup; that's the case where this kind of conversion works best.",
      },
      {
        q: 'Is this tool really free?',
        a: 'PDF to Word starts from ₦500 (about $1) per conversion. The price can increase slightly for very large, scanned, or high-page-count files, and you always see the exact price before you pay — no subscription, no login required.',
      },
    ],
    fullFaqs: null, // filled in below — same list as quickFaqs, kept in one place
    whenToUse: "Converting PDF to Word makes sense any time you need to edit content that currently only exists as a fixed, uneditable PDF — updating an old resume, revising a contract clause, copying text into another document, or simply making corrections without retyping the whole thing from scratch.",
    recommendation: {
      icon: '🔍',
      prompt: 'Need OCR for a scanned PDF?',
      slug: 'ocr-pdf',
      label: 'Try OCR PDF',
    },
    relatedTools: [
      { slug: 'word-to-pdf', icon: '📄' },
      { slug: 'ocr-pdf', icon: '🔍' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'merge-pdf', icon: '📎' },
    ],
  },

  // ---------------------------------------------------------------------
  // Business Document Studio family — one shared workspace, four entry
  // points. Delivery Note and Waybill share a single URL/page
  // (delivery-note-waybill) with a toggle between them, so that one gets
  // a single guide covering both workflows rather than two separate
  // (impossible, since only one guide can attach to one page) entries.
  // ---------------------------------------------------------------------

  'business-document-studio': {
    title: 'Business Document Studio Guide',
    what: 'One workspace that creates Invoices, Quotations, Delivery Notes, and Waybills — all sharing the same company details, client list, item table, branding, and templates, so you never re-type the same information twice.',
    whenToUse: "Start here when you're not sure which single document you need, or when a deal will move through more than one stage — quote, then invoice, then delivery, then waybill — and you want each one to carry the last one's data forward automatically.",
    steps: [
      { title: 'Choose how you want to start', body: 'Pick "Start a Business Document Flow" if you\'re beginning a deal from scratch (it opens on a Quotation), or "Create a Single Document" if you just need one specific document type right now.' },
      { title: 'Pick a template', body: 'Modern, Corporate, or Elegant — purely visual, and can be changed later without losing anything you\'ve typed in.' },
      { title: 'Fill in company, client, and item details', body: 'Add your logo/letterhead, the client\'s details, and line items. Totals, VAT, and formatting are calculated for you.' },
      { title: 'Download, or convert to the next document', body: 'Download the PDF as-is, or use "Convert to →" to carry everything forward into the next stage of the deal — Convertam tells you exactly what will change before you confirm.' },
    ],
    tips: [
      'Use the flow entry point for a deal you expect to progress — it saves you from re-entering client and item details at every stage.',
      'Switching templates never touches your content — it only changes colors, fonts, and layout.',
      'Add your bank details once on an Invoice or Quotation; they carry forward automatically to any document type that shows them.',
    ],
    mistakes: [
      "Manually re-typing the same client and item details into a fresh document for each stage of a deal — use \"Convert to →\" instead so nothing has to be re-entered.",
      "Not reviewing the change list Convertam shows before converting — for example, converting to Delivery Note removes pricing, which is correct but worth confirming before you send it.",
      "Forgetting that Delivery Note and Waybill don't show prices at all — that's the document type doing its job, not a bug.",
    ],
    quickFaqs: [
      { q: 'What happens to my data when I convert between document types?', a: 'Company details, client details, item rows, and branding all carry over automatically. Fields that don\'t apply to the new type (like prices on a Delivery Note) are removed, and fields the new type needs (like driver details on a Waybill) are added — Convertam shows you exactly what changed before you confirm.' },
      { q: 'Do I have to follow the full Quotation → Invoice → Delivery Note → Waybill flow?', a: 'No — "Create a Single Document" lets you jump straight to any one type and use it entirely on its own.' },
      { q: 'Can I go back to an earlier document type after converting forward?', a: 'Yes, the same conversion works in reverse — you can convert an Invoice back to a Quotation, for example, though fields specific to the type you\'re leaving will be removed.' },
      { q: 'Is this tool free?', a: 'Yes, generating and downloading any document in Business Document Studio is completely free, with no login required.' },
    ],
    fullFaqs: null,
    recommendation: {
      icon: '🧾',
      prompt: 'Know exactly which document you need?',
      slug: 'invoice-generator',
      label: 'Jump straight to Invoice Generator',
    },
    relatedTools: [
      { slug: 'invoice-generator', icon: '🧾' },
      { slug: 'quotation-generator', icon: '📋' },
      { slug: 'delivery-note-waybill', icon: '📦' },
      { slug: 'id-card-generator', icon: '🪪' },
    ],
  },

  'invoice-generator': {
    title: 'Invoice Generator Guide',
    what: "Creates a professional, itemized invoice — the document you send when payment is actually owed. It's part of Business Document Studio, so it shares templates and branding with Quotations, Delivery Notes, and Waybills, but this guide is written for landing here directly to bill a client.",
    whenToUse: 'Use an Invoice once work is done or goods have shipped and you need to request payment. If the client hasn\'t agreed to the price yet, send a Quotation first — you can convert it into this Invoice the moment they accept.',
    steps: [
      { title: 'Add company and client details', body: 'Your business info (with logo or letterhead), the client\'s billing details, invoice number, invoice date, and due date — the due date defaults to 30 days out, and is editable.' },
      { title: 'Add line items', body: 'Each row takes a description, quantity, and rate; VAT and the line amount are calculated automatically as you type.' },
      { title: 'Add bank details and a signature', body: 'Bank details are optional and can be toggled off if you invoice through another payment method; add a signature by drawing, typing, or uploading an image.' },
      { title: 'Download the PDF', body: 'The invoice downloads instantly, formatted to your chosen template, ready to email or print.' },
    ],
    tips: [
      'Save your company details once — Convertam remembers them so every future invoice is pre-filled.',
      'If different line items carry different VAT rates, set VAT per row rather than one flat rate for the whole invoice.',
      'Toggle Bank Details off entirely if you collect payment another way (a payment link, cash, etc.) — an empty bank section looks unfinished.',
    ],
    mistakes: [
      'Sending an invoice before the client has agreed to the price — use Quotation Generator first for anything not yet confirmed, then convert it once accepted.',
      'Forgetting to set a due date, which leaves the client without a clear payment deadline.',
      'Not double-checking calculated VAT and totals on invoices with many line items, especially if some items are VAT-exempt.',
    ],
    quickFaqs: [
      { q: 'Can I turn this invoice into a Delivery Note or Waybill?', a: 'Yes — use "Convert to →" once the invoice is created. Pricing and totals are removed automatically since those documents don\'t show financial information, and logistics fields (like a receiving signature) are added.' },
      { q: 'Is there a payment reminder or due-date alert?', a: 'Not currently — the due date is shown on the invoice itself, but you\'ll need to track follow-ups yourself.' },
      { q: 'Can different line items have different VAT rates?', a: 'Yes, VAT is set per item row, not as one rate for the whole invoice.' },
      { q: 'Is Invoice Generator free?', a: 'Yes, completely free with no login required.' },
    ],
    fullFaqs: null,
    recommendation: {
      icon: '📦',
      prompt: 'Shipped what you invoiced?',
      slug: 'delivery-note-waybill',
      label: 'Confirm delivery or dispatch',
    },
    relatedTools: [
      { slug: 'quotation-generator', icon: '📋' },
      { slug: 'delivery-note-waybill', icon: '📦' },
      { slug: 'business-document-studio', icon: '🗂️' },
      { slug: 'sign-pdf', icon: '✍️' },
    ],
  },

  'quotation-generator': {
    title: 'Quotation Generator Guide',
    what: "Creates a professional quotation — a proposed price for goods or services, sent before any payment is owed. Nothing on a quotation implies money is due yet, so there's deliberately no \"Paid/Unpaid\" status anywhere on it.",
    whenToUse: "Send a Quotation when a client wants pricing before committing — a proposal, an estimate, a proforma. The moment they accept, convert it straight into an Invoice instead of building a new document from scratch.",
    steps: [
      { title: 'Add company and client details', body: 'Your business details, who the quotation is prepared for, quotation number, quotation date, and a "Valid Until" date (defaults to 14 days out).' },
      { title: 'Add priced line items', body: 'Same item table as an invoice — description, quantity, rate, VAT — but the total is labeled "Quoted Total," not an amount owed.' },
      { title: 'Download or send it', body: 'Download the PDF to send by email or share directly.' },
      { title: 'Convert to Invoice once accepted', body: 'When the client agrees, use "Convert to →" to turn the quotation straight into an invoice with a real invoice number and due date — no re-typing.' },
    ],
    tips: [
      'Always set a realistic "Valid Until" date — prices you\'re prepared to honor indefinitely are rare, and this protects you from an old quote being accepted at outdated pricing.',
      "Converting to Invoice preserves every line item and all branding — you only need to review the new due date.",
      'Use the same template across the Quotation and the eventual Invoice so the client sees a consistent, professional document set.',
    ],
    mistakes: [
      "Sending a quotation with no validity date, leaving pricing open-ended indefinitely.",
      "Building a brand-new invoice by hand after a quotation is accepted instead of converting it — you'll end up re-typing details you already have.",
      "Treating a quotation as a binding payment request — it isn't one, and mentioning payment terms on it can confuse clients about what's actually owed.",
    ],
    quickFaqs: [
      { q: 'Is a quotation legally binding?', a: "That depends on your jurisdiction and what you write on it — Convertam generates the document, but whether it constitutes a binding offer is a legal question outside the tool's scope." },
      { q: 'What\'s the difference between a Quotation and an Invoice?', a: 'A Quotation proposes a price before anything is owed and has no payment status. An Invoice requests actual payment for confirmed work and shows a due date and amount owed.' },
      { q: 'Can I edit the invoice after converting from a quotation?', a: 'Yes — converting creates a normal, fully editable invoice; nothing about it is locked because it came from a quotation.' },
      { q: 'Is Quotation Generator free?', a: 'Yes, completely free with no login required.' },
    ],
    fullFaqs: null,
    recommendation: {
      icon: '🧾',
      prompt: 'Quotation accepted?',
      slug: 'invoice-generator',
      label: 'Convert it to an Invoice',
    },
    relatedTools: [
      { slug: 'invoice-generator', icon: '🧾' },
      { slug: 'business-document-studio', icon: '🗂️' },
      { slug: 'delivery-note-waybill', icon: '📦' },
      { slug: 'id-card-generator', icon: '🪪' },
    ],
  },

  'delivery-note-waybill': {
    title: 'Delivery Note & Waybill Guide',
    what: "Creates two related but different logistics documents from one workspace: a Delivery Note confirms what was delivered and received, while a Waybill documents goods while they're still in transit. Neither shows prices or totals — they're proof-of-movement documents, not billing documents.",
    whenToUse: "Use a Delivery Note when goods have already arrived and you need the receiver's confirmation. Use a Waybill when goods are being dispatched and you need driver, vehicle, and transport details recorded before or during the trip. If you only need simple proof of delivery, Delivery Note is usually the simpler, sufficient choice.",
    steps: [
      { title: 'Switch to the document type you need', body: 'Use the Delivery Note / Waybill toggle at the top of the workspace — everything below adjusts to match.' },
      { title: 'Fill in delivery details', body: 'For a Delivery Note: delivery address, related invoice number, and purchase order number if relevant. For a Waybill: pickup and delivery addresses, driver name and phone, vehicle number, transport company, and delivery instructions.' },
      { title: 'Add items being delivered', body: 'Delivery Note rows track quantity, unit, and remarks; Waybill rows also track weight — neither shows rate, VAT, or amount, since no payment is being requested.' },
      { title: 'Collect signatures and download', body: 'A Delivery Note has one "Received By" signature. A Waybill has two: "Dispatched By" and "Received By," reflecting that goods change hands at both ends of the trip.' },
    ],
    tips: [
      "Fill in the related invoice number on a Delivery Note so it's easy to trace back to what was originally billed.",
      'On a Waybill, complete driver and vehicle details before dispatch — they\'re there to be checked at delivery, not filled in afterward.',
      'Convert an Invoice directly into a Delivery Note or Waybill once goods ship — item details carry over and pricing is removed automatically.',
    ],
    mistakes: [
      "Using a Waybill when a simple Delivery Note would do — Waybill adds driver/vehicle/transport fields that add nothing if goods aren't actually in transit between locations.",
      "Leaving the Waybill's driver or vehicle fields blank, which defeats the point of the document if goods are inspected mid-transit.",
      "Expecting to see prices or totals on either document — that's correct, intentional behavior, not a missing feature.",
    ],
    quickFaqs: [
      { q: 'What\'s the actual difference between a Delivery Note and a Waybill?', a: 'A Delivery Note confirms goods that have arrived, with one receiving signature. A Waybill documents goods while in transit, with driver/vehicle/transport details and two signatures — one for dispatch, one for receipt.' },
      { q: 'Why don\'t these documents show prices?', a: "They're proof-of-movement documents, not billing documents — the paid Invoice or Quotation already covers pricing, so repeating it here would be redundant and could cause confusion at the point of delivery." },
      { q: 'Can I convert an Invoice into one of these?', a: 'Yes — converting removes pricing and totals automatically and adds the logistics fields the target type needs.' },
      { q: 'Is this tool free?', a: 'Yes, both Delivery Note and Waybill are completely free, with no login required.' },
    ],
    fullFaqs: null,
    recommendation: {
      icon: '🧾',
      prompt: 'Need to bill for what was delivered?',
      slug: 'invoice-generator',
      label: 'Open Invoice Generator',
    },
    relatedTools: [
      { slug: 'invoice-generator', icon: '🧾' },
      { slug: 'quotation-generator', icon: '📋' },
      { slug: 'business-document-studio', icon: '🗂️' },
      { slug: 'sign-pdf', icon: '✍️' },
    ],
  },
};

Object.assign(toolGuides, {
  // ---------------------------------------------------------------------
  // Document Conversion
  // ---------------------------------------------------------------------
  'word-to-pdf': {
    title: 'Word to PDF Guide',
    what: 'Turns a Word document (.doc or .docx) into a PDF — fonts, images, spacing, and layout preserved, but no longer editable the way a Word file is.',
    whenToUse: "Convert to PDF once a document is final and you're sending, printing, or archiving it. A PDF looks identical on every device and printer, which a Word file doesn't always guarantee if the reader lacks your exact fonts.",
    steps: [
      { title: 'Upload your Word document', body: "Click the upload area or drag your .doc/.docx file in. Convertam checks the file and shows you the price before anything happens." },
      { title: 'Pay and convert', body: 'Conversion starts from ₦500 ($1) — larger files (over 50MB) cost a little more, shown upfront before you confirm.' },
      { title: 'Download the PDF', body: 'Your converted file downloads as a ready-to-share PDF, formatted exactly as it appeared in Word.' },
    ],
    tips: [
      'Finish editing in Word first — converting to PDF is one-way, so treat the PDF as the final, locked version.',
      'If your document uses an unusual font, embed it in Word before converting so the PDF doesn\'t silently substitute a different one.',
      'Need to combine several converted PDFs afterward? Merge PDF takes them all into one file in the order you choose.',
    ],
    mistakes: [
      'Converting a draft that still needs changes — edit the Word file first, since going back from PDF to Word (a separate tool) can shift formatting slightly.',
      'Not checking page breaks in Word before converting, especially for documents with tables or images near a page edge.',
      'Assuming a very large file will cost the base price — files over 50MB carry a small surcharge, shown before you pay.',
    ],
    quickFaqs: [
      { q: 'Will my formatting stay exactly the same?', a: 'Yes, in almost all cases — PDF is designed to preserve a document\'s exact visual layout, which is the main reason to convert to it.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB per file.' },
      { q: 'How much does it cost?', a: 'From ₦500 (about $1). Files over 50MB have a small surcharge, and you see the exact price before paying.' },
      { q: 'Can I convert the PDF back to an editable Word document later?', a: 'Yes — use PDF to Word, a separate tool built for that direction.' },
    ],
    recommendation: { icon: '📎', prompt: 'Converting more than one file?', slug: 'merge-pdf', label: 'Merge them into one PDF' },
    relatedTools: [
      { slug: 'pdf-to-word', icon: '📝' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'protect-pdf', icon: '🔒' },
    ],
  },

  'pdf-to-excel': {
    title: 'PDF to Excel Guide',
    what: 'Pulls tables out of a PDF and rebuilds them as an editable Excel spreadsheet (.xlsx) — real cells and rows you can sort, filter, and calculate with, not just text.',
    whenToUse: 'Use this when the numbers you need are trapped inside a PDF — a bank statement, a financial report, a price list — and you want to work with that data in Excel rather than retyping it by hand.',
    steps: [
      { title: 'Upload your PDF', body: 'Convertam checks how many pages it has and whether it looks like a scanned document before showing you the price.' },
      { title: 'Pay and convert', body: 'Base price is ₦500 ($1); longer documents (over 100 or 300 pages) and scanned PDFs cost a bit more, shown clearly before you confirm.' },
      { title: 'Download your spreadsheet', body: 'Each table found in the PDF becomes its own sheet in the downloaded .xlsx file.' },
    ],
    tips: [
      'Works best on PDFs with clear, ruled table structures — bank statements and invoices with visible grid lines convert most reliably.',
      'If a PDF has several tables across different pages, expect one sheet per table rather than everything merged into one.',
      'For a scanned PDF (a photo or image-based document), run it through OCR PDF first — this tool needs real, extractable text to find tables.',
    ],
    mistakes: [
      "Uploading a scanned bank statement or report and expecting tables to be found — scanned pages have no real text for this tool to read, only pixels.",
      'Expecting charts or images to carry over — only tabular text data converts to spreadsheet cells.',
      'Not double-checking cell alignment on complex or irregular tables — very unusual table layouts may need light manual correction after conversion.',
    ],
    quickFaqs: [
      { q: 'Does this work on scanned PDFs?', a: "No — scanned pages are images, not real text, so no tables can be detected. Run OCR PDF first, or use Smart AI Converter, which can read a photographed table directly." },
      { q: 'What if my PDF has multiple tables?', a: 'Each table is extracted to its own sheet in the resulting Excel file.' },
      { q: 'How much does it cost?', a: 'From ₦500 (about $1), increasing slightly for long documents (100+ pages) or scanned files.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB per file.' },
    ],
    recommendation: { icon: '🔍', prompt: 'PDF is a scan or photo?', slug: 'ocr-pdf', label: 'Run OCR PDF first' },
    relatedTools: [
      { slug: 'excel-to-pdf', icon: '📊' },
      { slug: 'ocr-pdf', icon: '🔍' },
      { slug: 'receipt-scanner', icon: '🧾' },
      { slug: 'pdf-to-word', icon: '📝' },
    ],
  },

  'excel-to-pdf': {
    title: 'Excel to PDF Guide',
    what: 'Converts a spreadsheet (.xls or .xlsx) into a PDF that prints and displays consistently on any device — all sheets included.',
    whenToUse: 'Convert to PDF when you need to share or print a finished spreadsheet without the recipient needing Excel installed, or without risking them accidentally editing your numbers.',
    steps: [
      { title: 'Upload your spreadsheet', body: 'Select or drag in your .xls/.xlsx file.' },
      { title: 'Pay and convert', body: 'Starts from ₦500 ($1); files over 50MB cost a little more, shown before you confirm.' },
      { title: 'Download the PDF', body: 'All sheets in the workbook are included in the output PDF.' },
    ],
    tips: [
      'Set your print area and page layout in Excel first (File → Print Area) — the PDF follows whatever print/page setup the spreadsheet already has.',
      'Very wide sheets can print small or split across pages — consider adjusting column widths or orientation before converting if the sheet is unusually wide.',
      'Need to combine the result with other documents afterward? Merge PDF brings multiple PDFs together in one file.',
    ],
    mistakes: [
      "Not checking Excel's print preview before converting — the PDF will follow the same page breaks and scaling that Print Preview shows.",
      'Forgetting that all sheets convert, including any working/scratch sheets you may not want in the final PDF — clean those up first.',
      'Expecting formulas or interactivity to remain — a PDF is a fixed, static document, not a spreadsheet.',
    ],
    quickFaqs: [
      { q: 'Do all sheets get converted?', a: 'Yes, every sheet in the workbook is included in the output PDF.' },
      { q: 'Will my page layout and print area be respected?', a: "Yes — the PDF follows whatever print area and page setup you've configured in Excel." },
      { q: 'How much does it cost?', a: 'From ₦500 (about $1), with a small surcharge for files over 50MB.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB per file.' },
    ],
    recommendation: { icon: '📈', prompt: 'Need to go the other way?', slug: 'pdf-to-excel', label: 'Try PDF to Excel' },
    relatedTools: [
      { slug: 'pdf-to-excel', icon: '📈' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'word-to-pdf', icon: '📄' },
      { slug: 'powerpoint-to-pdf', icon: '📽️' },
    ],
  },

  'pdf-to-powerpoint': {
    title: 'PDF to PowerPoint Guide',
    what: 'Turns each page of a PDF into a slide in an editable PowerPoint presentation (.pptx).',
    whenToUse: "Use this when you've received a presentation as a PDF (common after someone exports slides to PDF for sharing) and need to actually edit the content, not just view it.",
    steps: [
      { title: 'Upload your PDF', body: 'Convertam checks page count and content type first, so the price is clear before you pay.' },
      { title: 'Pay and convert', body: 'From ₦500 ($1); long or scanned PDFs cost slightly more.' },
      { title: 'Download your presentation', body: 'Each PDF page becomes one slide, ready to open and edit in PowerPoint or Google Slides.' },
    ],
    tips: [
      'Works best on PDFs that were originally slide decks — the one-page-per-slide layout is designed around that shape, not long text documents.',
      'Text-heavy PDFs (reports, articles) will convert, but expect to redesign the slides afterward rather than getting a polished deck.',
      "If the source PDF is a scan, run it through OCR PDF first so there's real text to work with, not just an image per slide.",
    ],
    mistakes: [
      'Feeding in a long text document expecting a well-designed slide deck to come out — this tool preserves the page-to-slide mapping, not slide design sense.',
      'Not checking that image-heavy pages retain quality after conversion, especially on scanned or photo-heavy source PDFs.',
      'Uploading a scanned deck and expecting editable text on the slides — scanned pages carry over as images, not real text boxes.',
    ],
    quickFaqs: [
      { q: 'Will the text be editable in PowerPoint?', a: 'Text-based PDFs convert to editable text on the slide. Scanned or image-based PDFs convert as images instead — run OCR PDF first if you need the text itself.' },
      { q: 'How many slides will I get?', a: 'One slide per PDF page, in order.' },
      { q: 'How much does it cost?', a: 'From ₦500 (about $1), a bit more for long or scanned documents.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '✨', prompt: 'Starting from raw notes, not a PDF?', slug: 'presentation-generator', label: 'Try AI Presentation Generator' },
    relatedTools: [
      { slug: 'powerpoint-to-pdf', icon: '📽️' },
      { slug: 'presentation-generator', icon: '✨' },
      { slug: 'ocr-pdf', icon: '🔍' },
      { slug: 'pdf-to-word', icon: '📝' },
    ],
  },

  'powerpoint-to-pdf': {
    title: 'PowerPoint to PDF Guide',
    what: 'Converts a PowerPoint presentation (.ppt or .pptx) into a PDF — every slide included, laid out exactly as designed, ready to share or print.',
    whenToUse: 'Convert before sending a final version to someone who might not have PowerPoint, or before printing handouts, so the slides display consistently regardless of what software opens them.',
    steps: [
      { title: 'Upload your presentation', body: 'Select or drag in your .ppt/.pptx file.' },
      { title: 'Pay and convert', body: 'From ₦500 ($1); larger files (over 50MB) cost slightly more.' },
      { title: 'Download the PDF', body: 'All slides are included, one per page, in their original design.' },
    ],
    tips: [
      'Check that embedded videos or animations aren\'t essential to the content — a PDF is static, so anything animated becomes a fixed image of its final state.',
      'If you need speaker notes included, export those from PowerPoint separately — this conversion captures the visible slide, not the notes pane.',
      'Compress the PDF afterward if the deck has many high-resolution images and the file feels too large to email.',
    ],
    mistakes: [
      'Relying on slide transitions or embedded video to carry meaning — none of that survives in a static PDF.',
      'Not checking custom fonts render correctly if the presentation uses fonts that aren\'t widely available.',
      'Converting before finishing edits — treat the PDF as the final, locked version of the deck.',
    ],
    quickFaqs: [
      { q: 'Do animations or transitions convert?', a: 'No — a PDF is a static document, so slides appear in their final resting state, without animation.' },
      { q: 'Are speaker notes included?', a: 'No, only the visible slide content converts.' },
      { q: 'How much does it cost?', a: 'From ₦500 (about $1), with a small surcharge for files over 50MB.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '🗜️', prompt: 'File too large to share?', slug: 'compress-pdf', label: 'Try Compress PDF' },
    relatedTools: [
      { slug: 'pdf-to-powerpoint', icon: '📽️' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'protect-pdf', icon: '🔒' },
    ],
  },

  'html-to-pdf': {
    title: 'HTML to PDF Guide',
    what: 'Takes raw HTML code you paste in and renders it into a downloadable PDF — useful for turning a web page snippet, an email template, or generated markup into a fixed document.',
    whenToUse: 'Use this when you have HTML (from a code export, a CMS, an email builder, or your own markup) and need a shareable, printable PDF version of how it renders.',
    steps: [
      { title: 'Paste your HTML', body: 'Enter or paste the HTML code into the editor.' },
      { title: 'Generate the PDF', body: 'Convertam renders the markup as it would appear in a browser and produces a PDF from that rendering.' },
      { title: 'Download the file', body: 'Your PDF downloads immediately, ready to share or print.' },
    ],
    tips: [
      'Keep styles inline or in a &lt;style&gt; tag within the same snippet — external stylesheets referenced by URL may not load during rendering.',
      'Test with a simple snippet first if your HTML is complex, so you can spot layout issues before working with the full document.',
      'Avoid relying on JavaScript-driven content — the PDF captures a static render, not interactive behavior.',
    ],
    mistakes: [
      'Pasting HTML that depends on external CSS or JS files hosted elsewhere — those resources may not be available at render time, resulting in an unstyled document.',
      'Expecting interactive elements (forms, buttons, scripts) to function — a PDF is a static snapshot of the render.',
      'Not checking page-break behavior for long content — very long HTML may split awkwardly across pages without explicit page-break styling.',
    ],
    quickFaqs: [
      { q: 'Can I use external stylesheets or scripts?', a: "It's safer to keep CSS inline or in a <style> block within the pasted HTML, since externally hosted resources may not load during rendering." },
      { q: 'Will JavaScript run?', a: 'No — the PDF is a static render of the markup, not a live, scriptable page.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a size limit on the HTML?', a: 'There\'s no strict limit, but very large or complex documents may take longer to render.' },
    ],
    recommendation: { icon: '📎', prompt: 'Combining with other PDFs?', slug: 'merge-pdf', label: 'Try Merge PDF' },
    relatedTools: [
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'protect-pdf', icon: '🔒' },
      { slug: 'watermark-pdf', icon: '💧' },
    ],
  },
});

Object.assign(toolGuides, {
  // ---------------------------------------------------------------------
  // PDF Utilities
  // ---------------------------------------------------------------------
  'merge-pdf': {
    title: 'Merge PDF Guide',
    what: 'Combines multiple PDF files into one, in whatever order you upload them.',
    whenToUse: "Use this to assemble a single document from several separate PDFs — combining a cover letter with a resume, stitching together scanned pages saved as separate files, or bundling a set of reports into one file to send.",
    steps: [
      { title: 'Upload your PDFs', body: 'Add all the files you want combined — there\'s no drag-to-reorder here, so upload them in the order you want them to appear in the final file.' },
      { title: 'Merge', body: 'Convertam combines every page from every file into one document, in upload order.' },
      { title: 'Download the merged PDF', body: 'The combined file downloads immediately.' },
    ],
    tips: [
      'Since files merge in the order you upload them, select them one at a time in the correct sequence rather than multi-selecting a folder at once.',
      'If you uploaded the wrong order, remove the files and re-upload in the sequence you actually want.',
      'Need to split the result back apart later, or reorder pages within the merged file? Split PDF and Reorder PDF Pages both work on the output.',
    ],
    mistakes: [
      'Multi-selecting files from a folder and assuming they\'ll merge alphabetically or by date — they merge in the exact order they were added, which file-picker multi-select doesn\'t always guarantee.',
      'Not double-checking the final page order in the downloaded PDF before sending it on.',
      'Trying to reorder pages here — this tool only combines files; use Reorder PDF Pages afterward if you need to rearrange pages within the result.',
    ],
    quickFaqs: [
      { q: 'Can I reorder pages after uploading?', a: 'Not within this tool — upload files in your intended order. If you need to rearrange pages afterward, use Reorder PDF Pages on the merged result.' },
      { q: 'Is there a limit to how many files I can merge?', a: 'No fixed limit on file count, but each individual file is capped at 100MB.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Does merging affect quality?', a: 'No — pages are combined as-is, with no re-rendering or compression.' },
    ],
    recommendation: { icon: '↕️', prompt: 'Need to rearrange pages after merging?', slug: 'reorder-pdf', label: 'Try Reorder PDF Pages' },
    relatedTools: [
      { slug: 'split-pdf', icon: '✂️' },
      { slug: 'reorder-pdf', icon: '↕️' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'extract-pdf-pages', icon: '📑' },
    ],
  },

  'split-pdf': {
    title: 'Split PDF Guide',
    what: 'Breaks a multi-page PDF apart into individual, single-page PDF files.',
    whenToUse: 'Use this when you have one PDF containing several distinct documents (like a bundle of scanned forms) and need each page as its own separate file.',
    steps: [
      { title: 'Upload your PDF', body: 'Select the file you want to break apart.' },
      { title: 'Split', body: 'Every page becomes its own individual PDF.' },
      { title: 'Download the pages', body: 'A single-page source downloads directly; anything with more than one page downloads as a zip containing one PDF per page.' },
    ],
    tips: [
      'If you only need a handful of specific pages rather than every page separately, Extract PDF Pages lets you pull just a range instead.',
      'Rename the extracted files after downloading if you need to identify pages by content rather than page number.',
      'Combine specific split pages back together later with Merge PDF if you only needed to reorder or drop a few.',
    ],
    mistakes: [
      'Using Split when you only wanted to remove one or two pages — Remove PDF Pages or Extract PDF Pages fit that need more directly, without generating a page for every single page.',
      'Losing track of page order once the zip is downloaded — filenames are numbered to match original page order, so check before renaming.',
      'Expecting the split files to stay grouped as one document — each is a fully independent PDF once downloaded.',
    ],
    quickFaqs: [
      { q: 'What if my PDF only has one page?', a: 'It downloads directly rather than as a zip, since there\'s nothing to bundle.' },
      { q: 'How are the split files named?', a: 'Each is numbered to match its original position in the source document.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB for the source file.' },
    ],
    recommendation: { icon: '📑', prompt: 'Only need a few specific pages?', slug: 'extract-pdf-pages', label: 'Try Extract PDF Pages' },
    relatedTools: [
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'extract-pdf-pages', icon: '📑' },
      { slug: 'remove-pdf-pages', icon: '🗑️' },
      { slug: 'reorder-pdf', icon: '↕️' },
    ],
  },

  'compress-pdf': {
    title: 'Compress PDF Guide',
    what: "Shrinks a PDF's file size so it's easier to email, upload, or store — most effective on PDFs with lots of images.",
    whenToUse: "Use this when a PDF is too large to attach to an email, upload to a form with a size limit, or simply takes up more storage than it should for its content.",
    steps: [
      { title: 'Upload your PDF', body: 'Select the file you want to shrink.' },
      { title: 'Choose a profile', body: 'Pick from Web, Print, or Max compression, depending on how much size reduction versus quality you want to trade off.' },
      { title: 'Download the compressed file', body: 'Your file is sent for compression and the smaller version downloads once it\'s ready.' },
    ],
    tips: [
      'Image-heavy PDFs (scanned documents, photo-filled reports) shrink the most — text-only PDFs are usually already small and compress less dramatically.',
      'Try the Web profile first for the biggest size reduction if the document is only being viewed on screen, not printed.',
      'Use Print profile if the PDF still needs to look sharp on paper — it compresses more conservatively than Web or Max.',
    ],
    mistakes: [
      'Compressing an already-small, text-only PDF expecting a dramatic size drop — there\'s little room to shrink when there are few images to begin with.',
      'Choosing Max compression for a document you still need to print cleanly — Max prioritizes file size over visual quality.',
      'Compressing repeatedly in a loop hoping for further gains — running it again on an already-compressed file yields little to no further reduction.',
    ],
    quickFaqs: [
      { q: 'Will compressing reduce image quality?', a: 'Some, depending on the profile — Web and Max prioritize smaller size over crispness; Print keeps more visual quality at a larger size.' },
      { q: 'Is this tool free?', a: 'No — Compress PDF costs ₦500 per file, since it uses a dedicated conversion service rather than running in your browser.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
      { q: 'Is my file kept private?', a: 'Yes — it\'s sent securely for compression and deleted automatically afterward.' },
    ],
    recommendation: { icon: '🗜️', prompt: 'Need to shrink images instead?', slug: 'image-compressor', label: 'Try Image Compressor' },
    relatedTools: [
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'pdf-to-word', icon: '📝' },
      { slug: 'split-pdf', icon: '✂️' },
      { slug: 'image-compressor', icon: '🖼️' },
    ],
  },

  'rotate-pdf': {
    title: 'Rotate PDF Guide',
    what: 'Rotates every page in a PDF by 90°, 180°, or 270° — fixing a document that was scanned or saved sideways or upside down.',
    whenToUse: 'Use this right after scanning a document the wrong way up, or when you receive a PDF where every page is oriented incorrectly.',
    steps: [
      { title: 'Upload your PDF', body: 'Select the file that needs straightening.' },
      { title: 'Choose the rotation angle', body: 'Pick 90°, 180°, or 270° — this applies the same rotation to every page in the document.' },
      { title: 'Download the rotated PDF', body: 'The corrected file downloads instantly.' },
    ],
    tips: [
      'The rotation applies to the whole document — if only some pages are sideways, this isn\'t the right tool for a mixed-orientation fix.',
      'Rotating an already-rotated PDF adds to its current rotation rather than resetting it — 90° twice equals 180°.',
      'If your document is genuinely crooked (not just sideways) rather than rotated a clean 90°/180°/270°, Document Enhancer\'s straighten slider handles fine-angle correction on photographed pages.',
    ],
    mistakes: [
      'Applying rotation to a PDF where only some pages are wrong — this tool rotates every page the same amount, so a mixed-orientation document needs a different approach.',
      'Rotating twice without checking the result first, ending up back at the wrong orientation or overshooting past correct.',
      'Confusing "sideways" (needs 90°/270° rotation) with "slightly crooked" (needs straightening, not rotation) — a scan tilted by a few degrees needs Document Enhancer, not this tool.',
    ],
    quickFaqs: [
      { q: 'Can I rotate individual pages differently?', a: 'No — this tool applies one rotation angle to every page. For per-page control, you\'d need to split the PDF first, rotate the relevant pages, then merge them back together.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
      { q: 'What if my document is just slightly crooked, not sideways?', a: 'Use Document Enhancer instead — it has a fine-angle straighten control for photographed or scanned pages.' },
    ],
    recommendation: { icon: '🩹', prompt: 'Page is crooked, not sideways?', slug: 'document-enhancer', label: 'Try Document Enhancer' },
    relatedTools: [
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'split-pdf', icon: '✂️' },
      { slug: 'document-enhancer', icon: '🩹' },
      { slug: 'reorder-pdf', icon: '↕️' },
    ],
  },

  'extract-pdf-pages': {
    title: 'Extract PDF Pages Guide',
    what: 'Pulls specific pages out of a PDF and saves them as a new, smaller PDF — you choose exactly which pages to keep.',
    whenToUse: 'Use this when you only need a portion of a larger document — a few relevant pages from a long report, or a specific chapter from a longer file — rather than the whole thing.',
    steps: [
      { title: 'Upload your PDF', body: 'Select the source document.' },
      { title: 'Enter the pages you want', body: 'Type page numbers and ranges like "1,3,5-8" to specify exactly which pages to keep.' },
      { title: 'Download the new PDF', body: 'A new file containing only the pages you selected downloads immediately.' },
    ],
    tips: [
      'Combine individual pages and ranges freely in one entry — "1,3,5-8" pulls page 1, page 3, and pages 5 through 8 together.',
      'Double-check page numbers against the actual PDF (not a printed page number that might differ) before extracting.',
      'If you actually want every page as its own separate file rather than one combined extract, use Split PDF instead.',
    ],
    mistakes: [
      'Entering a page range that\'s out of bounds for the document — out-of-range numbers are silently ignored rather than causing an error, so double-check your input matches the actual page count.',
      'Confusing this with Split PDF — Extract keeps a chosen subset in one file; Split breaks every page into its own separate file.',
      'Leaving the page range blank or malformed — the tool will show a clear error rather than guessing what you meant.',
    ],
    quickFaqs: [
      { q: 'What format should I use for page ranges?', a: 'Comma-separate individual pages and use a dash for ranges, e.g. "1,3,5-8".' },
      { q: 'What happens if I enter a page number that doesn\'t exist?', a: 'It\'s silently ignored rather than causing an error, so double-check the page count before extracting.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '✂️', prompt: 'Need every page as its own file instead?', slug: 'split-pdf', label: 'Try Split PDF' },
    relatedTools: [
      { slug: 'split-pdf', icon: '✂️' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'remove-pdf-pages', icon: '🗑️' },
      { slug: 'reorder-pdf', icon: '↕️' },
    ],
  },

  'remove-pdf-pages': {
    title: 'Remove PDF Pages Guide',
    what: 'Lets you click through page thumbnails, mark the ones you don\'t want, and download a cleaned-up PDF with those pages removed.',
    whenToUse: 'Use this to drop a few unwanted pages from a document — a blank scanned page, a duplicate, an outdated cover sheet — without rebuilding the whole file.',
    steps: [
      { title: 'Upload your PDF', body: 'Convertam displays a thumbnail of every page.' },
      { title: 'Click pages to mark them for removal', body: 'Marked pages are highlighted in red so you can see exactly what will be dropped.' },
      { title: 'Remove and download', body: 'The cleaned PDF, with marked pages removed, downloads immediately.' },
    ],
    tips: [
      'Click through all thumbnails carefully before removing — this is a visual, page-by-page review, which is exactly the point if you\'re not sure which pages to drop.',
      'If you actually want to keep only a small subset rather than remove a few, Extract PDF Pages by page number may be faster.',
      'You must keep at least one page — the tool won\'t let you remove every page in the document.',
    ],
    mistakes: [
      "Marking pages without a final visual review — thumbnails are there specifically so you can confirm before downloading, so take the extra look.",
      'Trying to remove all pages in a document — at least one page must remain, so this tool refuses that action rather than producing an empty file.',
      'Using this when you actually want to keep just a couple of specific pages — entering a page range with Extract PDF Pages is often faster for that case.',
    ],
    quickFaqs: [
      { q: 'Can I remove every page?', a: 'No — you must keep at least one page in the resulting document.' },
      { q: 'How do I know which pages I\'ve marked?', a: 'Marked pages are highlighted in red on the thumbnail grid before you confirm.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '📑', prompt: 'Want to keep just a few specific pages?', slug: 'extract-pdf-pages', label: 'Try Extract PDF Pages' },
    relatedTools: [
      { slug: 'extract-pdf-pages', icon: '📑' },
      { slug: 'split-pdf', icon: '✂️' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'reorder-pdf', icon: '↕️' },
    ],
  },

  'add-page-numbers': {
    title: 'Add Page Numbers Guide',
    what: 'Stamps page numbers onto every page of a PDF — you choose the position, size, starting number, and format.',
    whenToUse: 'Use this before printing or distributing a multi-page document that needs page references — reports, contracts, manuals, anything readers might need to navigate or cite by page.',
    steps: [
      { title: 'Upload your PDF', body: 'Select the document to number.' },
      { title: 'Choose position and format', body: 'Pick from 6 positions, a font size from 8-36pt, and a format — plain numbers, "Page X of N", or "— X —".' },
      { title: 'Set a starting number if needed', body: 'Numbering starts at 1 by default, but you can start from any number if this document continues from another.' },
      { title: 'Download the numbered PDF', body: 'Your file downloads with page numbers stamped on every page.' },
    ],
    tips: [
      'If this document is a continuation of another one, set the starting number to match where the previous document left off.',
      'Use "Page X of N" format for longer documents so readers immediately know how far through they are.',
      'Keep the default 28pt margin and gray color unless you need the numbering to stand out more.',
    ],
    mistakes: [
      "Starting the numbering above 1 and using the \"Page X of N\" format — the \"N\" total is counted from your start number, not the document's real page count, so it can look inflated if you're not expecting that.",
      'Choosing a font size too large for the margin, which can crowd other content near the page edge.',
      'Numbering a document that will later have pages added or removed — re-run the tool after any page changes so the numbers stay accurate.',
    ],
    quickFaqs: [
      { q: 'Can I start numbering from something other than 1?', a: 'Yes, any starting number from 1 to 9999.' },
      { q: 'What does "Page X of N" actually show?', a: 'N is calculated as the total page count plus your starting number minus one, so it reflects the numbering sequence you\'ve set, not necessarily the document\'s literal page count if you started above 1.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '💧', prompt: 'Need a CONFIDENTIAL or DRAFT stamp too?', slug: 'watermark-pdf', label: 'Try Watermark PDF' },
    relatedTools: [
      { slug: 'watermark-pdf', icon: '💧' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'reorder-pdf', icon: '↕️' },
      { slug: 'protect-pdf', icon: '🔒' },
    ],
  },

  'protect-pdf': {
    title: 'Protect PDF Guide',
    what: 'Adds a genuine password to your PDF so it can only be opened by someone who knows it — real encryption, not just a visual lock.',
    whenToUse: 'Use this before sending a document containing sensitive information — financial records, contracts, personal data — to make sure only the intended recipient can open it.',
    steps: [
      { title: 'Upload your PDF', body: 'Select the file you want to lock.' },
      { title: 'Set and confirm a password', body: 'A strength meter shows how guessable your password is as you type — aim for at least "Strong".' },
      { title: 'Protect and download', body: "Your file is sent securely to apply real encryption and is deleted automatically afterward — genuine password protection isn't something a browser alone can do, so this one step happens off-device." },
    ],
    tips: [
      'Choose a password you\'ll actually remember, or store it in a password manager — Convertam can\'t recover it for you if it\'s lost.',
      'Aim for "Strong" or "Very strong" on the built-in strength meter rather than a short, guessable password.',
      "Share the password through a different channel than the PDF itself — sending both together over the same channel defeats the point.",
    ],
    mistakes: [
      'Forgetting the password — it genuinely cannot be recovered or reset after the fact, so write it down somewhere safe before closing the tab.',
      'Sending the password in the same email as the protected PDF, which gives anyone who intercepts the email both pieces at once.',
      'Assuming a weak, short password meaningfully protects a document — a determined attacker can crack a weak password quickly regardless of the encryption itself being genuine.',
    ],
    quickFaqs: [
      { q: 'Is this real password protection, or just a visual lock?', a: "It's real: the file is genuinely encrypted and will refuse to open in any PDF reader without the correct password." },
      { q: 'What if I forget the password?', a: 'It cannot be recovered — treat it like any other important password and store it safely before you need it again.' },
      { q: 'Is my file uploaded anywhere?', a: 'Yes, briefly — genuine encryption requires a secure server step, unlike most Convertam tools which run entirely in your browser. The file is deleted automatically afterward.' },
      { q: 'Is this tool free?', a: 'Yes, currently free with no login required.' },
    ],
    recommendation: { icon: '💧', prompt: 'Want to mark it CONFIDENTIAL too?', slug: 'watermark-pdf', label: 'Try Watermark PDF' },
    relatedTools: [
      { slug: 'watermark-pdf', icon: '💧' },
      { slug: 'sign-pdf', icon: '✍️' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'merge-pdf', icon: '📎' },
    ],
  },
});

// The Full FAQ card below the tool and the Quick FAQs shown in the guide
// panel are the same list for every tool so far — set fullFaqs once here
// rather than repeating it by hand on every entry above. A tool can still
// set its own fullFaqs explicitly before this runs if it ever needs the
// two lists to differ.
Object.values(toolGuides).forEach((guide) => {
  if (guide.fullFaqs == null) guide.fullFaqs = guide.quickFaqs;
});
