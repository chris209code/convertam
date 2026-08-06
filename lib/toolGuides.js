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
        {
          label: 'CVs/resumes with a sidebar or multi-column design',
          body: "convert as text, but a colored sidebar or side-by-side columns will usually reflow into a single linear column — that's an inherent limit of rebuilding a Word document from a PDF's flat text positions, not something any PDF-to-Word converter can fully avoid. If you built your CV with Convertam's CV Builder or CV Improver, use the \"Download as Word (.docx)\" button there instead — it generates the .docx directly from your CV's real structure, so a sidebar layout stays a genuine two-column document.",
        },
      ],
    },
    mistakes: [
      "Uploading a scanned PDF and expecting perfect results — run it through OCR PDF first if the document is a photo or scan, not a digitally-created file.",
      "Not checking the page count/complexity before paying — very large or scanned files cost slightly more, and the price is shown before you confirm.",
      "Expecting pixel-perfect layout on design-heavy PDFs — multi-column magazines or heavily styled flyers are a fundamentally different format from Word and will need manual cleanup.",
      "Converting a CV Builder or CV Improver PDF here to get an editable copy — the sidebar/column template will reflow into a single linear column. Use those tools' own \"Download as Word (.docx)\" button instead for a genuine match of the template's layout.",
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
      {
        q: 'I made my CV with CV Builder or CV Improver — will my template be preserved here?',
        a: "Not exactly, no — a template with a colored sidebar or multiple columns will reflow into a single linear column when rebuilt from a PDF, since that's inherent to how any PDF-to-Word conversion works, not a limitation specific to this tool. For a genuine, structurally accurate Word copy of your CV, use the \"Download as Word (.docx)\" button inside CV Builder or CV Improver instead — it's generated directly from your CV's real layout, not reconstructed from a flattened PDF.",
      },
    ],
    fullFaqs: [
      {
        q: 'Why does my scanned document come out looking wrong, or barely convert at all?',
        a: "A scanned page is a photograph of text, not text itself — there's no character data in the file for Convertam to read, so a plain PDF-to-Word conversion has almost nothing to work with. Run the file through OCR PDF first, which recognizes the letters in the image and produces a real text layer; converting that result to Word will give you something genuinely editable, though it still involves recognition rather than an exact copy.",
      },
      {
        q: "Will tables, bullet points, and headings survive the conversion?",
        a: 'Standard formatting — headings, bullet and numbered lists, bold and italic text, and simple tables — generally carries over well, since Word has a direct equivalent for each of these. Where it gets harder is unusual table structures (merged cells, tables nested inside tables) and multi-column magazine-style layouts, which sometimes need a small manual adjustment afterward because Word and PDF represent complex layout differently under the hood.',
      },
      {
        q: 'My PDF has a password. Can I still convert it?',
        a: "The tool needs to open the file to read its contents, so a password-protected PDF needs the password removed first — either by re-saving it without a password from whatever created it, or by using Protect PDF's tools if you have the password and just need it stripped for editing purposes.",
      },
      {
        q: 'Can I convert just a few pages instead of the whole document?',
        a: 'PDF to Word converts the entire file as one Word document, with page breaks preserved, so you can freely delete the sections you don\'t need once it\'s open in Word. If you\'re working with a very long document and only need a handful of pages, running it through Extract PDF Pages first can save conversion time and result in a smaller, more focused Word file.',
      },
      {
        q: "Why doesn't my converted document look pixel-identical to the PDF?",
        a: "PDF and Word solve different problems: a PDF fixes every character in an exact position on the page, while Word lays text out dynamically based on fonts, margins, and page size — that's what makes it editable in the first place. Convertam reconstructs the closest faithful equivalent it can in Word's format, but a small amount of difference (line spacing, exact font substitution) is a structural consequence of moving between the two formats, not a conversion error.",
      },
      {
        q: 'Is my document kept private during conversion?',
        a: "Your file is used solely to perform the conversion you requested. It isn't reviewed by anyone, shared with third parties, or used to train anything — it's automatically deleted from Convertam's systems once your conversion is complete and downloaded.",
      },
      {
        q: 'What happens if the conversion fails or the output looks broken?',
        a: "This is rare, and usually means the PDF itself is unusual in some way — corrupted, built from an unsupported internal structure, or entirely made of scanned images with no text layer at all. If a conversion doesn't work as expected, check whether the document is a scan (use OCR PDF first) and confirm it isn't password-protected before trying again.",
      },
      {
        q: 'Is there a cost, and is there a file size limit?',
        a: 'PDF to Word starts from ₦500 (about $1) per conversion, shown as an exact price before you pay — no subscription or account required. Files up to 100MB are supported, which covers the large majority of everyday documents; very long or scanned files may cost a little more, again always shown upfront.',
      },
    ],
    whenToUse: "Converting PDF to Word makes sense any time you need to edit content that currently only exists as a fixed, uneditable PDF — updating an old resume, revising a contract clause, copying text into another document, or simply making corrections without retyping the whole thing from scratch.",
    recommendation: {
      icon: '🔍',
      prompt: 'Need OCR for a scanned PDF?',
      slug: 'ocr-pdf',
      label: 'Try OCR PDF',
    },
    relatedTools: [
      { slug: 'ocr-pdf', icon: '🔍', reason: 'If your PDF is a scan or photo rather than a digital file' },
      { slug: 'word-to-pdf', icon: '📄', reason: 'Turn your edited Word document back into a shareable PDF' },
      { slug: 'compress-pdf', icon: '🗜️', reason: 'Shrink the file size once you\'re done editing' },
      { slug: 'protect-pdf', icon: '🔒', reason: 'Add a password before sending a sensitive document on' },
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
      { slug: 'sign-documents', icon: '✍️' },
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
      { slug: 'sign-documents', icon: '✍️' },
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

  'markdown-to-pdf': {
    title: 'Markdown to PDF Guide',
    what: 'Turns Markdown — headings, lists, bold/italic, code blocks, tables, links — into a cleanly formatted, downloadable PDF.',
    whenToUse: 'Use this to turn README files, notes, documentation, or anything written in Markdown into a shareable, printable document without manually reformatting it.',
    steps: [
      { title: 'Paste or upload your Markdown', body: 'Type directly into the editor, or upload a .md file.' },
      { title: 'Preview it (optional)', body: 'Click "Show Preview" to see exactly how headings, lists, code blocks, and tables will render before converting.' },
      { title: 'Convert and download', body: 'Your PDF downloads immediately, styled with proper typography for headings, lists, code, and tables.' },
    ],
    tips: [
      'Fenced code blocks (using triple backticks) render with a dark background for readability — no extra formatting needed.',
      'Tables use standard Markdown table syntax with pipes and dashes — check the preview if a table looks off.',
      'Very long documents split across multiple PDF pages automatically, so there\'s no need to add manual page breaks.',
    ],
    mistakes: [
      'Expecting embedded images from local file paths to appear — only images referenced by a public URL will load during rendering.',
      'Not using the preview before converting a long document — it\'s the fastest way to catch a formatting issue before generating the final PDF.',
      'Mixing tab and space indentation in lists or code blocks, which can render inconsistently — stick to one or the other.',
    ],
    quickFaqs: [
      { q: 'What Markdown features are supported?', a: 'Headings, bold/italic, lists (ordered and unordered), links, inline code, fenced code blocks, blockquotes, tables, and horizontal rules.' },
      { q: 'Can I upload a .md file instead of pasting text?', a: 'Yes — use "Upload .md file" to load a Markdown file directly into the editor.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Will external images load?', a: 'Only images referenced by a public URL — local file paths won\'t resolve during rendering.' },
    ],
    recommendation: { icon: '🌐', prompt: 'Working from HTML instead?', slug: 'html-to-pdf', label: 'Try HTML to PDF' },
    relatedTools: [
      { slug: 'html-to-pdf', icon: '🌐' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'compress-pdf', icon: '🗜️' },
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

  'crop-pdf': {
    title: 'Crop PDF Guide',
    what: 'Trims the margins or whitespace off every page of a PDF, using a percentage-based crop applied evenly across all pages.',
    whenToUse: 'Use this to remove excess white border around a scanned document, tighten up a PDF exported with wide margins, or cut off a footer/header strip you don\'t need before printing or sharing.',
    steps: [
      { title: 'Upload your PDF', body: 'A preview of page 1 shows what the crop will look like.' },
      { title: 'Set the crop margins', body: 'Use a preset (Trim margins, Tight crop) or enter exact top/right/bottom/left percentages — the preview updates as you adjust them.' },
      { title: 'Crop and download', body: 'The same crop is applied to every page, and the cropped PDF downloads immediately.' },
    ],
    tips: [
      'The crop is one set of margins applied to all pages — if pages have very different content positions, check the preview carefully since it only shows page 1.',
      'Start with a small margin (5%) and increase it if you\'re not sure how much whitespace is safe to remove — you can always re-crop from the original.',
      'Cropping trims the visible page area itself, so make sure nothing you need — a signature, a footer, a page number — sits inside the margin you\'re removing.',
    ],
    mistakes: [
      'Setting a margin so large it would leave nothing on the page — the tool blocks this and asks you to reduce the numbers.',
      'Cropping without checking the preview first and accidentally cutting off content near the edge of the page.',
      'Assuming the crop is per-page — it\'s one uniform set of margins applied to every page in the document, not an individually adjusted crop.',
    ],
    quickFaqs: [
      { q: 'Can I crop each page differently?', a: 'No — the same margins are applied to every page in the document.' },
      { q: 'Will this remove content, or just hide it?', a: 'It genuinely resizes the page to the new cropped dimensions — content outside the crop area is gone, not just hidden.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '🔄', prompt: 'Also need to fix sideways pages?', slug: 'rotate-pdf', label: 'Try Rotate PDF' },
    relatedTools: [
      { slug: 'rotate-pdf', icon: '🔄' },
      { slug: 'document-enhancer', icon: '🩹' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'compress-pdf', icon: '🗜️' },
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
      { slug: 'sign-documents', icon: '✍️' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'merge-pdf', icon: '📎' },
    ],
  },

  'unlock-pdf': {
    title: 'Unlock PDF Guide',
    what: 'Removes a password from a PDF, given the password it\'s currently locked with — genuine decryption, not a workaround or a cracker.',
    whenToUse: 'Use this when you have a password-protected PDF and know the password, but want a plain copy you (or others) can open without typing it every time — or that other tools can read and edit.',
    steps: [
      { title: 'Upload the locked PDF', body: 'Select the password-protected file.' },
      { title: 'Enter its current password', body: 'This must be the exact password the file is already locked with.' },
      { title: 'Unlock and download', body: "Your file is sent securely to remove the password and is deleted automatically afterward — genuine decryption isn't something a browser alone can do, so this one step happens off-device." },
    ],
    tips: [
      'This removes a password you already know — it does not crack, guess, or bypass a password you\'ve forgotten.',
      'Once unlocked, the file behaves like any normal PDF — you can merge, edit, or convert it with any other Convertam tool.',
      'If you want to re-lock the unlocked file with a new password later, use Protect PDF.',
    ],
    mistakes: [
      'Entering the wrong password — the tool can\'t guess or recover it, it can only remove a password you provide correctly.',
      'Assuming this can open a PDF whose password you\'ve genuinely forgotten — that\'s not something this tool (or any legitimate tool) can do.',
      'Unlocking a shared or confidential document without considering whether it should stay protected before you send it on.',
    ],
    quickFaqs: [
      { q: 'Can this unlock a PDF if I don\'t know the password?', a: 'No — you must know and enter the current password. This tool removes a known password; it doesn\'t crack or bypass one.' },
      { q: 'Is my file uploaded anywhere?', a: 'Yes, briefly — genuine decryption requires a secure server step, unlike most Convertam tools which run entirely in your browser. The file is deleted automatically afterward.' },
      { q: 'Is this tool free?', a: 'Yes, currently free with no login required.' },
      { q: 'Can I lock it again afterward?', a: 'Yes — use Protect PDF to add a new password once you\'re done.' },
    ],
    recommendation: { icon: '🔒', prompt: 'Need to lock it again afterward?', slug: 'protect-pdf', label: 'Try Protect PDF' },
    relatedTools: [
      { slug: 'protect-pdf', icon: '🔒' },
      { slug: 'sign-documents', icon: '✍️' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'compress-pdf', icon: '🗜️' },
    ],
  },

  'remove-pdf-metadata': {
    title: 'Remove PDF Metadata Guide',
    what: 'Strips the hidden document properties inside a PDF — title, author, the software that created it, and creation/modification timestamps — that don\'t show up when you open the file but are visible to anyone who checks its properties.',
    whenToUse: 'Use this before sharing a PDF publicly or with someone outside your organization, when you don\'t want the original author\'s name, company software, or file history attached to the document.',
    steps: [
      { title: 'Upload your PDF', body: 'Convertam reads and displays whatever metadata is currently stored in the file.' },
      { title: 'Review what was found', body: 'See exactly which fields — title, author, creator, dates — are present before removing anything.' },
      { title: 'Remove and download', body: 'Every metadata field is stripped and the cleaned PDF downloads immediately.' },
    ],
    tips: [
      'This only removes the file\'s properties, not its visible content — text, images, and layout are completely unchanged.',
      'If the tool reports no metadata was found, the file is already clean — there\'s nothing more to do.',
      'Metadata is often added automatically by the app that created the PDF (Word, a scanner, a design tool) — most people never notice it\'s there until they check.',
    ],
    mistakes: [
      'Assuming a PDF has no hidden information just because it looks anonymous when opened — properties like author name are stored separately from the visible page content.',
      'Forgetting to re-check metadata after re-editing a cleaned PDF in another tool, which can reintroduce a new Producer or timestamp.',
      'Confusing this with redaction — this removes file properties, not visible sensitive text or images on the page (use Redact & Edit PDF for that).',
    ],
    quickFaqs: [
      { q: 'What exactly counts as metadata?', a: 'Title, Author, Subject, Keywords, Creator, Producer, and the creation/modification dates — properties stored in the file, not shown on the page itself.' },
      { q: 'Will this change how my PDF looks?', a: 'No — only the hidden document properties are removed. Every page looks exactly the same.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '🔒', prompt: 'Want to lock it down further?', slug: 'protect-pdf', label: 'Try Protect PDF' },
    relatedTools: [
      { slug: 'protect-pdf', icon: '🔒' },
      { slug: 'redact-pdf', icon: '⬛' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'merge-pdf', icon: '📎' },
    ],
  },
});

Object.assign(toolGuides, {
  // ---------------------------------------------------------------------
  // Image Tools / Image-PDF tools
  // ---------------------------------------------------------------------
  'jpg-to-pdf': {
    title: 'JPG to PDF Guide',
    what: 'Combines one or more JPG photos into a single PDF, with each image becoming its own page.',
    whenToUse: 'Use this to turn a set of photographed documents, receipts, or pages into one shareable PDF instead of sending separate image files.',
    steps: [
      { title: 'Upload your JPGs', body: 'Add one or more JPG images.' },
      { title: 'Convert to PDF', body: 'Each image becomes its own page, sized to match that image\'s exact pixel dimensions.' },
      { title: 'Download the PDF', body: 'Your combined file downloads as convertam-images.pdf.' },
    ],
    tips: [
      'Upload images in the order you want them to appear as pages — there\'s no reorder step here.',
      'For a mix of JPG and PNG images, or when you want page-size and layout options, Images to PDF is a more flexible alternative.',
      'Photograph documents straight-on and well-lit before converting — Document Enhancer can clean up a shaky or shadowed phone photo first.',
    ],
    mistakes: [
      "Uploading a file that isn't actually a JPG despite its extension — mismatched file types can cause the conversion to fail rather than silently working around it.",
      'Expecting to reorder pages after uploading — upload in your intended order from the start.',
      'Converting low-quality or blurry photos and expecting a crisp result — the PDF page is exactly as sharp as the source photo.',
    ],
    quickFaqs: [
      { q: 'Can I mix JPG and PNG files?', a: 'Use Images to PDF instead for mixed formats — this tool is built specifically around JPGs.' },
      { q: 'What page size does each image get?', a: "Each page is sized to match that image's own pixel dimensions, not a standard page size like A4." },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB per file.' },
    ],
    recommendation: { icon: '🖼️', prompt: 'Mixing JPG and PNG, or need A4 pages?', slug: 'images-to-pdf', label: 'Try Images to PDF' },
    relatedTools: [
      { slug: 'png-to-pdf', icon: '🖼️' },
      { slug: 'images-to-pdf', icon: '📚' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'document-enhancer', icon: '🩹' },
    ],
  },

  'png-to-pdf': {
    title: 'PNG to PDF Guide',
    what: 'Combines one or more PNG images into a single PDF, with each image becoming its own page.',
    whenToUse: 'Use this to turn PNG screenshots, diagrams, or graphics into one shareable PDF document.',
    steps: [
      { title: 'Upload your PNGs', body: 'Add one or more PNG images.' },
      { title: 'Convert to PDF', body: 'Each image becomes its own page, sized to that image\'s exact pixel dimensions.' },
      { title: 'Download the PDF', body: 'Your combined file downloads as convertam-images.pdf.' },
    ],
    tips: [
      'Upload in the order you want the pages to appear — there\'s no reorder step here.',
      'For mixed formats or A4-standardized pages, Images to PDF offers more layout control.',
      'PNG\'s transparency isn\'t meaningful on a printed PDF page — transparent areas will typically render as white.',
    ],
    mistakes: [
      "Uploading a file that's actually a different format saved with a .png extension — a real format mismatch can cause the conversion to fail.",
      'Expecting to reorder pages after uploading — order them correctly before you start.',
      'Assuming transparency is preserved meaningfully in the final PDF layout.',
    ],
    quickFaqs: [
      { q: 'Can I mix PNG and JPG files?', a: 'Use Images to PDF instead — it\'s built for mixed formats and adds page-size options.' },
      { q: 'What page size does each image get?', a: "Each page matches that image's own pixel dimensions, not a standard size like A4." },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB per file.' },
    ],
    recommendation: { icon: '🖼️', prompt: 'Mixing formats, or need A4 pages?', slug: 'images-to-pdf', label: 'Try Images to PDF' },
    relatedTools: [
      { slug: 'jpg-to-pdf', icon: '🖼️' },
      { slug: 'images-to-pdf', icon: '📚' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'convert-image-format', icon: '🔄' },
    ],
  },

  'pdf-to-jpg': {
    title: 'PDF to JPG Guide',
    what: 'Turns each page of a PDF into a separate JPG image.',
    whenToUse: 'Use this when you need individual images from a PDF — dropping pages into a slideshow, a document viewer that only accepts images, or a social post.',
    steps: [
      { title: 'Upload your PDF', body: 'Select the file you want to convert.' },
      { title: 'Convert', body: 'Every page is rendered as a high-resolution JPG.' },
      { title: 'Download your images', body: 'A single-page PDF downloads as one JPG; a multi-page PDF downloads as a zip with one file per page.' },
    ],
    tips: [
      'Each page renders at a fixed high scale for good sharpness, so there\'s no need to worry about resolution for typical viewing or printing needs.',
      'If you specifically need transparent backgrounds, use PDF to Images (PNG) instead, since JPG doesn\'t support transparency.',
      'Password-protected or corrupted PDFs will fail to convert — remove protection first if you have the password.',
    ],
    mistakes: [
      "Expecting to choose which pages convert — every page converts; use Extract PDF Pages first if you only want specific pages turned into images.",
      'Uploading a password-protected PDF and expecting it to convert without first removing the password.',
      'Needing transparency and using JPG output instead of PNG.',
    ],
    quickFaqs: [
      { q: 'Can I convert only some pages?', a: 'Not directly — every page converts. Use Extract PDF Pages first to create a smaller PDF with just the pages you want, then convert that.' },
      { q: 'What if my PDF has just one page?', a: 'It downloads directly as a single JPG rather than a zip.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '🌈', prompt: 'Need transparent backgrounds instead?', slug: 'pdf-to-png', label: 'Try PDF to Images (PNG)' },
    relatedTools: [
      { slug: 'pdf-to-png', icon: '🌈' },
      { slug: 'extract-pdf-pages', icon: '📑' },
      { slug: 'extract-pdf-images', icon: '🖼️' },
      { slug: 'jpg-to-pdf', icon: '📄' },
    ],
  },

  'pdf-to-png': {
    title: 'PDF to Images (PNG) Guide',
    what: 'Turns each page of a PDF into a separate PNG image — PNG supports transparency, unlike JPG.',
    whenToUse: 'Use this when you need page images that may require a transparent background, or simply prefer PNG\'s lossless quality over JPG compression.',
    steps: [
      { title: 'Upload your PDF', body: 'Select the file you want to convert.' },
      { title: 'Convert', body: 'Every page renders as a high-resolution PNG.' },
      { title: 'Download your images', body: 'A single-page PDF downloads as one PNG; multiple pages download as a zip, one file per page.' },
    ],
    tips: [
      'PNG files are typically larger than the equivalent JPG — if file size matters more than lossless quality, PDF to JPG may suit better.',
      'Password-protected or corrupted PDFs will fail — remove protection first if you have the password.',
      'Need to reduce the resulting image file sizes afterward? Image Compressor works on PNGs too.',
    ],
    mistakes: [
      'Choosing PNG when file size matters more than image quality — JPG typically produces smaller files for photographic content.',
      'Expecting to select specific pages — every page converts; use Extract PDF Pages beforehand for a subset.',
      'Uploading a password-protected PDF without removing the password first.',
    ],
    quickFaqs: [
      { q: 'Why choose PNG over JPG?', a: "PNG is lossless (no compression artifacts) and supports transparency; JPG produces smaller files but with some quality loss." },
      { q: 'Can I convert only some pages?', a: 'Not directly — extract the pages you want first with Extract PDF Pages, then convert that smaller PDF.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '🗜️', prompt: 'Resulting files too large?', slug: 'image-compressor', label: 'Try Image Compressor' },
    relatedTools: [
      { slug: 'pdf-to-jpg', icon: '📷' },
      { slug: 'extract-pdf-pages', icon: '📑' },
      { slug: 'image-compressor', icon: '🗜️' },
      { slug: 'png-to-pdf', icon: '📄' },
    ],
  },

  'images-to-pdf': {
    title: 'Images to PDF Guide',
    what: 'Combines multiple JPG, PNG, or WebP images into one PDF, in any order you choose — with more layout control than the format-specific JPG/PNG to PDF tools.',
    whenToUse: 'Use this when you have a mix of image formats, need to reorder pages before combining, or want the option of standardized A4 pages rather than pages sized to each photo.',
    steps: [
      { title: 'Upload your images', body: 'Add JPG, PNG, or WebP files — mixed formats are fine.' },
      { title: 'Reorder if needed', body: 'Use the ↑/↓ buttons to rearrange images, remove any you don\'t want, or "+ Add More" to include additional files.' },
      { title: 'Choose a page size', body: '"Match each image" fits each page to its own photo\'s dimensions (default); "Standard A4" centers every image on a uniform A4 page.' },
      { title: 'Download the PDF', body: 'Your file downloads as images.pdf.' },
    ],
    tips: [
      'Choose "Standard A4" when you want a consistent, professional-looking document regardless of each photo\'s original size or orientation.',
      'Reorder before downloading — the ↑/↓ controls make it easy to fix a mistake without re-uploading.',
      'WebP images work here directly, unlike the dedicated JPG to PDF and PNG to PDF tools.',
    ],
    mistakes: [
      'Choosing "Match each image" when your photos are wildly different sizes — the result can look inconsistent page to page; "Standard A4" evens that out.',
      'Forgetting to reorder before downloading and needing to redo the whole file.',
      'Expecting A4 mode to upscale a small image to fill the page — it never upscales beyond the image\'s original size, only centers and downscales if needed.',
    ],
    quickFaqs: [
      { q: 'What image formats are supported?', a: 'JPG, PNG, and WebP, and you can mix them freely in one PDF.' },
      { q: 'What\'s the difference between the two page-size options?', a: '"Match each image" sizes each page to that photo\'s own dimensions; "Standard A4" places every image on a uniform A4 page, centered, without ever upscaling beyond the original size.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'No hard cap enforced by this tool, though very large batches may take longer to process in your browser.' },
    ],
    recommendation: { icon: '🩹', prompt: 'Photos shaky or shadowed?', slug: 'document-enhancer', label: 'Clean them up first' },
    relatedTools: [
      { slug: 'jpg-to-pdf', icon: '🖼️' },
      { slug: 'document-enhancer', icon: '🩹' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'reorder-pdf', icon: '↕️' },
    ],
  },

  'pdf-to-text': {
    title: 'PDF to Text Guide',
    what: 'Pulls all the readable text out of a PDF, page by page, into a plain .txt file — no formatting, images, or layout, just the words.',
    whenToUse: 'Use this when you need the raw text of a PDF for pasting into another document, feeding into another tool, or searching through quickly — not when you need to preserve formatting (use PDF to Word for that).',
    steps: [
      { title: 'Upload your PDF', body: 'Choose the PDF you want to pull text from.' },
      { title: 'Review the extracted text', body: 'Text appears in a box, organized by page.' },
      { title: 'Copy or download', body: 'Copy it directly, or download as a .txt file.' },
    ],
    tips: [
      "This tool reads text that's already embedded in the PDF — it doesn't recognize text inside scanned images. Use OCR PDF if your file is a scan.",
      'Need the formatting (headings, tables, layout) preserved too? PDF to Word is the right tool for that instead.',
      'Very long PDFs may take a few extra seconds per page while the text is read.',
    ],
    mistakes: [
      "Using this on a scanned PDF (a photo of a document saved as PDF) and getting nothing back — scanned pages are images, not text, so OCR PDF is what you need instead.",
      'Expecting the original layout, spacing, or formatting to carry over — this tool intentionally strips all of that down to plain text.',
    ],
    quickFaqs: [
      { q: "Why did I get no text from my PDF?", a: "The PDF is likely a scanned document made of images rather than real text — try OCR PDF, which is built to read text from scanned pages." },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Are my files uploaded anywhere?', a: 'No — text extraction happens entirely in your browser.' },
      { q: 'Can I extract text from just one page?', a: 'Not directly — the tool extracts every page, but you can copy just the section you need from the result.' },
    ],
    recommendation: { icon: '🔎', prompt: 'Working from a scanned document instead?', slug: 'ocr-pdf', label: 'Try OCR PDF' },
    relatedTools: [
      { slug: 'pdf-to-word', icon: '📝' },
      { slug: 'ocr-pdf', icon: '🔎' },
      { slug: 'split-pdf', icon: '✂️' },
      { slug: 'merge-pdf', icon: '🔗' },
    ],
  },

  'extract-pdf-images': {
    title: 'Extract PDF Images Guide',
    what: 'Pulls the actual embedded images out of a PDF and lets you download them individually or as a ZIP — this finds real embedded pictures, not full-page renders.',
    whenToUse: 'Use this to recover the original photos or graphics embedded inside a PDF — a report with charts, a brochure with photos — without having to screenshot each one.',
    steps: [
      { title: 'Upload your PDF', body: 'Select the document containing the images you want.' },
      { title: 'Review the extracted images', body: 'Each found image is shown with its page number and pixel dimensions.' },
      { title: 'Download', body: 'Download images individually as PNG, or grab everything at once as extracted-images.zip.' },
    ],
    tips: [
      "This finds genuinely embedded raster images — if the PDF is a scan (one big image per page) or has no embedded pictures at all, you'll see a message suggesting OCR PDF or PDF to Images instead.",
      'Very small or decorative graphics (under roughly 200 bytes) are automatically skipped as likely blank artifacts.',
      'If you actually want a picture of each full page rather than embedded images, PDF to JPG or PDF to Images (PNG) is the right tool instead.',
    ],
    mistakes: [
      "Using this on a scanned PDF expecting embedded images to be found — a scan is one big page-image, not separate embedded pictures, so nothing meaningful gets extracted; PDF to Images renders the whole page instead.",
      "Expecting every embedded image format to be recoverable — images using color modes this tool can't decode (like CMYK) are silently skipped.",
      'Confusing this with PDF to JPG/PNG — those capture the whole rendered page; this tool only pulls out images that already exist as separate embedded objects.',
    ],
    quickFaqs: [
      { q: 'What if no images are found?', a: 'You\'ll see a message suggesting OCR PDF (if the PDF is a scan) or PDF to Images (to get a picture of the full page instead).' },
      { q: 'What image format do extracted images come in?', a: 'PNG, regardless of how they were originally embedded.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'No hard cap enforced, though very large PDFs may take longer to process.' },
    ],
    recommendation: { icon: '📷', prompt: 'No images found, or PDF is a scan?', slug: 'pdf-to-jpg', label: 'Try PDF to JPG instead' },
    relatedTools: [
      { slug: 'pdf-to-jpg', icon: '📷' },
      { slug: 'ocr-pdf', icon: '🔍' },
      { slug: 'pdf-to-png', icon: '🌈' },
      { slug: 'compress-pdf', icon: '🗜️' },
    ],
  },

  'compare-pdf': {
    title: 'Compare Documents Guide',
    what: 'Compares two versions of a PDF page by page and shows what was added, removed, or modified — with side-by-side, overlay, and page-by-page views, plus an exportable difference report. It compares text content (and, optionally, a rendered-page visual check); it is not a full geometric image diff.',
    whenToUse: 'Use this to spot exactly what changed in the wording between two drafts of a contract, policy, HR document, procurement document, or academic revision — without manually reading both side by side.',
    steps: [
      { title: 'Upload both PDFs', body: 'Add the original version and the revised version. If a document is already active in your workspace, it prefills the original slot automatically.' },
      { title: 'Choose comparison options', body: 'Optionally ignore insignificant whitespace, ignore page-number changes, or turn on a visual layout check for image/formatting differences text alone would miss.' },
      { title: 'Review the results', body: 'Switch between the Difference Summary, Side by Side, Page by Page, and Overlay views, and step through changes with next/previous navigation.' },
      { title: 'Export a report (optional)', body: 'Download a PDF report listing the compared files, pages affected, and every detected change — useful for records or handing off to someone else.' },
    ],
    tips: [
      'The difference summary lets you click any change to jump straight to that page in Page by Page view for full context.',
      'Turn on "Also compare visual layout" when you need to catch a moved image or reflowed section that reads identically as text but looks different on the page.',
      'If either PDF is a scan with no real text, this tool can\'t compare it — run OCR PDF on both first.',
      'The exported report lists detected differences only — it does not judge their legal or practical significance, so still have a qualified person review anything that matters.',
    ],
    mistakes: [
      "Treating the visual layout check as a full image diff — it flags pages that look meaningfully different at a glance, not precise pixel-level or geometric changes.",
      'Comparing a scanned PDF directly — with no extractable text, there\'s nothing to compare; OCR both files first.',
      'Comparing two genuinely different documents rather than two versions of the same one, which produces an unhelpfully large diff.',
    ],
    quickFaqs: [
      { q: 'Does this compare images or layout?', a: "By default it's a text comparison. Turning on \"Also compare visual layout\" additionally flags pages whose rendered appearance differs meaningfully, for changes text alone wouldn't catch." },
      { q: 'What if one PDF is scanned?', a: "A scanned PDF has no real extractable text, so it can't be compared directly — run OCR PDF on it first." },
      { q: 'Can I export the comparison result?', a: 'Yes — the Difference Summary view has a "Download Comparison Report" button that generates a PDF listing every detected change.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🔍', prompt: 'One of your PDFs is a scan?', slug: 'ocr-pdf', label: 'Run OCR PDF first' },
    relatedTools: [
      { slug: 'ocr-pdf', icon: '🔍' },
      { slug: 'redact-pdf', icon: '⬛' },
      { slug: 'sign-documents', icon: '✍️' },
      { slug: 'protect-pdf', icon: '🔒' },
    ],
  },

  'redact-pdf': {
    title: 'Redact & Edit PDF Guide',
    what: "Two related tools in one workspace: Black Redaction permanently removes sensitive information from a page, and White Correction covers a mistake and lets you type the fix directly on top, matching the surrounding text's style.",
    whenToUse: 'Use Black Redaction when information must never be recoverable — an account number, a name, anything confidential. Use White Correction when you just need to fix a visible typo or outdated detail and want it to look like it was always correct.',
    steps: [
      { title: 'Upload your PDF', body: 'Each page renders in the editor so you can work directly on top of it.' },
      { title: 'Choose Black or White on the Redact tab', body: '"Black (Permanent)" draws a solid redaction box. "White (Correction)" draws a white box to cover a mistake — the tool shows a warning that white boxes are for corrections, not for securely hiding confidential information.' },
      { title: 'Draw your box', body: 'Click and drag over the area — a small drag (under 4×4px) is discarded, and you can click an existing box afterward to move, resize, or delete it, with full undo/redo available.' },
      { title: 'For corrections, switch to the Text tab', body: 'Choose "✨ Match Nearby Text" to automatically pick up the nearby font size and color, or "🎨 Custom Style" to set your own font, size, color, and formatting. Click to place your replacement text and type it in.' },
      { title: 'Download your edited PDF', body: 'Every page is rendered into the final file as a flattened image — the redacted or corrected content is genuinely gone, not just covered.' },
    ],
    tips: [
      "\"Match Nearby Text\" reliably picks up font size and text color from content near where you click, but bold, italic, underline, and alignment always start at their defaults — apply those manually from the formatting toolbar if the original text had them.",
      'Use the eyedropper tool at any time to sample an exact color directly from the page, in either style mode.',
      'Zoom in before drawing small redaction boxes for precise placement over exactly the right text.',
    ],
    mistakes: [
      "Using White Correction to hide something confidential — it's designed for visible corrections, and the tool explicitly warns it isn't meant for securely removing sensitive information; use Black Redaction for that.",
      "Not knowing that every downloaded page becomes a flattened image — this genuinely removes redacted text, but it also means the entire document loses selectable, searchable, and screen-reader-accessible text everywhere, not just in the edited areas. Worth knowing before you download, especially if the recipient needs to search or copy from the file.",
      'Assuming bold, italic, or alignment are automatically detected in "Match Nearby Text" mode — they\'re not, and default to plain/left-aligned until you set them yourself.',
    ],
    quickFaqs: [
      { q: 'Is content really gone after Black Redaction, or just covered up?', a: "Really gone. Every page is rasterized into a flattened image on download, so there's no text or object underneath the black box to recover — this is what makes the removal genuine." },
      { q: 'Does that mean my whole document loses selectable text?', a: "Yes — because every page becomes a flattened image on export, the entire document (not just the edited areas) loses selectable, searchable, and copyable text. This is the tradeoff for guaranteeing redacted content is truly unrecoverable." },
      { q: 'What does "Match Nearby Text" actually detect?', a: "Font size and text color, reliably. It does not detect bold, italic, underline, or alignment — those always start at their defaults and need to be set manually if the surrounding text used them." },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📝', prompt: 'Need the result as an editable Word doc?', slug: 'pdf-to-word', label: 'Try PDF to Word' },
    relatedTools: [
      { slug: 'write-on-pdf', icon: '✏️' },
      { slug: 'protect-pdf', icon: '🔒' },
      { slug: 'watermark-pdf', icon: '💧' },
      { slug: 'compare-pdf', icon: '🔍' },
    ],
  },

  'annotate-pdf': {
    title: 'Annotate PDF Guide',
    what: 'A full PDF review workspace — thumbnails, canvas, and a properties/review panel side by side, with highlights, shapes, sticky notes, callouts, stamps, numbering, and in-workspace signing, all on top of the page.',
    whenToUse: 'Use this to review a document, mark it up for someone else, collect feedback with a resolve-tracked comment trail, or sign and date a page — without changing the underlying content the way Redact & Edit PDF or Write on PDF do.',
    steps: [
      { title: 'Upload your PDF', body: 'Every page renders as a thumbnail on the left and full-size on the canvas in the middle, so you can jump between pages and mark them up directly.' },
      { title: 'Pick a tool', body: 'Highlight, Underline, Strikethrough, Draw, Text, Sticky Note, Callout, Shape (rectangle/circle/arrow/line/cloud/polygon), Image, Numbering, Stamp, or Signature — each with its own color, style, or preset options in the toolbar.' },
      { title: 'Select, arrange, and organize', body: 'Multi-select with a marquee or shift-click, then align, distribute, duplicate, lock, hide, or reorder (bring forward/send back) from the Properties panel — or use keyboard shortcuts for undo, delete, and nudging.' },
      { title: 'Track feedback in the Review tab', body: 'A dashboard totals every annotation by type and flags unresolved comments; click any row to jump straight to it on the page, and mark notes, callouts, and signatures resolved as you address them.' },
      { title: 'Export exactly what you need', body: 'Apply Annotations produces the full annotated PDF; "Other exports" adds Comments only (just your notes/callouts), and a Review Summary as either PDF or Word for sharing feedback separately from the marked-up file.' },
    ],
    tips: [
      'Pin your most-used tools to the front of the toolbar with the ☆ star — it persists across sessions.',
      'The Numbering tool auto-increments (1, 2, 3…) as you place markers, with a one-click restart if you need to renumber a section.',
      'The Stamp Library has ready-made presets (APPROVED, URGENT, etc.) plus support for uploading your own image as a custom stamp.',
      'Signatures and initials can be typed, drawn, or uploaded from a photo — uploaded signatures are automatically isolated from their background.',
      '"Insert Date" drops a pre-filled, editable date label in one click — no need to type it out with the Text tool.',
      'The Review Summary dashboard and its PDF/Word exports share the exact same counts and comment text, so what you see on screen is what gets shared.',
      'Every export still flattens the page into an image — the tradeoff that keeps 13+ annotation types looking pixel-identical to what you drew, at the cost of losing selectable text on the annotated PDF (Comments-only and Review Summary exports are unaffected, since they aren\'t rasterized page copies).',
    ],
    mistakes: [
      'Expecting the exported Annotated PDF to keep annotations as separate, removable "layers" — they\'re flattened into the page image, so undo/redo only works before you export.',
      'Confusing this with Redact & Edit PDF — that tool permanently blacks out or corrects content; this one adds visible marks and comments on top without hiding anything.',
      'Not checking the Review tab\'s unresolved count before sending a document on — it\'s the fastest way to confirm every comment has actually been addressed.',
      'Forgetting hidden objects still count toward the document — "Hide" keeps an annotation out of the export and off the canvas, but it stays visible (greyed out) in the Review tab for a full audit trail.',
    ],
    quickFaqs: [
      { q: 'What\'s the difference between the 4 export options?', a: '"Apply Annotations" produces the full marked-up PDF with every visible annotation baked in. "Comments only" is the same PDF but limited to your notes, text labels, and callouts. "Review Summary" (PDF or Word) is a separate document listing every annotation by page with its resolved status — for sharing feedback without handing over the marked-up file itself.' },
      { q: 'Can I remove an annotation after adding it?', a: 'Yes — click any object to select it (or shift-click/marquee-select several) and use Delete, or reopen a note/text/callout to edit its text. Undo/redo covers every change up until you export.' },
      { q: 'Does this hide or redact anything?', a: 'No — annotations sit on top of the page and don\'t remove or cover the underlying content. Use Redact & Edit PDF if you need to permanently remove sensitive information.' },
      { q: 'Can I sign a document with this tool?', a: 'Yes — the Signature tool supports typed, hand-drawn, or uploaded signatures and initials, placed directly on the page like any other annotation.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '⬛', prompt: 'Need to permanently hide something instead?', slug: 'redact-pdf', label: 'Try Redact & Edit PDF' },
    relatedTools: [
      { slug: 'redact-pdf', icon: '⬛' },
      { slug: 'write-on-pdf', icon: '✏️' },
      { slug: 'sign-documents', icon: '✍️' },
      { slug: 'watermark-pdf', icon: '💧' },
    ],
  },

  'pdf-overlay': {
    title: 'PDF Overlay Guide',
    what: "Stamps one PDF — like a letterhead, watermark template, or design overlay — onto every page of another PDF.",
    whenToUse: "Use this to apply a consistent letterhead or template design across an entire document without editing each page individually — especially useful when the base document was created separately from your branding.",
    steps: [
      { title: 'Upload your base document', body: 'This is the document that will get stamped — every one of its pages receives the overlay.' },
      { title: 'Upload your overlay', body: 'Only page 1 of this file is used, regardless of how many pages it actually has.' },
      { title: 'Set the opacity', body: 'Adjust from 10% to 100% depending on how strongly the overlay should show through.' },
      { title: 'Download the combined PDF', body: 'Your file downloads as {filename}-overlaid.pdf, with the overlay scaled and centered on every page.' },
    ],
    tips: [
      "The overlay is automatically scaled to fit within each base page and centered — it doesn't need to match the base document's exact size.",
      'Use a lower opacity for a subtle watermark-style overlay, or full opacity for a solid letterhead.',
      'If you only want a text watermark rather than a full-page design, Watermark PDF is a simpler, more direct tool for that.',
    ],
    mistakes: [
      "Using a multi-page overlay expecting different pages to stamp different base pages — only page 1 of the overlay is ever used, applied identically to every base page.",
      'Expecting to reposition the overlay manually — it\'s always scaled to fit and centered, with no offset controls.',
      'Choosing full opacity when the base content needs to remain clearly readable underneath a busy overlay design.',
    ],
    quickFaqs: [
      { q: 'What if my overlay file has multiple pages?', a: 'Only page 1 is used — it\'s applied to every page of the base document, regardless of how many pages the overlay file itself contains.' },
      { q: 'Can I position the overlay somewhere other than centered?', a: 'Not currently — it\'s always scaled to fit the base page and centered.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'No hard cap enforced, though very large files may take longer to process.' },
    ],
    recommendation: { icon: '💧', prompt: 'Just need a simple text watermark?', slug: 'watermark-pdf', label: 'Try Watermark PDF' },
    relatedTools: [
      { slug: 'watermark-pdf', icon: '💧' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'invoice-generator', icon: '🧾' },
      { slug: 'protect-pdf', icon: '🔒' },
    ],
  },

  'image-compressor': {
    title: 'Image Compressor Guide',
    what: 'Reduces image file size with a quality slider — batch support for JPG, PNG, and WebP, with a live before/after size comparison for every image.',
    whenToUse: 'Use this when images are too large to upload, email, or load quickly on a website, and you need smaller files without switching to a completely different format.',
    steps: [
      { title: 'Upload your images', body: 'Add one or many images at once — JPG, PNG, or WebP.' },
      { title: 'Set the quality level', body: 'Slide from 10% (smallest, lowest quality) to 100% (largest, best quality) and watch each image\'s new size update live.' },
      { title: 'Download', body: 'Grab images individually or all at once as a ZIP.' },
    ],
    tips: [
      'Watch the live before/after percentage for each image rather than guessing — you can find the smallest size that still looks acceptable for your use.',
      'Keep "original type" as the output format for the most predictable compression behavior for that file type.',
      'For genuinely large batches, check the aggregate total-savings banner at the end rather than reviewing every file individually.',
    ],
    mistakes: [
      "Forcing PNG as the output format when the goal is a smaller file — canvas-based PNG encoding barely responds to the quality slider, so PNG output often won't shrink much no matter where you set it. JPG or WebP output compresses far more effectively.",
      'Compressing a very small, already-optimized image expecting further meaningful reduction.',
      'Choosing an extremely low quality setting for an image that will be printed or viewed at full size, where compression artifacts become visible.',
    ],
    quickFaqs: [
      { q: 'Why didn\'t my PNG shrink much?', a: "PNG is a lossless format, and browser-based PNG encoders don't respond strongly to a quality setting the way JPG does — for real size reduction on a PNG, converting to JPG or WebP output usually works much better." },
      { q: 'Can I compress a batch of images at once?', a: 'Yes, upload multiple images and each is compressed and shown individually, with an aggregate total-savings summary.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'No hard cap enforced, though very large batches may take longer to process in your browser.' },
    ],
    recommendation: { icon: '📐', prompt: 'Also need to resize before compressing?', slug: 'resize-image', label: 'Try Image Resizer & Cropper' },
    relatedTools: [
      { slug: 'resize-image', icon: '📐' },
      { slug: 'convert-image-format', icon: '🔄' },
      { slug: 'compress-pdf', icon: '🗜️' },
      { slug: 'watermark-image', icon: '💧' },
    ],
  },

  'resize-image': {
    title: 'Image Resizer & Cropper Guide',
    what: 'Resizes and crops images to exact dimensions — with ready-made presets for social media platforms, profile photos, and passport photos, plus a fully custom size option.',
    whenToUse: 'Use this whenever an image needs to fit a specific size requirement — a profile picture, a cover photo, a passport photo, or any platform-specific dimension you\'d otherwise have to calculate by hand.',
    steps: [
      { title: 'Upload your image', body: 'Select the photo you want to resize.' },
      { title: 'Pick a preset or set a custom size', body: 'Choose from Instagram, Facebook, LinkedIn, YouTube, X/Twitter, WhatsApp, or passport-photo presets (Nigerian or US sizing), or enter a custom width and height with optional aspect-ratio lock.' },
      { title: 'Choose Fill or Fit', body: '"Fill" crops to cover the target size exactly (drag to pan, slider to zoom 1×–3×); "Fit" scales the whole image to fit inside the frame without cropping, adding white space if needed.' },
      { title: 'Adjust and download', body: 'Rotate in 90° steps or flip horizontally/vertically if needed, then download as JPEG or PNG.' },
    ],
    tips: [
      'Use "Fill" when the exact frame size matters more than seeing 100% of the original photo — it crops rather than adding empty space.',
      'Use "Fit" when you need the entire original image visible, accepting some white space around it if the aspect ratio doesn\'t match exactly.',
      'For passport photos, use the dedicated preset for your country rather than eyeballing a custom size — the exact pixel dimensions matter for official use.',
    ],
    mistakes: [
      "Choosing \"Fill\" for a passport photo and accidentally cropping part of the face out — check the pan/zoom preview carefully before downloading.",
      'Using a custom size without locking the aspect ratio when you actually need a specific proportion, leading to unexpected distortion.',
      'Assuming "Fit" mode fills the entire frame — it preserves the whole image, which usually means visible white space unless the aspect ratios happen to match.',
    ],
    quickFaqs: [
      { q: 'What\'s the difference between Fill and Fit?', a: '"Fill" crops the image to exactly cover the target size (you pan and zoom to choose what\'s kept). "Fit" scales the whole image to fit inside the frame, which may leave white space if the proportions don\'t match.' },
      { q: 'Are passport photo presets accurate?', a: 'Yes — Nigerian (413×531) and US (600×600) presets use the standard required pixel dimensions for those photo types.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'No hard cap enforced, though very large images may take longer to process.' },
    ],
    recommendation: { icon: '🗜️', prompt: 'File still too large after resizing?', slug: 'image-compressor', label: 'Try Image Compressor' },
    relatedTools: [
      { slug: 'image-compressor', icon: '🗜️' },
      { slug: 'convert-image-format', icon: '🔄' },
      { slug: 'watermark-image', icon: '💧' },
      { slug: 'id-card-generator', icon: '🪪' },
    ],
  },

  'watermark-image': {
    title: 'Watermark Image Guide',
    what: 'Adds a text or logo watermark to one or more images — control color, size, opacity, rotation, and position, or tile it repeatedly across the image.',
    whenToUse: 'Use this to mark photos with your name, brand, or a "DRAFT"/"SAMPLE" label before sharing previews publicly, protecting them from being reused without credit.',
    steps: [
      { title: 'Upload your images', body: 'Add one or a batch of images to watermark identically.' },
      { title: 'Choose text or logo', body: 'Type a text watermark, or upload a logo image (PNG with transparency works best).' },
      { title: 'Style and position it', body: 'Set color, font size (12–120px), opacity, and rotation, then either pick one of the 9 fixed position points or check "Tiled" to repeat it across the whole image.' },
      { title: 'Download', body: 'Each image downloads as a watermarked PNG, individually or as a batch.' },
    ],
    tips: [
      'Use the tiled option for stronger protection against cropping — a single corner watermark can simply be cropped out, while a tiled pattern can\'t.',
      'Lower the opacity for a subtler mark that doesn\'t distract from the image itself.',
      'Use a transparent PNG for your logo so the watermark blends naturally rather than showing a solid background box.',
    ],
    mistakes: [
      "Expecting the tiled and single-position options to work together — checking \"Tiled\" hides the position grid, since the two are mutually exclusive.",
      'Applying the same watermark settings to a whole batch of very differently-sized images without checking a few individually — position and scale are applied uniformly, which may look different across images of different dimensions.',
      'Setting opacity too high on a watermark meant to be subtle, obscuring the underlying image.',
    ],
    quickFaqs: [
      { q: 'Can I combine a tiled pattern with a single fixed position?', a: 'No — checking "Tiled" replaces the fixed 9-point position grid; they\'re mutually exclusive options.' },
      { q: 'What output format do I get?', a: 'Always PNG, regardless of what format your original images were.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'No hard cap enforced, though very large batches may take longer to process.' },
    ],
    recommendation: { icon: '💧', prompt: 'Need this for a PDF instead of images?', slug: 'watermark-pdf', label: 'Try Watermark PDF' },
    relatedTools: [
      { slug: 'watermark-pdf', icon: '💧' },
      { slug: 'resize-image', icon: '📐' },
      { slug: 'convert-image-format', icon: '🔄' },
      { slug: 'image-compressor', icon: '🗜️' },
    ],
  },

  'convert-image-format': {
    title: 'Image Format Converter Guide',
    what: 'Converts images between JPG, PNG, and WebP formats, with batch support for multiple files at once.',
    whenToUse: 'Use this when you need a specific image format for a platform requirement, need transparency (PNG/WebP) that JPG can\'t provide, or want WebP\'s smaller file sizes for the web.',
    steps: [
      { title: 'Upload your images', body: 'Add one or many images in any supported format.' },
      { title: 'Choose the target format', body: 'Select JPG, PNG, or WebP.' },
      { title: 'Download', body: 'Converted files download individually or as a ZIP for a batch.' },
    ],
    tips: [
      'Converting to JPG flattens any transparency onto a white background — make sure that\'s what you want before converting a logo or graphic with transparent areas.',
      'WebP typically gives the smallest file size for web use while still supporting transparency, if your target platform supports it.',
      'Need to control quality/compression level rather than just format? Image Compressor is the dedicated tool for that — this one converts at a fixed quality.',
    ],
    mistakes: [
      "Converting a logo or graphic with a transparent background to JPG and being surprised the transparent areas turn solid white — use PNG or WebP instead if transparency matters.",
      "Expecting a quality/size slider here — this tool converts at a fixed quality; use Image Compressor if you need to control compression level.",
      'Converting to WebP for a platform or software that doesn\'t actually support it yet.',
    ],
    quickFaqs: [
      { q: 'What happens to transparency when converting to JPG?', a: "It's flattened onto a white background, since JPG doesn't support transparency at all." },
      { q: 'Can I control the compression quality?', a: 'Not here — conversion happens at a fixed quality level. Use Image Compressor separately if you need a quality slider.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'No hard cap enforced, though very large batches may take longer to process.' },
    ],
    recommendation: { icon: '🗜️', prompt: 'Need to control file size too?', slug: 'image-compressor', label: 'Try Image Compressor' },
    relatedTools: [
      { slug: 'image-compressor', icon: '🗜️' },
      { slug: 'resize-image', icon: '📐' },
      { slug: 'jpg-to-pdf', icon: '📄' },
      { slug: 'watermark-image', icon: '💧' },
    ],
  },

  'heic-to-jpg': {
    title: 'HEIC to JPG/PNG Guide',
    what: 'Converts iPhone HEIC/HEIF photos to JPG or PNG, entirely in your browser, with batch support for multiple files at once.',
    whenToUse: 'Use this when a website, app, or program rejects your iPhone photos because they\'re in HEIC format and only accepts JPG or PNG.',
    steps: [
      { title: 'Upload your HEIC photos', body: 'Add one or many .heic/.heif files from your iPhone.' },
      { title: 'Choose JPG or PNG', body: 'Pick JPG for smaller files, PNG if you need transparency support.' },
      { title: 'Download', body: 'Converted files download individually or as a ZIP for a batch.' },
    ],
    tips: [
      'JPG is the right choice for ordinary photos — smaller files with no meaningful quality loss for typical use.',
      'If your iPhone is set to "Most Compatible" instead of "High Efficiency" in Camera settings, new photos already save as JPG and won\'t need converting.',
      'Live Photos and HEIC bursts convert using their main image — the motion/video portion isn\'t included in the JPG/PNG output.',
    ],
    mistakes: [
      'Assuming every "HEIC" file will convert cleanly — a small number of corrupted or unusually encoded files can fail; try re-exporting from your device if one won\'t convert.',
      'Choosing PNG for ordinary photos and ending up with unnecessarily large files — PNG is best reserved for images that actually need transparency.',
    ],
    quickFaqs: [
      { q: 'What is a HEIC file?', a: 'HEIC (High Efficiency Image Format) is the photo format iPhones use by default since iOS 11 — smaller than JPG at similar quality, but not universally supported outside Apple devices.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Are my photos uploaded anywhere?', a: 'No — conversion happens entirely in your browser using your device\'s own processing power.' },
      { q: 'Can I convert several photos at once?', a: 'Yes — upload multiple HEIC files and download them individually or all together as a ZIP.' },
    ],
    recommendation: { icon: '🗜️', prompt: 'Need to shrink the file size too?', slug: 'image-compressor', label: 'Try Image Compressor' },
    relatedTools: [
      { slug: 'convert-image-format', icon: '🔁' },
      { slug: 'image-compressor', icon: '🗜️' },
      { slug: 'jpg-to-pdf', icon: '📄' },
      { slug: 'resize-image', icon: '📐' },
    ],
  },

  'webp-to-jpg': {
    title: 'WebP to JPG/PNG Guide',
    what: 'Converts WebP images to JPG or PNG, entirely in your browser, with batch support for multiple files at once.',
    whenToUse: 'Use this when a website, program, or platform doesn\'t accept WebP images — many older tools and some social platforms still expect JPG or PNG.',
    steps: [
      { title: 'Upload your WebP images', body: 'Add one or many .webp files.' },
      { title: 'Choose JPG or PNG', body: 'Pick JPG for smaller files, PNG if you need transparency support.' },
      { title: 'Download', body: 'Converted files download individually or as a ZIP for a batch.' },
    ],
    tips: [
      'JPG is the right choice for ordinary photos — smaller files with no meaningful quality loss for typical use.',
      'If the WebP image has transparency (a logo or graphic), choose PNG to keep it — JPG will fill any transparent areas with white.',
      'WebP is often used for web images specifically because it\'s smaller than JPG/PNG — converting back will usually increase file size.',
    ],
    mistakes: [
      'Choosing JPG for a WebP image with transparency — the transparent areas will be filled solid white instead of staying see-through.',
      'Assuming every WebP file will convert cleanly — a small number of unusually encoded or corrupted files can fail; try re-saving or re-exporting the source if one won\'t convert.',
    ],
    quickFaqs: [
      { q: 'What is a WebP file?', a: 'WebP is a modern image format developed by Google — typically smaller than JPG or PNG at similar quality, widely used on websites, but not accepted everywhere.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Are my images uploaded anywhere?', a: 'No — conversion happens entirely in your browser using your device\'s own processing power.' },
      { q: 'Can I convert several images at once?', a: 'Yes — upload multiple WebP files and download them individually or all together as a ZIP.' },
    ],
    recommendation: { icon: '🗜️', prompt: 'Need to shrink the file size too?', slug: 'image-compressor', label: 'Try Image Compressor' },
    relatedTools: [
      { slug: 'convert-image-format', icon: '🔁' },
      { slug: 'image-compressor', icon: '🗜️' },
      { slug: 'jpg-to-pdf', icon: '📄' },
      { slug: 'resize-image', icon: '📐' },
    ],
  },

  'meme-generator': {
    title: 'Meme Generator Guide',
    what: 'Adds the classic bold top and bottom caption text to any image — the traditional meme format, kept intentionally simple.',
    whenToUse: 'Use this for a quick, classic-style meme with top/bottom text — not for multi-panel memes or custom text placement, which this tool deliberately doesn\'t support.',
    steps: [
      { title: 'Upload your image', body: 'Choose the picture you want to caption.' },
      { title: 'Add your top and bottom text', body: 'Type the caption text for each position.' },
      { title: 'Adjust the size and download', body: 'One font-size slider (20–90px) controls both captions; text automatically shrinks to fit if it\'s too wide. Download as meme.png.' },
    ],
    tips: [
      'Keep captions short — the auto-shrink feature keeps text on the image, but very long lines will end up quite small.',
      'This tool intentionally uses the classic white-with-black-outline Impact-style font — there\'s no font or color picker, by design, to keep the format instantly recognizable.',
      'For a custom-positioned caption or a different font/color, Watermark Image gives you more control, though without the classic meme look.',
    ],
    mistakes: [
      "Expecting to reposition the captions anywhere other than top and bottom — that placement is fixed.",
      'Writing very long captions and being surprised the text shrinks significantly to fit.',
      'Looking for font or color customization — this tool is deliberately locked to the classic meme style; use Watermark Image for custom text styling instead.',
    ],
    quickFaqs: [
      { q: 'Can I change the font or text color?', a: "No — it's fixed to the classic white-with-black-outline style that defines this meme format." },
      { q: 'Can I add more than two captions?', a: 'No, just top and bottom text, matching the traditional meme layout.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'What format does it download as?', a: 'Always PNG.' },
    ],
    recommendation: { icon: '💧', prompt: 'Need custom text placement or styling?', slug: 'watermark-image', label: 'Try Watermark Image' },
    relatedTools: [
      { slug: 'watermark-image', icon: '💧' },
      { slug: 'resize-image', icon: '📐' },
      { slug: 'convert-image-format', icon: '🔄' },
      { slug: 'image-compressor', icon: '🗜️' },
    ],
  },

  'document-enhancer': {
    title: 'Document Enhancer Guide',
    what: 'Cleans up a phone photo of a document — crop it to just the page, straighten it, reduce uneven shadows/lighting, and sharpen it for a proper scan look.',
    whenToUse: 'Use this right after photographing a document with your phone, before you need it to look like an actual scan — especially when the lighting was uneven or the shot wasn\'t perfectly straight.',
    steps: [
      { title: 'Upload your photo', body: 'Choose the document photo you want to clean up.' },
      { title: 'Crop to just the document', body: 'Drag the corner handles to select just the page — this is a manual crop, so position it carefully rather than expecting automatic edge detection.' },
      { title: 'Straighten and reduce shadows', body: 'Use the Straighten slider for a crooked shot, and Reduce Shadows to flatten uneven lighting — this genuinely corrects the lighting gradient, not just a brightness bump.' },
      { title: 'Choose a mode and fine-tune', body: 'Color, Grayscale, or Black & White (with its own threshold slider); adjust Brightness, Contrast, and Sharpen as needed. Or just click "✨ Auto-Enhance" for a sensible one-click starting point.' },
      { title: 'Download', body: 'Your enhanced image downloads as enhanced-document.png, processed at up to 1800px on the longest side.' },
    ],
    tips: [
      'Reduce Shadows works especially well before switching to Black & White mode — flattening the lighting first makes the threshold conversion far more reliable on unevenly-lit photos.',
      '"✨ Auto-Enhance" is a genuinely good starting point (grayscale, moderate brightness/contrast/sharpen, and shadow reduction) — apply it first, then fine-tune from there rather than starting from scratch.',
      'Crop as tightly as possible to just the document — background clutter left in the frame won\'t benefit from the color/lighting corrections meant for the page itself.',
      'If you arrived here from Sign Documents\'s "try Document Enhancer" link, your photo is already loaded — enhance it, then use the "Continue to Sign Documents" button to go straight back and retry automatic extraction, no re-upload needed.',
    ],
    mistakes: [
      "Skipping the crop step on a photo with a lot of background visible — the enhancement adjustments are tuned for the document itself, not whatever surface it was photographed on.",
      'Using Straighten to fix a photo that\'s sideways rather than slightly crooked — this is a fine-angle slider (±15°), not a 90°/180° rotation; use Rotate PDF\'s rotation for that instead if your file is a PDF, or re-crop and re-shoot for a badly sideways photo.',
      "Expecting automatic shadow/edge detection for the crop and straighten steps — those two remain manual by design, so take a moment to position them carefully.",
    ],
    quickFaqs: [
      { q: 'Does this actually remove shadows, or just brighten the image?', a: "It genuinely corrects uneven lighting — the Reduce Shadows slider estimates the lighting gradient across the photo and flattens it, rather than applying a flat brightness increase that would leave shadowed areas still visibly darker." },
      { q: 'Will Reduce Shadows damage a photo that has no real shadow?', a: 'No — it first checks how much real lighting variation is actually present. On an already clean, evenly-lit photo it has little to no visible effect, even at a high slider value, instead of applying a heavy-handed correction it doesn\'t need.' },
      { q: 'Is the crop or straighten automatic?', a: 'No, both are manual — drag the crop handles and use the straighten slider yourself; there\'s no auto-detect edge or auto-deskew.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'What resolution is the output?', a: 'Processed and exported at up to 1800px on the longest side — plenty for reading and printing, while keeping the tool fast.' },
    ],
    recommendation: { icon: '🔍', prompt: 'Need to extract the text afterward?', slug: 'ocr-pdf', label: 'Try OCR PDF' },
    relatedTools: [
      { slug: 'ocr-pdf', icon: '🔍' },
      { slug: 'sign-documents', icon: '✍️' },
      { slug: 'smart-converter', icon: '✨' },
      { slug: 'images-to-pdf', icon: '📚' },
    ],
  },
});

Object.assign(toolGuides, {
  // ---------------------------------------------------------------------
  // PDF Editor
  // ---------------------------------------------------------------------
  'write-on-pdf': {
    title: 'Write on PDF Guide',
    what: 'Lets you click anywhere on a PDF and type text directly onto it — scanned forms, bank forms, printed documents, anything.',
    whenToUse: "Use this for any PDF that isn't a genuine fillable form but still needs information typed onto it — a printed application scanned back in, a form with no interactive fields, or a document that needs a note added at a specific spot.",
    steps: [
      { title: 'Upload your PDF', body: 'The document renders page by page so you can work directly on top of it.' },
      { title: 'Add text boxes', body: 'Click "+ Add Text," then click exactly where you want to type — a text box appears right at that spot.' },
      { title: 'Type your text', body: 'Press Enter or Escape when done with each field, then add the next one wherever you need it.' },
      { title: 'Choose size and color, then download', body: 'Adjust the font size to roughly match the form\'s printed text, then download your completed PDF.' },
    ],
    tips: [
      'Match your text size to the surrounding printed text by eye before placing each box — there\'s a size selector for this.',
      'Empty text boxes are automatically left out of the final download, so it\'s fine to click around before deciding exactly where to place text.',
      "If the PDF has real, interactive form fields (not just printed lines to write on), Fill PDF Forms handles that more precisely — check that first for official digital forms.",
    ],
    mistakes: [
      "Using this on a genuine fillable PDF form (one with real interactive fields) instead of Fill PDF Forms — Write on PDF works anywhere, but a real form fills more precisely and can be flattened at the end.",
      'Not zooming in before placing text on a tightly-spaced printed form, leading to text that doesn\'t quite line up with the printed lines.',
      'Forgetting to press Enter or Escape after typing, which can leave a text box in an unexpected state before adding the next one.',
    ],
    quickFaqs: [
      { q: 'What\'s the difference between this and Fill PDF Forms?', a: 'Fill PDF Forms works on PDFs with real, built-in interactive fields — proper digital forms. Write on PDF works on any PDF at all, including scans and printed documents with no real fields, by letting you click and type anywhere.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB per file.' },
      { q: 'Can I choose the font?', a: 'Text uses a standard font at a size you control — there isn\'t a separate font-family picker.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📋', prompt: 'PDF has real interactive form fields?', slug: 'fill-pdf', label: 'Try Fill PDF Forms instead' },
    relatedTools: [
      { slug: 'fill-pdf', icon: '📋' },
      { slug: 'sign-documents', icon: '✍️' },
      { slug: 'redact-pdf', icon: '⬛' },
      { slug: 'watermark-pdf', icon: '💧' },
    ],
  },

  'fill-pdf': {
    title: 'Fill PDF Forms Guide',
    what: 'Fills in a digital PDF form that has real, built-in fields — text boxes, checkboxes, dropdowns, radio groups — directly on screen, then locks the answers into the final file.',
    whenToUse: "Use this specifically for genuine fillable PDF forms — government forms, job applications, bank forms — that were built with actual form fields, not just printed lines on a scan.",
    steps: [
      { title: 'Upload your PDF form', body: "Convertam checks whether it contains real form fields — if it doesn't, you'll be pointed to Write on PDF instead, which works on any PDF." },
      { title: 'Fill in the fields', body: 'Text fields, checkboxes, dropdowns, and radio groups all appear in a straightforward list — fill them the same way you would in any digital form.' },
      { title: 'Download the completed form', body: 'Your answers are flattened into the PDF, becoming a permanent, non-editable part of the document.' },
    ],
    tips: [
      "If the tool tells you no fields were found, the PDF likely doesn't have real interactive fields — Write on PDF lets you click and type anywhere instead, which works on any PDF.",
      'Review every field before downloading — once flattened, your answers become a permanent part of the document and aren\'t easily edited afterward.',
      'Checkbox and radio fields are shown as simple Yes/No or selection controls rather than requiring you to click a tiny box precisely.',
    ],
    mistakes: [
      "Uploading a scanned form or a PDF with only printed lines (no real interactive fields) and expecting fields to appear — that's exactly the case Write on PDF is built for instead.",
      'Downloading before double-checking every field, since flattening makes the answers a fixed, unchangeable part of the file.',
      'Assuming the tool remembers your answers if you reload — start over with the original blank form if you need to make major changes.',
    ],
    quickFaqs: [
      { q: 'What if my PDF has no fillable fields?', a: 'You\'ll get a clear message suggesting Write on PDF instead, which lets you click and type anywhere on any PDF, including scans.' },
      { q: 'Can I edit my answers after downloading?', a: 'No — the answers are flattened into the PDF, becoming a permanent part of it rather than remaining editable fields.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'No hard cap enforced, though very large files may take longer to process.' },
    ],
    recommendation: { icon: '✏️', prompt: 'No real fields in your PDF?', slug: 'write-on-pdf', label: 'Try Write on PDF instead' },
    relatedTools: [
      { slug: 'write-on-pdf', icon: '✏️' },
      { slug: 'sign-documents', icon: '✍️' },
      { slug: 'protect-pdf', icon: '🔒' },
      { slug: 'merge-pdf', icon: '📎' },
    ],
  },

  'sign-documents': {
    title: 'Sign Documents Guide',
    what: 'Upload a photo of your handwritten signature and Convertam automatically tries to isolate just the ink from the background, then lets you place it anywhere on a document — PDF, Word, or a photo of a printed page.',
    whenToUse: 'Use this to add a personal handwritten signature to a document without printing, signing on paper, and re-scanning it — whatever format the document is in.',
    steps: [
      { title: 'Sign on plain paper and photograph it', body: 'Use dark ink on a plain white background, in bright, even light, avoiding shadows — this gives Convertam the best chance of isolating your signature automatically.' },
      { title: 'Upload the photo', body: 'Convertam analyzes it and tries to automatically extract just your signature, discarding the rest of the page — no manual cropping needed if this succeeds.' },
      { title: 'If automatic extraction succeeds', body: 'You\'ll move straight on to uploading the document you want to sign — nothing else to do.' },
      { title: 'If it doesn\'t succeed', body: 'You\'ll be asked to drag a crop box around just your signature. If the photo\'s lighting or contrast is genuinely poor, a "try Document Enhancer" link carries the photo straight over there for you — enhance it, then click "Continue to Sign Documents" to come right back and retry automatically, no re-upload needed.' },
      { title: 'Upload the document to sign', body: 'Upload a PDF, a Word document (.docx/.doc), or a JPG/PNG photo of a printed page — Convertam automatically converts anything that isn\'t already a PDF in the background, then opens it in the signing workspace exactly as if you\'d uploaded a PDF (max 100MB). You never need to convert it yourself first.' },
      { title: 'Position, resize, and download', body: 'Drag your signature into place, resize it with the slider, and download the signed PDF.' },
    ],
    tips: [
      'The whiter and more evenly lit your paper background, the more likely automatic extraction succeeds on the first try — avoid shadows falling across the signature.',
      'Use dark ink (black or dark blue) that contrasts clearly against the white paper for the cleanest result.',
      'If your photo has poor lighting, shadows, faded ink, or low contrast, open Document Enhancer first to clean it up before uploading here — it\'s built to handle exactly that.',
      'Uploading a Word document or a photo of a page works the same as uploading a PDF — Convertam converts it automatically, so just upload whatever format you already have.',
    ],
    mistakes: [
      "Assuming you always have to crop your signature yourself before uploading — Convertam tries automatic extraction first, and manual cropping is only a fallback for photos it can't isolate cleanly.",
      "Photographing your signature on colored, lined, or textured paper — background isolation is tuned for a plain white background and won't clean up colored paper the same way.",
      'Signing with a light-colored pen that doesn\'t contrast enough against white paper, leaving a faint or patchy result.',
      'Only placing one signature per download — this tool signs one page at a time in a single pass, so a document needing signatures on several pages needs to be run through more than once and the results combined.',
    ],
    quickFaqs: [
      { q: 'Can I sign a contract online?', a: 'Yes — upload the contract as a PDF, Word document, or a photo of a printed page, place your signature anywhere on it, and download the signed file. No printing, signing on paper, or scanning required.' },
      { q: 'Do I need to crop my signature photo myself?', a: 'Not usually — Convertam automatically tries to isolate just the signature first. You\'ll only be asked to crop it yourself if that automatic step isn\'t reliable for your particular photo.' },
      { q: 'Can I upload a Word document instead of a PDF?', a: 'Yes — upload a .docx or .doc file and Convertam automatically converts it to PDF in the background, then opens it in the signing workspace exactly as if you\'d uploaded a PDF. You never have to convert it yourself.' },
      { q: 'What if my photo has poor lighting or shadows?', a: 'When Sign Documents detects this, the "try Document Enhancer" link carries your photo straight over there — no re-upload needed. Enhance it, then click "Continue to Sign Documents" to come back and automatically retry.' },
      { q: 'Can I sign multiple pages in one pass?', a: 'This tool places one signature at a time — for multiple pages, sign each one in a separate pass and combine the results with Merge PDF if needed.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB for the document you\'re signing.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required — including the automatic Word-to-PDF conversion.' },
    ],
    recommendation: { icon: '✨', prompt: 'Signature photo has poor lighting or shadows?', slug: 'document-enhancer', label: 'Clean it up with Document Enhancer first' },
    relatedTools: [
      { slug: 'document-enhancer', icon: '✨' },
      { slug: 'write-on-pdf', icon: '✏️' },
      { slug: 'fill-pdf', icon: '📋' },
      { slug: 'merge-pdf', icon: '📎' },
    ],
  },

  'reorder-pdf': {
    title: 'Reorder PDF Pages Guide',
    what: 'Lets you drag and drop page thumbnails into any order, then download the rearranged file.',
    whenToUse: 'Use this when a document\'s pages are in the wrong order — a scanned stack fed in incorrectly, or a document that just needs restructuring — without needing to remove or add any pages.',
    steps: [
      { title: 'Upload your PDF', body: 'Every page appears as a thumbnail.' },
      { title: 'Drag pages into the order you want', body: 'Works with mouse drag on desktop or touch drag on mobile.' },
      { title: 'Download', body: 'Your reordered PDF downloads with pages in their new sequence.' },
    ],
    tips: [
      'Zoom out or scroll through all thumbnails first to get an overview before you start dragging, especially on longer documents.',
      "If you also need to remove some pages while reordering, do that separately with Remove PDF Pages — this tool is focused purely on order.",
      'On mobile, touch-drag works but can feel slightly less precise on very long documents — take your time with the drag gesture.',
    ],
    mistakes: [
      'Expecting to delete pages here as well as reorder them — this tool only rearranges; use Remove PDF Pages if you also need to drop some.',
      'Not reviewing the final thumbnail order carefully before downloading, especially on documents with many similar-looking pages.',
      'Rushing touch-drag gestures on mobile for long documents, which can lead to an imprecise drop position.',
    ],
    quickFaqs: [
      { q: 'Can I remove pages here too?', a: 'No, this tool only reorders — use Remove PDF Pages for deleting pages, and Reorder PDF Pages just for rearranging.' },
      { q: 'Does this work on mobile?', a: 'Yes, touch-drag is supported, though very long documents may feel slightly less precise than dragging with a mouse.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '🗑️', prompt: 'Need to remove pages too?', slug: 'remove-pdf-pages', label: 'Try Remove PDF Pages' },
    relatedTools: [
      { slug: 'remove-pdf-pages', icon: '🗑️' },
      { slug: 'merge-pdf', icon: '📎' },
      { slug: 'split-pdf', icon: '✂️' },
      { slug: 'extract-pdf-pages', icon: '📑' },
    ],
  },

  'watermark-pdf': {
    title: 'Watermark PDF Guide',
    what: 'Adds a custom text watermark to every page of a PDF — CONFIDENTIAL, DRAFT, your name, or any custom text.',
    whenToUse: 'Use this to mark a document\'s status or ownership across every page — flagging a draft before final review, marking a document confidential, or simply branding it with your name or company.',
    steps: [
      { title: 'Upload your PDF', body: 'A live preview shows the watermark on page 1 as you set it up.' },
      { title: 'Choose your text', body: 'Pick from 6 common presets or type custom text, up to 60 characters.' },
      { title: 'Style and position it', body: 'Set size, opacity, color, and rotation, then click or drag on the preview to position it.' },
      { title: 'Choose which pages get it', body: 'Apply to all pages, just the first page, or a specific range like "1,3,5-8".' },
      { title: 'Download', body: 'Your watermarked PDF downloads with the design applied to your chosen pages.' },
    ],
    tips: [
      'The live preview always shows page 1, even if you\'ve chosen a different page range — check the downloaded file if you\'re applying to specific pages other than the first, since you won\'t see a live preview of those exact pages beforehand.',
      'Lower opacity (semi-transparent) keeps the underlying content readable while still clearly marking the document.',
      'A diagonal rotation (around 45°) is the classic watermark look and tends to read clearly without covering too much text.',
    ],
    mistakes: [
      "Setting a page range other than \"all\" or \"first only\" and assuming the preview reflects those specific pages — the live preview always shows page 1 regardless of your page-range choice.",
      'Using full opacity on a busy document, making the underlying text hard to read underneath the watermark.',
      'Writing custom text longer than 60 characters, which won\'t fit — keep it concise.',
    ],
    quickFaqs: [
      { q: 'Does the preview show the pages I\'ve selected in my range?', a: 'No — the live preview always shows page 1, regardless of the page range you\'ve chosen for the actual watermark. Check the downloaded file to confirm other pages look right.' },
      { q: 'Is there a character limit for custom text?', a: 'Yes, 60 characters.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Is there a file size limit?', a: 'Yes, 100MB.' },
    ],
    recommendation: { icon: '🔢', prompt: 'Need page numbers too?', slug: 'add-page-numbers', label: 'Try Add Page Numbers' },
    relatedTools: [
      { slug: 'add-page-numbers', icon: '🔢' },
      { slug: 'protect-pdf', icon: '🔒' },
      { slug: 'sign-documents', icon: '✍️' },
      { slug: 'pdf-overlay', icon: '🎨' },
    ],
  },

  // ---------------------------------------------------------------------
  // Business Tools
  // ---------------------------------------------------------------------
  'id-card-generator': {
    title: 'ID Card Generator Guide',
    what: 'Designs and produces a professional front-and-back ID card — choose an industry style, upload a photo, fill in details, and download ready to print and laminate.',
    whenToUse: 'Use this for staff IDs, school IDs, membership cards, event passes, or any situation where you need a proper-looking two-sided ID card without design software.',
    steps: [
      { title: 'Choose an industry', body: 'Corporate, School, Church, Hospital, Event Pass, Security, Construction, or University — each sets sensible defaults like the right ID number label and secondary field (e.g. "Department," "Class," "Ward").' },
      { title: 'Pick a layout', body: 'Heritage (photo left, details right), Prestige (dark full panel with centered photo and seal), or Edge (diagonal panel, photo right).' },
      { title: 'Upload a photo and position it', body: 'Zoom and pan controls let you frame the photo exactly within the card.' },
      { title: 'Fill in the details', body: 'Organization name and tagline, full name, role, ID number, and industry-specific fields like blood group (Hospital/Construction) or valid-until date (Event Pass).' },
      { title: 'Add back-of-card options and download', body: 'Optionally include a signature line and emergency contact on the back, then download front and back as PNG files.' },
    ],
    tips: [
      'Choose the industry preset closest to your actual use case first — it sets the right terminology (like "Admission No." for School vs "Employee No." for Corporate) so you don\'t have to relabel fields yourself.',
      'Use the zoom and pan controls to properly frame a photo that isn\'t already cropped to a portrait shape.',
      'Preview both the front and back before downloading — the Front/Back toggle in the final step lets you check both sides.',
    ],
    mistakes: [
      "Picking an industry preset that doesn't match your use case just for its visual style — each preset also changes field labels (like the ID number field's name), so check the labels make sense for your situation, not just the colors.",
      'Uploading a photo that isn\'t reasonably portrait-oriented and not adjusting the zoom/pan, resulting in an oddly cropped headshot.',
      'Forgetting to fill in the back-of-card options (signature line, emergency contact) if your use case actually needs them — they\'re opt-in, not automatic.',
    ],
    quickFaqs: [
      { q: 'Can I use a custom label instead of the preset ones?', a: 'The industry presets set sensible defaults, but you can still type your own values into the actual data fields — only the field labels themselves follow the preset.' },
      { q: 'What file format do I get?', a: 'Front and back download as separate PNG images, ready to print and laminate.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Can I change the layout after choosing an industry?', a: 'Yes — industry and layout are independent choices, so you can mix any layout with any industry\'s field set.' },
    ],
    recommendation: { icon: '🖼️', prompt: 'Photo needs cleaning up first?', slug: 'document-enhancer', label: 'Try Document Enhancer' },
    relatedTools: [
      { slug: 'document-enhancer', icon: '🩹' },
      { slug: 'resize-image', icon: '📐' },
      { slug: 'business-document-studio', icon: '🗂️' },
      { slug: 'qr-code-generator', icon: '📱' },
    ],
  },
});

Object.assign(toolGuides, {
  // ---------------------------------------------------------------------
  // AI / Smart Converter
  // ---------------------------------------------------------------------
  'summarize-pdf': {
    title: 'Summarize PDF Guide',
    what: 'Cleans, chunks, and summarizes a text-based PDF with AI — pick from 7 summary types (Smart, Executive, Bullet, Study Notes, Key Insights, Action Items, Chapter), a length, and optional focus areas, then export or ask follow-up questions about the document.',
    whenToUse: 'Use this when you need to quickly understand a long report, textbook, contract, or article without reading every page — for revision, briefing someone else, deciding whether a document is worth reading in full, or looking something specific up in it afterward.',
    steps: [
      { title: 'Upload your PDF', body: 'Text and page boundaries are extracted directly in your browser first — only that extracted text is sent to the AI, never the file itself. Documents over 40 pages let you choose a specific page range before generating.' },
      { title: 'Pick a summary type and length', body: 'Smart Summary (overview + key points + numbers + dates + action items + takeaway), Executive Summary (a fixed 300–500 word narrative), Bullet Summary, Study Notes, Key Insights, Action Items, or Chapter Summary (one summary per detected chapter/section). Short, Medium, or Detailed length applies to every type except Executive and Chapter.' },
      { title: 'Optionally focus the summary', body: 'Check any of the focus areas (Financial figures, Risks, Recommendations, Important dates, Definitions, Timeline, People mentioned, Exam-style notes) to have the AI prioritize that content.' },
      { title: 'Generate, then export or ask questions', body: 'Copy the result, or download it as TXT, Markdown, PDF, or Word — then use "Ask this document" to ask follow-up questions grounded in the summary (and, when needed, the original text).' },
    ],
    tips: [
      'This works best on genuinely text-based PDFs — reports, articles, contracts, and textbooks typed or exported directly into a document.',
      'If your PDF is a scan or photo of a document (no selectable text), use Smart AI Converter or OCR PDF instead.',
      'Chapter Summary only appears when the document actually has detectable chapter or section headings — for documents without clear headings, Smart Summary or Study Notes usually work better.',
      'Longer documents are automatically cleaned (repeated headers/footers/page numbers removed) and split into sections before summarizing, so quality holds up on documents far longer than a single AI prompt could handle directly.',
    ],
    mistakes: [
      'Uploading a scanned PDF and expecting a summary — if there\'s under 50 characters of extractable text, you\'ll get an error pointing you to OCR PDF or Smart AI Converter instead.',
      'Picking Chapter Summary on a document with no real headings — it\'ll tell you no chapters were detected rather than guessing at fake ones.',
      'Expecting "Ask this document" to know things not in the source PDF — it only answers from the generated summary and, when necessary, the actual extracted text, never invented facts.',
    ],
    quickFaqs: [
      { q: 'Is my PDF file uploaded anywhere?', a: 'No — the PDF is read entirely in your browser. Only the extracted text is sent to the AI for summarizing.' },
      { q: 'What if my PDF is a scan or photo?', a: 'This tool needs real, selectable text. For scans or photos, use Smart AI Converter or OCR PDF instead.' },
      { q: 'Is there a file size limit?', a: 'Up to 100MB and up to 100 pages per summary — very large documents let you pick a specific page range to summarize.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'How does "Ask this document" work?', a: 'It answers your question from the summary already generated — a cheap, fast lookup for most questions. If the summary genuinely doesn\'t have enough detail, it automatically checks the original extracted text for a more grounded answer.' },
    ],
    recommendation: { icon: '📸', prompt: 'PDF is a scan with no selectable text?', slug: 'smart-converter', label: 'Try Smart AI Converter instead' },
    relatedTools: [
      { slug: 'smart-converter', icon: '📸' },
      { slug: 'ocr-pdf', icon: '🔎' },
      { slug: 'contract-summarizer', icon: '📜' },
      { slug: 'pdf-to-word', icon: '📄' },
    ],
  },

  'smart-converter': {
    title: 'Smart AI Converter Guide',
    what: 'Photographs or scans of documents — even messy handwriting or tables — read by AI and turned into editable text and structured tables, ready to download as Word or Excel.',
    whenToUse: 'Use this for anything a regular converter can\'t read: a photo of a printed page, a scanned form, a table photographed off a whiteboard or printout — situations where the source has no real, selectable text.',
    steps: [
      { title: 'Upload a photo or scanned PDF', body: 'Photos (JPG/PNG) go straight to the AI; PDFs are rendered page-by-page in your browser first (up to 15 pages).' },
      { title: 'Let AI read it', body: 'The AI extracts both running text and any tables it detects in the image.' },
      { title: 'Review and edit', body: 'The extracted text appears in an editable box, and any detected tables show a preview — fix anything the AI misread before downloading.' },
      { title: 'Download as Word or Excel', body: 'Choose Word for the text and tables together, or Excel for the tables split across separate sheets.' },
    ],
    tips: [
      'A clear, well-lit, straight-on photo reads far more accurately than an angled or blurry one.',
      'Always review the extracted text and tables before downloading — AI reading of handwriting or low-quality photos can make mistakes.',
      'If your PDF already has real, selectable text (not a scan), a direct converter like PDF to Word will be faster and more accurate than this AI-based route.',
    ],
    mistakes: [
      'Uploading a text-based PDF here when PDF to Word or Summarize PDF would give a more accurate, faster result — this tool is built for images and scans, not already-digital text.',
      'Skipping the review step and downloading straight away — AI extraction of tables from photos isn\'t always perfect and is worth a quick check.',
      'Photographing at an angle or in poor light, which measurably reduces how accurately the AI can read the page.',
    ],
    quickFaqs: [
      { q: 'How many pages can I convert at once?', a: 'PDFs are limited to the first 15 pages per upload; photos are one image at a time.' },
      { q: 'Can it read handwriting?', a: 'It can attempt handwriting, but accuracy varies — always review the result. For dedicated handwriting extraction with unclear-word flagging, try OCR PDF.' },
      { q: 'What happens to my file?', a: 'It\'s sent securely to the AI engine for reading, then discarded.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📄', prompt: 'PDF already has selectable text?', slug: 'pdf-to-word', label: 'Try PDF to Word instead — faster and more accurate' },
    relatedTools: [
      { slug: 'pdf-to-word', icon: '📄' },
      { slug: 'ocr-pdf', icon: '🔎' },
      { slug: 'receipt-scanner', icon: '🧾' },
      { slug: 'document-enhancer', icon: '✨' },
    ],
  },

  'receipt-scanner': {
    title: 'Receipt & Invoice Scanner Guide',
    what: 'Photograph any receipt, invoice, or bill and AI extracts the vendor, date, invoice number, payment method, totals, and every line item into a downloadable Excel file.',
    whenToUse: 'Use this for expense tracking, bookkeeping, or logging purchases — any time you need a paper receipt or invoice turned into structured spreadsheet data instead of retyping it by hand.',
    steps: [
      { title: 'Photograph the receipt or invoice', body: 'A clear, flat, well-lit photo works best — all text should be readable and the whole document should be in frame.' },
      { title: 'Upload the photo', body: 'A preview appears so you can confirm you\'ve got the right image before extracting.' },
      { title: 'Extract with AI', body: 'The AI reads vendor, date, invoice number, payment method, subtotal, tax, total, currency, notes, and line items.' },
      { title: 'Review and download', body: 'Check the extracted fields and line items, then download as an Excel file with a Summary sheet and a Line Items sheet.' },
    ],
    tips: [
      'Flatten crumpled receipts and avoid glare or shadows across the printed text before photographing.',
      'Make sure the totals and line items are fully visible in frame — cropped edges mean missing data.',
      'Review every extracted field before relying on the Excel file, especially the total and tax amounts.',
    ],
    mistakes: [
      'Photographing at an angle or with part of the receipt cut off, which leaves fields blank or misread.',
      'Not reviewing extracted totals before using them for bookkeeping — always double-check the numbers against the physical receipt.',
      'Uploading a photo of a receipt that\'s badly faded — thermal-paper receipts fade over time and become hard for AI to read accurately.',
    ],
    quickFaqs: [
      { q: 'What file do I get?', a: 'An Excel (.xlsx) file with a Summary sheet (vendor, date, totals, etc.) and a Line Items sheet listing every item.' },
      { q: 'Does it work on invoices too, not just receipts?', a: 'Yes — invoices, bills, and purchase orders are all supported.' },
      { q: 'What happens to my photo?', a: 'It\'s sent securely to the AI engine and immediately discarded afterward.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📊', prompt: 'Need to analyze several receipts together?', slug: 'data-analyst', label: 'Try AI Data Analyst on the exported data' },
    relatedTools: [
      { slug: 'smart-converter', icon: '📸' },
      { slug: 'data-analyst', icon: '📊' },
      { slug: 'contract-summarizer', icon: '📜' },
      { slug: 'pdf-to-excel', icon: '📊' },
    ],
  },

  'ocr-pdf': {
    title: 'OCR PDF Guide',
    what: 'Extracts text from scanned PDFs and images using AI — including typed text and handwriting — while clearly flagging anything it isn\'t confident about instead of guessing.',
    whenToUse: 'Use this when you have a scanned document, a photo of a page, or a handwritten note and need the actual text out of it — not just a picture of text, but text you can copy, search, and edit.',
    steps: [
      { title: 'Upload your PDF or image', body: 'Drop in a scanned PDF, JPG, or PNG.' },
      { title: 'Extract text', body: 'AI reads the document, including handwriting where present.' },
      { title: 'Review the result', body: 'Any word or phrase the AI wasn\'t confident about is marked as [UNREADABLE] rather than guessed at — check these spots against the original.' },
      { title: 'Copy or download', body: 'Copy the extracted text or download it as a .txt file.' },
    ],
    tips: [
      'For genuinely messy handwriting, expect some [UNREADABLE] markers — that\'s the tool being honest rather than inventing plausible-sounding text.',
      'A higher-resolution scan or photo gives the AI more to work with and reduces how much comes back unreadable.',
      'If the extracted text needs to become an editable Word document with formatting, run it through PDF to Word afterward.',
    ],
    mistakes: [
      'Assuming every word in the output is accurate — always check text marked [UNREADABLE], and spot-check important numbers or names even outside those markers.',
      'Uploading a very low-resolution or blurry photo and expecting clean results — image quality directly affects accuracy.',
      'Using this when you actually need a formatted, editable document rather than plain extracted text — PDF to Word is built for that.',
    ],
    quickFaqs: [
      { q: 'Does it really work on handwriting?', a: 'Yes — the AI attempts handwriting as well as typed text. Anything it\'s not confident about is marked [UNREADABLE] rather than guessed.' },
      { q: 'Why do I see [UNREADABLE] in my result?', a: 'That marks a word or phrase the AI genuinely couldn\'t read with confidence — it\'s a deliberate choice to never invent text that isn\'t there.' },
      { q: 'What happens to my file?', a: 'It\'s automatically deleted after processing and never shared with third parties.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📄', prompt: 'Need the text in an editable, formatted document?', slug: 'pdf-to-word', label: 'Try PDF to Word next' },
    relatedTools: [
      { slug: 'pdf-to-word', icon: '📄' },
      { slug: 'smart-converter', icon: '📸' },
      { slug: 'document-enhancer', icon: '✨' },
      { slug: 'summarize-pdf', icon: '📚' },
    ],
  },

  'cv-improver': {
    title: 'CV Improver Guide',
    what: 'Takes your existing CV and a target position, then rewrites it into a stronger, ATS-friendly, ready-to-send CV — like a professional career consultant, not a chatbot. The CV itself only ever contains finished content; every suggestion, score, and piece of advice lives separately in the Professional Review below it.',
    whenToUse: 'Use this when you already have a CV (even a rough one) and want it tightened, restructured, and tailored toward a specific role — as opposed to Resume Builder, which is for starting from scratch.',
    steps: [
      { title: 'Add your CV', body: 'Upload a PDF, DOCX, or TXT file (up to 15MB) or paste your CV text directly — there\'s no character limit when pasting.' },
      { title: 'Set your target position', body: 'Enter the exact role you\'re optimizing for, and optionally paste the job description for more precise tailoring. This tailors your summary, skills, and experience wording — your professional title stays based on your own career, not the target role.' },
      { title: 'Improve My CV', body: 'The AI restructures your content, tightens the wording, and checks it against the target role.' },
      { title: 'Review the Professional Review and Suggested Rewrites', body: 'The Professional Review panel shows your ATS score, recruiter readiness, strengths, and gaps. Suggested Rewrites shows any optional improvements as a complete Current Text → AI Proposed Rewrite → Reason for Suggestion comparison — click Apply Rewrite to use it, Edit Myself to adjust it first, or Dismiss to skip it. Nothing changes your CV until you click Apply Rewrite.' },
      { title: 'Pick a template and download', body: 'Choose a layout, then download a polished PDF, copy the text, generate a matching cover letter, or send it to Resume Builder to keep editing.' },
    ],
    tips: [
      'Paste the actual job description when you have it — it lets the AI tailor keywords and highlight the strongest matches for ATS systems.',
      'Read every Suggested Rewrite\'s Reason carefully before applying it — these are AI suggestions based on your existing content, not verified facts, so only confirm what\'s actually true.',
      'Use the Professional Review panel to see your ATS score, keyword matches, and gaps against the target role before finalizing.',
      'Once your CV is improved, it\'s automatically available to compatible tools like PDF to Word, Compress PDF, OCR PDF, and Merge PDF — no need to download and re-upload.',
    ],
    mistakes: [
      'Applying a Suggested Rewrite without checking it\'s accurate — the tool deliberately never edits your CV automatically for exactly this reason, so the responsibility to verify is yours.',
      'Skipping the target position field — without it, the AI has nothing specific to tailor the CV toward.',
      'Uploading a CV file over 15MB — paste the text manually instead if your file is too large.',
    ],
    quickFaqs: [
      { q: 'Will the AI add fake experience to my CV?', a: 'No — the CV only ever contains real content from what you provided. Any optional rewrite is shown in Suggested Rewrites as a complete Current Text → Proposed Rewrite comparison you must explicitly Apply before it changes your CV.' },
      { q: 'Where did the ATS score and suggestions go?', a: 'They\'re in the Professional Review panel below your CV — kept completely separate so your downloadable CV never contains scores, advice, or AI commentary, only finished, ready-to-send content.' },
      { q: 'What\'s the difference between this and Resume Builder?', a: 'CV Improver rewrites an existing CV. Resume Builder guides you through creating one from scratch, step by step, with no CV required to start.' },
      { q: 'What file types can I upload?', a: 'PDF, DOCX, or TXT, up to 15MB — or paste your CV text with no size limit.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🛠️', prompt: 'Starting from scratch with no existing CV?', slug: 'resume-builder', label: 'Try Resume Builder instead' },
    relatedTools: [
      { slug: 'resume-builder', icon: '🛠️' },
      { slug: 'cover-letter', icon: '✉️' },
      { slug: 'linkedin-optimizer', icon: '💼' },
      { slug: 'pdf-to-word', icon: '📄' },
    ],
  },

  'ask-solve-ai': {
    title: 'Ask & Solve AI Guide',
    what: 'A chat-style assistant with two focused modes — Math and General — that answers typed or photographed questions with adjustable depth.',
    whenToUse: 'Use this for working through a math problem step by step or getting a quick answer to a general question — especially when it\'s easier to snap a photo of the question than type it out.',
    steps: [
      { title: 'Pick a mode', body: 'Math for calculations and problem-solving, General for anything else.' },
      { title: 'Choose answer depth', body: 'Quick answer, Step-by-step, or Detailed — pick based on how much explanation you need.' },
      { title: 'Type or photograph your question', body: 'Type directly, or attach a photo of a handwritten or printed question for the AI to read.' },
      { title: 'Ask, then follow up', body: 'If an answer is cut off, use Continue, Retry, or Generate shorter answer — the conversation keeps going in the same thread.' },
    ],
    tips: [
      'Use Step-by-step for Math mode when you need to actually learn the method, not just the final number.',
      'For a messy handwritten problem, a clear, well-lit photo reads far more reliably than a blurry one.',
    ],
    mistakes: [
      'Choosing Detailed depth for a simple question, which produces a much longer answer than needed — Quick answer is usually enough for straightforward questions.',
      'Assuming a truncated answer is complete — always use Continue when the tool flags an answer as interrupted, rather than trusting a cut-off response.',
      'Photographing a question at an angle or in poor lighting, which reduces how accurately the AI can read it.',
    ],
    quickFaqs: [
      { q: 'Can it solve math from a photo?', a: 'Yes — attach a photo of a handwritten or printed math problem in Math mode and it will read and solve it.' },
      { q: 'What happens if my answer gets cut off?', a: 'You\'ll see Continue, Retry, and Generate shorter answer options — the tool never presents a cut-off answer as if it were complete.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Where did Translate go?', a: 'Translate is now its own dedicated tool, Document Translator, with document upload, side-by-side preview, and multi-format download — a bigger job than a chat mode could do well.' },
    ],
    recommendation: { icon: '🌐', prompt: 'Need to translate a document or text?', slug: 'document-translator', label: 'Try Document Translator instead' },
    relatedTools: [
      { slug: 'document-translator', icon: '🌐' },
      { slug: 'contract-summarizer', icon: '📜' },
      { slug: 'summarize-pdf', icon: '📚' },
      { slug: 'ocr-pdf', icon: '🔎' },
    ],
  },

  'document-translator': {
    title: 'Document Translator Guide',
    what: 'Upload a PDF, Word, PowerPoint or text file — or paste text directly — and get an accurate translation, shown side by side with your original so you can check it at a glance.',
    whenToUse: 'Use this whenever you need a document or block of text translated into another language: a contract from a foreign client, a report you need to understand, or a CV you want to send abroad.',
    steps: [
      { title: 'Add your document', body: 'Upload a PDF, Word, PowerPoint or text file, paste text directly, or continue with the document already active in your workspace.' },
      { title: 'Pick source and target language', body: 'Source language is detected automatically by default — or set it yourself and use the swap button to flip source and target. Choose from a full, searchable list covering dozens of languages, including Yoruba, Hausa, Igbo, Swahili, Amharic, and other African languages.' },
      { title: 'Choose Fast or Accurate', body: 'Fast for a quick, direct translation, or Accurate for slower, more precise wording and sentence flow.' },
      { title: 'Translate, then download', body: 'See the translation appear next to your original, then copy it or download it as .txt, .pdf, or the document\'s native format (.docx or .pptx).' },
    ],
    tips: [
      'If your PDF is a scanned image rather than a real digital file, run it through OCR PDF first — Document Translator (like any text tool) needs real, selectable text to work with, not a picture of text.',
      'For a Word document, formatting — headings, bold/italic/underline, lists, tables, hyperlinks, and images — carries over into the translated .docx automatically. There\'s nothing to turn on.',
      'Use Accurate mode for anything formal — a contract, a CV, an official letter — where getting the wording right matters more than getting it back instantly.',
      'The source language only needs to be set manually if auto-detection guesses wrong on a short or ambiguous piece of text — for most documents, leaving it on Detect automatically works well.',
    ],
    mistakes: [
      'Uploading a scanned or photographed document and expecting it to translate — there\'s no real text underneath a scan for this tool to read; OCR PDF first turns it into real, translatable text.',
      'Expecting a translated PDF to keep the exact original page design — PDF translation rebuilds a clean, readable document from the translated text, not a pixel-identical copy of the original layout. Word documents keep their real structure; PDF does not yet.',
      'Translating a very long document in one pass without skimming the result — spot-check the translation, especially names, numbers, and technical terms, before sending it on.',
    ],
    quickFaqs: [
      { q: 'What file types are supported?', a: 'PDF, Word (.doc/.docx), PowerPoint (.ppt/.pptx), and plain text (.txt) — or you can paste text directly with no file at all.' },
      { q: 'Does it keep the original formatting?', a: 'For Word documents, yes — headings, bold/italic/underline, numbered and bullet lists, tables, hyperlinks, and images all carry over into the translated .docx automatically, no extra step required. PowerPoint keeps the same number of slides with translated text in each one, though not the original slide design. PDF translation rebuilds a clean, readable document rather than reproducing the exact original page layout — full PDF layout preservation is a planned future improvement.' },
      { q: 'How does automatic language detection work?', a: 'By default, the source language is detected from the text itself — you never need to know or guess what language your document is in. You can still set it manually if you prefer.' },
      { q: 'What languages are supported?', a: 'A broad set of world languages, searchable by name, including French, Spanish, Portuguese, German, Arabic, Chinese, Japanese, Korean, Hindi, Russian, and many more — with strong support for African languages including Yoruba, Hausa, Igbo, Swahili, Amharic, Somali, Zulu, Xhosa, and Afrikaans.' },
      { q: "What's the difference between Fast and Accurate?", a: 'Fast returns a direct, natural translation as quickly as possible. Accurate takes a little longer to produce more precise wording and sentence flow — better for formal or sensitive documents.' },
      { q: 'What if my PDF is a scan?', a: 'Run it through OCR PDF first. A scanned page is an image, not real text — OCR recognizes the letters in the image and produces text that Document Translator (or any text tool) can actually work with.' },
      { q: 'Is there a limit on how much I can translate?', a: 'This free version currently supports documents up to 5 pages (or 10,000 characters for formats without a fixed page count), and 2 translations per day per browser. For a longer document, split it into smaller sections first — Extract PDF Pages or Split PDF both work well for this — and translate each one separately.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required, within the daily fair-use limit — no pricing tiers or credits.' },
    ],
    recommendation: { icon: '🔍', prompt: 'Is your document a scan or photo?', slug: 'ocr-pdf', label: 'Run OCR PDF first' },
    relatedTools: [
      { slug: 'ocr-pdf', icon: '🔍', reason: 'If your document is a scan or photo rather than real text' },
      { slug: 'ask-solve-ai', icon: '💡', reason: 'For quick math or general questions, not document translation' },
      { slug: 'contract-summarizer', icon: '📜', reason: 'Understand a contract\'s key points instead of translating the whole thing' },
      { slug: 'compress-pdf', icon: '🗜️', reason: 'Shrink the translated file before sending it on' },
    ],
  },

  'resume-builder': {
    title: 'Resume Builder Guide',
    what: 'A guided, step-by-step CV builder — answer simple questions about your background and AI helps you write strong, honest content for each section, even if you\'re starting with nothing written down.',
    whenToUse: 'Use this when you don\'t have an existing CV to improve — students, fresh graduates, first-time job seekers, or anyone who\'d rather answer questions than write a document from a blank page.',
    steps: [
      { title: 'Choose your career level and target role', body: 'Options range from Student and Fresh graduate to Experienced professional and Career changer, with role suggestions to help you start.' },
      { title: 'Fill in your details', body: 'Basic info, then experience entries (work, NYSC, internships, volunteering, projects) — AI can help turn what you describe into strong bullet points.' },
      { title: 'Add education, certifications, and skills', body: 'AI can suggest relevant skills for your target role if you\'re unsure what to list.' },
      { title: 'Generate your summary', body: 'AI writes a professional summary from everything you\'ve entered — regenerate, shorten, strengthen, or make it more formal as needed.' },
      { title: 'Pick a template and download', body: 'Choose a layout and download a polished PDF.' },
    ],
    tips: [
      'Be specific when describing what you did in each role — the more detail you give, the stronger the AI-generated bullet points will be.',
      'Use the Refine bar (Regenerate, Shorten, Strengthen, More Formal) on any AI-written section instead of manually rewriting it yourself.',
      'If you already improved a CV in CV Improver, use its "Send to CV Builder" button to bring that content in here instead of starting over.',
    ],
    mistakes: [
      'Leaving the "what you did" fields vague ("various tasks") — the AI can only write strong bullet points from specific details you actually provide.',
      'Picking "General CV / Not sure yet" for target role when you do have a specific job in mind — a specific role produces much more targeted content.',
      'Starting from scratch here when you already have an existing CV to improve — CV Improver is the faster path in that case.',
    ],
    quickFaqs: [
      { q: 'What\'s the difference between this and CV Improver?', a: 'Resume Builder guides you through building a CV step by step from nothing. CV Improver takes a CV you already have and rewrites/tailors it.' },
      { q: 'Can I bring in a CV I already improved?', a: 'Yes — CV Improver has a "Send to CV Builder" button that pre-fills this tool with that content.' },
      { q: 'Does the AI invent experience I didn\'t provide?', a: 'No — it writes stronger phrasing around what you actually tell it, it doesn\'t fabricate roles, dates, or achievements.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📄', prompt: 'Already have a CV written?', slug: 'cv-improver', label: 'Try CV Improver instead' },
    relatedTools: [
      { slug: 'cv-improver', icon: '📄' },
      { slug: 'cover-letter', icon: '✉️' },
      { slug: 'ask-solve-ai', icon: '💡' },
      { slug: 'pdf-to-word', icon: '📄' },
    ],
  },

  'cover-letter': {
    title: 'Cover Letter Writer Guide',
    what: 'Generates a tailored, professional cover letter from your background, the role you\'re applying for, and the job description, in a tone you choose.',
    whenToUse: 'Use this whenever a job application needs a cover letter — pair it with a CV from CV Improver or Resume Builder for a complete application package.',
    steps: [
      { title: 'Fill in the basics', body: 'Your name, the job title, the company name, and your chosen tone (Professional, Friendly, Enthusiastic, or Formal).' },
      { title: 'Describe your background', body: 'Write a short summary of your relevant experience and strengths — this is what the AI builds the letter around.' },
      { title: 'Paste the job description (optional)', body: 'Including it lets the AI tailor the letter more precisely to what the employer is asking for.' },
      { title: 'Generate, then copy or download', body: 'Review the letter, copy the text, or download it as a PDF.' },
    ],
    tips: [
      'The more specific and detailed your background description, the more personalized and convincing the letter will be — avoid one-line summaries.',
      'Paste the actual job description whenever you have it, so the letter echoes the language and priorities the employer used.',
      'Match the tone to the company culture — Formal for traditional industries, Enthusiastic or Friendly for startups or creative roles.',
    ],
    mistakes: [
      'Leaving the background field too vague ("I have experience in sales") — specific achievements and skills produce a far stronger letter.',
      'Skipping the job title or company name — both are required for the AI to write a properly tailored letter.',
      'Using the same generated letter for every application without adjusting company-specific details — always double check before sending.',
    ],
    quickFaqs: [
      { q: 'Can I edit the letter after it\'s generated?', a: 'The letter is shown as text — copy it and edit it in your own document if you want to make further tweaks before the PDF version.' },
      { q: 'What tones are available?', a: 'Professional, Friendly, Enthusiastic, and Formal.' },
      { q: 'Do I need a job description to use this?', a: 'No — it\'s optional, but including it helps the AI tailor the letter more precisely.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📄', prompt: 'Need a matching CV too?', slug: 'cv-improver', label: 'Try CV Improver' },
    relatedTools: [
      { slug: 'cv-improver', icon: '📄' },
      { slug: 'resume-builder', icon: '🛠️' },
      { slug: 'linkedin-optimizer', icon: '💼' },
      { slug: 'ask-solve-ai', icon: '💡' },
    ],
  },

  'linkedin-optimizer': {
    title: 'LinkedIn Optimizer Guide',
    what: 'Rewrites your LinkedIn profile\'s Headline, About, Experience and Skills sections into stronger, keyword-rich versions tailored to a target role — one section at a time or your whole profile at once.',
    whenToUse: 'Use this whenever you\'re job hunting and want recruiters searching LinkedIn to actually find you — or whenever your profile has fallen behind your real experience.',
    steps: [
      { title: 'Paste your current sections', body: 'Paste your existing Headline, About, Experience and/or Skills text — you only need to fill in the sections you want optimized.' },
      { title: 'Add your target role (optional)', body: 'A target job title, industry, and job description help the AI choose the right keywords — this carries over automatically if you came from CV Improver or Cover Letter Writer.' },
      { title: 'Optimize one section or all of them', body: 'Click "Optimize" on a single section, or "Optimize Entire Profile" to rewrite everything in one pass.' },
      { title: 'Compare, then copy or export', body: 'Review the Original vs. Improved comparison and the reasoning behind each change, then copy individual sections, copy the whole profile, or export it as a text file.' },
    ],
    tips: [
      'Paste your sections exactly as they appear on your profile — company names and dates are never changed, only reworded.',
      'Fill in a target role and job description for much more precise keyword optimization than leaving them blank.',
      'Optimize sections independently if you only need a quick headline refresh — you don\'t have to redo your whole profile.',
    ],
    mistakes: [
      'Pasting a vague, one-line "About" section — the more real detail you provide, the stronger the rewrite.',
      'Expecting the AI to add skills or achievements you didn\'t mention — it only ever rewords and reorganizes what you actually gave it.',
      'Forgetting to update LinkedIn after downloading — copy the improved text back into your actual profile to see the benefit.',
    ],
    quickFaqs: [
      { q: 'Will this invent experience I don\'t have?', a: 'No — it only rewords, restructures, and keyword-optimizes what you paste in. It never invents companies, dates, promotions, certifications, or achievements.' },
      { q: 'Do I have to optimize my whole profile at once?', a: 'No — optimize just one section (e.g. only your headline) or all four at once, whichever you need.' },
      { q: 'Can I upload my LinkedIn data export?', a: 'LinkedIn\'s raw .zip data export isn\'t supported — but you can upload a PDF or Word export of your profile (like LinkedIn\'s "Save to PDF") or simply paste the text.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '✉️', prompt: 'Applying for a role too?', slug: 'cover-letter', label: 'Try Cover Letter Writer' },
    relatedTools: [
      { slug: 'cv-improver', icon: '📄' },
      { slug: 'cover-letter', icon: '✉️' },
      { slug: 'resume-builder', icon: '🛠️' },
    ],
  },

  'contract-summarizer': {
    title: 'Contract Summarizer Guide',
    what: 'Reads a contract or agreement — PDF or a photo of a printed page — and pulls out the parties, key dates, obligations, payment terms, termination clause, and anything worth double-checking, in plain language.',
    whenToUse: 'Use this before signing or acting on any contract, lease, or agreement when you want a quick, plain-English understanding of what you\'re actually agreeing to.',
    steps: [
      { title: 'Upload the contract', body: 'Upload a PDF directly, or a clear photo of a printed page if you don\'t have a digital copy.' },
      { title: 'Summarize', body: 'For PDFs, text is extracted in your browser first; for photos, the AI reads the image directly.' },
      { title: 'Review the breakdown', body: 'Parties, effective date, term/duration, key obligations, payment terms, termination clause, and points worth reviewing, plus a plain-language summary.' },
      { title: 'Copy the summary', body: 'Copy the full breakdown to your clipboard to save or share.' },
    ],
    tips: [
      'Pay close attention to the "Points worth reviewing" section — that\'s where the AI flags clauses that are unusual, unclear, or worth getting a second opinion on.',
      'If your PDF is a scan with no selectable text, upload it as a photo instead so the AI can read it directly.',
      'This is a starting point for understanding a contract, not a substitute for legal advice on anything significant.',
    ],
    mistakes: [
      'Treating the summary as legally binding advice — it\'s a plain-language aid to help you understand what to look for, not a legal opinion.',
      'Uploading a scanned PDF with no extractable text and getting an error — upload it as a photo instead, which the AI reads directly.',
      'Skipping the "Points worth reviewing" section because the summary looks straightforward — that section exists specifically to catch what a quick read might miss.',
    ],
    quickFaqs: [
      { q: 'Is this legal advice?', a: 'No — it\'s a plain-language summary to help you understand a contract\'s key points. For anything significant, consult a qualified professional.' },
      { q: 'Can I upload a photo instead of a PDF?', a: 'Yes — a clear photo of a printed page works, and is actually required if your PDF is a scan with no selectable text.' },
      { q: 'What happens to my document?', a: 'It\'s processed securely to generate the summary and not retained afterward.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '💡', prompt: 'Have a specific question about a clause?', slug: 'ask-solve-ai', label: 'Try Ask & Solve AI' },
    relatedTools: [
      { slug: 'summarize-pdf', icon: '📚' },
      { slug: 'ask-solve-ai', icon: '💡' },
      { slug: 'ocr-pdf', icon: '🔎' },
      { slug: 'sign-documents', icon: '✍️' },
    ],
  },

  'presentation-generator': {
    title: 'AI Presentation Generator Guide',
    what: 'Upload up to five documents or photos and AI turns them into a structured, editable PowerPoint presentation, tailored to your audience, purpose, tone, and desired length.',
    whenToUse: 'Use this to turn a report, set of notes, or reference documents into a presentation-ready slide deck without manually designing slides from scratch.',
    steps: [
      { title: 'Upload your source material', body: 'PDF, Word, TXT, or photos — up to 5 files, 25MB each, 50MB total.' },
      { title: 'Set your presentation options', body: 'Title, audience, purpose, tone (Professional, Academic, Educational, Sales/Pitch, or Simple), length, and a visual theme.' },
      { title: 'Generate the outline', body: 'AI reads all your files and drafts a full slide-by-slide outline.' },
      { title: 'Review and refine', body: 'Regenerate individual slides you\'re not happy with, or re-tone the entire deck at once.' },
      { title: 'Download as PowerPoint', body: 'Get a real, fully editable .pptx file you can keep refining in PowerPoint or Google Slides.' },
    ],
    tips: [
      'Be specific about your audience and purpose — a deck for "executives deciding on budget" turns out very differently from one for "students learning a concept."',
      'Standard length (8-12 slides) suits most presentations — reach for Detailed only when you genuinely need to cover more ground.',
      'Upload your most important source document first if you\'re combining several — earlier files tend to carry more weight in the outline.',
    ],
    mistakes: [
      'Uploading a scanned document with no readable text and expecting it to contribute content — check each file shows "ok" status after extraction, not an error.',
      'Skipping the audience and purpose fields — leaving them blank produces a much more generic deck than filling them in.',
      'Exceeding the 25MB per-file or 50MB total limit — oversized files are skipped rather than silently ignored, so watch for the upload warning.',
    ],
    quickFaqs: [
      { q: 'What file types can I upload?', a: 'PDF, Word (.docx), TXT, and images — up to 5 files, 25MB each, 50MB combined.' },
      { q: 'Can I edit individual slides after generating?', a: 'Yes — regenerate any single slide, or re-tone the whole presentation, before downloading.' },
      { q: 'What format do I download?', a: 'A real, fully editable PowerPoint (.pptx) file.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📚', prompt: 'Just need a text summary, not slides?', slug: 'summarize-pdf', label: 'Try Summarize PDF instead' },
    relatedTools: [
      { slug: 'summarize-pdf', icon: '📚' },
      { slug: 'data-analyst', icon: '📊' },
      { slug: 'word-to-pdf', icon: '📄' },
      { slug: 'powerpoint-to-pdf', icon: '📊' },
    ],
  },

  'data-analyst': {
    title: 'AI Data Analyst Guide',
    what: 'Upload a spreadsheet, CSV, or even a photo of a table, and get automatic charts, dataset health checks, and an AI-written executive report built around numbers Convertam computes itself, not numbers the AI invents.',
    whenToUse: 'Use this whenever you have data — sales figures, survey results, operational logs — and need charts, statistics, and a written interpretation without building it manually in a spreadsheet.',
    steps: [
      { title: 'Upload your data', body: 'Excel, CSV, TSV, a PDF with a table, a photo of a spreadsheet or report, or paste a table directly.' },
      { title: 'Review Dataset Understanding', body: 'A fully deterministic health check — missing values, empty columns, outliers — computed directly from your data, with no AI involved at this stage.' },
      { title: 'Choose an objective', body: 'Let AI Decide, or pick a focus like Executive Management Report, Trend Analysis, Financial Performance, Risk Assessment, and more.' },
      { title: 'Generate the analysis', body: 'Charts, KPI cards, and statistics are computed instantly and have no limit; the AI-written narrative (executive summary, findings, recommendations) is limited to 2 reports per day for non-owner accounts.' },
      { title: 'Download your results', body: 'Export a PDF report, a Word report, or the underlying data as Excel.' },
    ],
    tips: [
      'The charts, KPI cards, and dataset health check are always available with no daily limit — only the AI-written narrative report is rate-limited.',
      'If you\'re not sure which objective fits, "Let AI Decide" picks the most useful analysis based on what your data actually supports.',
      'Check the Dataset Understanding step first — it flags missing values and data-quality issues that affect how much you should trust the resulting charts.',
    ],
    mistakes: [
      'Assuming you can generate unlimited AI narrative reports — non-owner accounts get 2 per day; the charts and statistics above them have no such limit and remain fully available even after that\'s used up.',
      'Ignoring the Dataset Understanding health check and trusting charts built from data with major gaps or quality issues.',
      'Expecting the Excel download to include native embedded charts — it exports your data only; charts themselves export as PNG images, not editable Excel charts.',
    ],
    quickFaqs: [
      { q: 'Is there a limit on how many reports I can generate?', a: 'AI-written narrative reports (executive summary, findings, recommendations) are limited to 2 per day for non-owner accounts. Charts, KPIs, and statistics have no limit and stay available even after that\'s used up.' },
      { q: 'Are the numbers in the report real or AI-generated?', a: 'All numbers are computed directly from your data by Convertam — the AI only writes narrative text around numbers it\'s given, never invents them.' },
      { q: 'What formats can I upload?', a: 'Excel, CSV, TSV, a PDF containing a table, a photo/screenshot of a spreadsheet or report, or pasted table text.' },
      { q: 'Is this tool free?', a: 'Yes — charts and statistics are always free; AI narrative reports are free with the 2-per-day limit for non-owner accounts.' },
    ],
    recommendation: { icon: '🎞️', prompt: 'Need to present these findings?', slug: 'presentation-generator', label: 'Try AI Presentation Generator' },
    relatedTools: [
      { slug: 'presentation-generator', icon: '🎞️' },
      { slug: 'receipt-scanner', icon: '🧾' },
      { slug: 'pdf-to-excel', icon: '📊' },
      { slug: 'summarize-pdf', icon: '📚' },
    ],
  },
});

Object.assign(toolGuides, {
  // ---------------------------------------------------------------------
  // Calculators
  // ---------------------------------------------------------------------
  'salary-calculator': {
    title: 'Salary Calculator Guide',
    what: 'Breaks down your gross salary into a real take-home pay figure, with a live deductions chart, country-preset templates, and instant conversion across every pay period.',
    whenToUse: 'Use this to understand what you\'ll actually take home from a salary offer, compare pay periods (hourly vs monthly vs annual), or work out the effect of adding overtime, bonuses, or new deductions.',
    steps: [
      { title: 'Enter your gross salary and pay period', body: 'Choose Hourly, Daily, Weekly, Bi-weekly, Monthly, or Annually, and pick your currency.' },
      { title: 'Load a template or build your own deductions', body: 'The 📋 Load Template button offers Nigeria (PAYE), United Kingdom, and United States starting presets — or build your own from a blank list.' },
      { title: 'Adjust each deduction', body: 'Enter either a percentage or a fixed amount per deduction — the other side calculates automatically — and mark each as before-tax or after-tax.' },
      { title: 'Add optional earnings if relevant', body: 'Bonus, Allowance, Commission, or Other Income, plus an overtime calculator (hourly rate, hours worked, standard hours, overtime multiplier).' },
      { title: 'Review your results', body: 'See your Take Home Pay, a deductions breakdown chart, and a full conversion table across every pay period.' },
    ],
    tips: [
      'Name your deductions with recognizable words like "Tax" or "Pension" — the tool automatically detects and highlights these in your results based on the name.',
      'Use the Salary Conversion table to instantly see what your take-home pay looks like at any other pay frequency without re-entering anything.',
      'The country templates are a useful starting point, not authoritative tax figures — always confirm current rates for your actual situation.',
    ],
    mistakes: [
      'Treating the country templates (Nigeria, UK, US) as exact, up-to-date tax law — they\'re illustrative starting rates you should adjust to your real deductions.',
      'Naming a deduction something generic like "Deduction 1" and then wondering why it doesn\'t show up as Tax or Pension in the breakdown — the auto-detection relies on the name you give it.',
      'Forgetting to mark a deduction as before-tax or after-tax — this affects the actual take-home calculation, not just the display.',
    ],
    quickFaqs: [
      { q: 'Does this calculate exact legal tax brackets?', a: 'No — deductions are flat percentages or fixed amounts you control. It\'s a planning tool, not a tax-compliant payroll calculator.' },
      { q: 'Is my salary data stored anywhere?', a: 'No — everything is calculated entirely in your browser. Nothing is sent to a server or stored.' },
      { q: 'Can I export my results?', a: 'Yes — download as PDF, print, copy as text, or share.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '💵', prompt: 'Want to plan your monthly budget too?', slug: 'expense-budget-calculator', label: 'Try Expense & Budget Calculator' },
    relatedTools: [
      { slug: 'expense-budget-calculator', icon: '💵' },
      { slug: 'loan-calculator', icon: '🏦' },
      { slug: 'savings-goal-calculator', icon: '🎯' },
      { slug: 'vat-calculator', icon: '🧾' },
    ],
  },

  'loan-calculator': {
    title: 'Loan Calculator Guide',
    what: 'Works out repayments, total interest, and a full amortization schedule for any loan — whether you\'re planning a new loan, tracking one already in progress, or comparing two offers.',
    whenToUse: 'Use this when taking out a loan, checking whether a loan is affordable against your income, comparing two loan offers side by side, or figuring out how extra payments would shorten an existing loan.',
    steps: [
      { title: 'Pick a Loan Term mode', body: 'Manual Term (amount + years/months), Calendar Dates (start and end date), or Running Loan (for a loan you already have — enter the current outstanding balance and dates instead of the original terms).' },
      { title: 'Enter the loan details', body: 'Amount, interest rate, and repayment frequency (Monthly, Bi-weekly, or Weekly).' },
      { title: 'Add optional details if relevant', body: 'Down payment, processing fee, insurance fee, or an extra payment per period to see early-repayment savings.' },
      { title: 'Check Compare Scenarios or Affordability', body: 'Compare against an alternative loan offer, or check your Debt-to-Income ratio against your income and expenses.' },
      { title: 'Review the amortization schedule', body: 'Search or jump to any specific payment in the full payment-by-payment breakdown.' },
    ],
    tips: [
      'Use Running Loan mode if you\'re tracking a loan you already took out — it recalculates the remaining schedule from your current balance, not the original terms.',
      'Add an Extra Payment amount to instantly see how many payments and how much interest you\'d save by paying more than the minimum.',
      'Use the amortization table\'s search and jump controls rather than scrolling through hundreds of rows to find a specific payment.',
    ],
    mistakes: [
      'Reading the "Effective Interest %" figure as an official APR — it\'s total interest plus fees divided by the amount financed, a useful comparison number but not a regulated APR calculation.',
      'Entering a down payment larger than the loan amount — the tool will flag this, but double-check your numbers if you see the warning.',
      'Using Manual Term mode for a loan you\'re already partway through — Running Loan mode gives a more accurate remaining schedule in that case.',
    ],
    quickFaqs: [
      { q: 'Is the Effective Interest % the same as APR?', a: 'No — it\'s a simplified figure (total interest and fees over the amount financed) for quick comparison, not a regulatory APR calculation.' },
      { q: 'Can I track a loan I already have?', a: 'Yes — use Running Loan mode and enter your current outstanding balance, next payment date, and maturity date.' },
      { q: 'Is my loan information stored anywhere?', a: 'No — everything is calculated entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🎯', prompt: 'Saving toward a goal instead of borrowing?', slug: 'savings-goal-calculator', label: 'Try Savings Goal Calculator' },
    relatedTools: [
      { slug: 'savings-goal-calculator', icon: '🎯' },
      { slug: 'salary-calculator', icon: '💰' },
      { slug: 'expense-budget-calculator', icon: '💵' },
      { slug: 'break-even-calculator', icon: '⚖️' },
    ],
  },

  'vat-calculator': {
    title: 'VAT Calculator Guide',
    what: 'Adds VAT to a price, removes it from a VAT-inclusive price, breaks down any amount either way, or shows the exact step-by-step working behind a reverse VAT calculation.',
    whenToUse: 'Use this whenever you need to work out VAT on a sale or purchase — pricing a product, checking a VAT-inclusive receipt, or preparing a multi-item invoice worksheet.',
    steps: [
      { title: 'Choose your mode', body: 'Add VAT, Remove VAT, VAT Breakdown (analyze any amount either way), or Reverse VAT (shows the full calculation working).' },
      { title: 'Pick or enter your VAT rate', body: 'Choose a preset (7.5%, 5%, 10%, 15%, 20%) or enter a custom rate — your last-used rate is remembered for next time.' },
      { title: 'Enter your amount', body: 'The result updates instantly with the original amount, VAT amount, and grand total.' },
      { title: 'Use the Multiple Items worksheet for several items', body: 'Add named line items and get a running total across all of them, useful for invoice-style calculations.' },
      { title: 'Add business details for your export (optional)', body: 'Business name, invoice reference, and notes appear only in the downloaded report, not on screen.' },
    ],
    tips: [
      'Use Reverse VAT mode when you want to see and understand the actual formula behind the calculation, not just the answer.',
      'Your last-used VAT rate is remembered in your browser, so you don\'t need to re-select it every visit.',
      'The VAT rate presets are common general rates — always confirm the applicable rate for your specific jurisdiction before relying on the result.',
    ],
    mistakes: [
      'Assuming the preset VAT rates are automatically correct for your country and situation — confirm your actual applicable rate.',
      'Filling in the Business Name/Invoice Reference/Notes fields and expecting them to show on screen — they only appear in the downloaded PDF report.',
      'Using Add VAT mode on a price that already includes VAT — check which mode matches your actual starting amount to avoid double-counting.',
    ],
    quickFaqs: [
      { q: 'What\'s the difference between Remove VAT and Reverse VAT?', a: 'Both extract the pre-VAT amount from a VAT-inclusive price — Reverse VAT additionally shows the step-by-step working of exactly how that figure was calculated.' },
      { q: 'Can I calculate VAT for a list of items at once?', a: 'Yes — use the Multiple Items worksheet to add named line items with a running total.' },
      { q: 'Is my data stored anywhere?', a: 'Your last-used VAT rate is remembered locally in your browser; nothing else is stored or sent to a server.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🏷️', prompt: 'Working with a discounted price instead?', slug: 'discount-calculator', label: 'Try Discount Calculator' },
    relatedTools: [
      { slug: 'discount-calculator', icon: '🏷️' },
      { slug: 'profit-margin', icon: '📈' },
      { slug: 'salary-calculator', icon: '💰' },
      { slug: 'invoice-generator', icon: '🧾' },
    ],
  },

  'profit-margin': {
    title: 'Profit & Loss Calculator Guide',
    what: 'Analyzes revenue, costs, and margins for your business, with a business health rating, break-even analysis, pricing guidance, period comparison, and a What-If Simulator for testing scenarios.',
    whenToUse: 'Use this to understand whether your business (or a specific product) is genuinely profitable, price a product correctly, compare performance period-over-period, or test how a change in costs or revenue would affect your bottom line.',
    steps: [
      { title: 'Choose Simple or Business mode', body: 'Simple just needs Revenue and Total Cost. Business breaks costs into Cost of Goods Sold plus 9 named operating expense categories (or your own custom ones), each as a fixed amount or % of revenue.' },
      { title: 'Review your Business Health status', body: 'A color-coded rating from Operating at a Loss up to Excellent, based on your net margin.' },
      { title: 'Open any optional section you need', body: 'Break-even Analysis (unit-level), Pricing Insight (target margin or target price), Compare to Previous Period, or the What-If Simulator.' },
      { title: 'Try the What-If Simulator', body: 'Adjust Revenue, Selling Price, Cost of Goods, or Expenses independently to see a Current vs Projected comparison — this never changes your actual entered figures.' },
      { title: 'Review the Expense Breakdown', body: 'Every cost line ranked highest to lowest, so you can see immediately what\'s driving your costs.' },
    ],
    tips: [
      'Use the dedicated Break-even Analysis section (Fixed Costs + price/cost per unit) for precise unit economics — it\'s more accurate than the automatic break-even estimate shown in Business mode\'s stat cards, which assumes costs scale proportionally with revenue.',
      'The What-If Simulator never alters your actual entered numbers — it\'s a safe space to test "what if I raised prices 10%?" without losing your real figures.',
      'Use Compare to Previous Period to see whether your margins are actually improving or just your revenue is.',
    ],
    mistakes: [
      'Confusing the automatic break-even figure shown in Business mode\'s stat cards with the dedicated Break-even Analysis section — the first is a rough estimate, the second is a precise unit-economics calculation. Use the dedicated section when you need an accurate number.',
      'Treating the Business Health status tiers as an industry-specific benchmark — the thresholds (5%/15%/25% margin) are a general guideline, not tailored to your specific industry.',
      'Naming two custom expense rows the same thing — the tool will warn you, but it\'s worth using distinct names to keep your Expense Breakdown clear.',
    ],
    quickFaqs: [
      { q: 'What\'s the difference between Simple and Business mode?', a: 'Simple just uses total Revenue and Total Cost. Business mode splits costs into Cost of Goods Sold plus detailed operating expense categories, unlocking a more precise breakdown and business health status.' },
      { q: 'Does the What-If Simulator change my actual numbers?', a: 'No — it\'s a separate projection. Your entered Revenue, Costs, and Expenses stay exactly as you typed them.' },
      { q: 'Is my financial data stored anywhere?', a: 'No — everything is calculated entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '⚖️', prompt: 'Need precise unit-level break-even numbers?', slug: 'break-even-calculator', label: 'Try Break-even Calculator' },
    relatedTools: [
      { slug: 'break-even-calculator', icon: '⚖️' },
      { slug: 'expense-budget-calculator', icon: '💵' },
      { slug: 'vat-calculator', icon: '🧾' },
      { slug: 'data-analyst', icon: '📊' },
    ],
  },

  'discount-calculator': {
    title: 'Discount Calculator Guide',
    what: 'Enter an original price and a discount percentage to instantly see how much you save and the final price.',
    whenToUse: 'Use this any time you need to quickly work out a sale price, compare deals, or check that a shop\'s advertised discount adds up correctly.',
    steps: [
      { title: 'Enter the original price', body: 'The full price before any discount is applied.' },
      { title: 'Enter the discount percentage', body: 'The result — savings and final price — updates instantly.' },
      { title: 'Copy or download your result', body: 'Copy the summary, download it as a PDF, print it, or share it.' },
    ],
    tips: [
      'Use this to quickly double-check whether a store\'s advertised "20% off" actually matches the sale price shown.',
      'Combine with VAT Calculator if you need to work out tax on the discounted price afterward.',
    ],
    mistakes: [
      'Entering the already-discounted price as the "Original Price" by mistake, which will calculate an incorrect further discount.',
      'Confusing a percentage discount with a flat amount off — this tool specifically works with percentages.',
    ],
    quickFaqs: [
      { q: 'Can I calculate a flat amount discount instead of a percentage?', a: 'This tool is built for percentage discounts. For a flat amount off, subtract it manually from the original price.' },
      { q: 'Is my data stored anywhere?', a: 'No — everything is calculated entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🧾', prompt: 'Need to add VAT to the final price?', slug: 'vat-calculator', label: 'Try VAT Calculator' },
    relatedTools: [
      { slug: 'vat-calculator', icon: '🧾' },
      { slug: 'profit-margin', icon: '📈' },
      { slug: 'salary-calculator', icon: '💰' },
      { slug: 'expense-budget-calculator', icon: '💵' },
    ],
  },

  'age-calculator': {
    title: 'Age Calculator Guide',
    what: 'Enter a date of birth and get an exact age broken down into years, months, and days.',
    whenToUse: 'Use this for form-filling, eligibility checks, birthday planning, or any time you need a precise age rather than a rough estimate.',
    steps: [
      { title: 'Enter the date of birth', body: 'Your exact age in years, months, and days appears instantly.' },
      { title: 'Copy or download the result', body: 'Copy the summary, download it as a PDF, print it, or share it.' },
    ],
    tips: [
      'This calculates age as of today\'s date automatically — no need to enter a "current date" separately.',
      'Useful for checking eligibility requirements that specify an exact age (e.g. "must be 18 years and 0 months").',
    ],
    mistakes: [
      'Entering the date in the wrong format if typing manually — using the date picker avoids this entirely.',
    ],
    quickFaqs: [
      { q: 'Does it account for leap years correctly?', a: 'Yes — the calculation is based on actual calendar dates, so leap years are handled correctly.' },
      { q: 'Is my date of birth stored anywhere?', a: 'No — everything is calculated entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🎯', prompt: 'Planning a savings goal for a milestone birthday?', slug: 'savings-goal-calculator', label: 'Try Savings Goal Calculator' },
    relatedTools: [
      { slug: 'savings-goal-calculator', icon: '🎯' },
      { slug: 'salary-calculator', icon: '💰' },
      { slug: 'loan-calculator', icon: '🏦' },
      { slug: 'discount-calculator', icon: '🏷️' },
    ],
  },

  'expense-budget-calculator': {
    title: 'Expense & Budget Calculator Guide',
    what: 'Tracks every income source and expense category to show your true remaining balance live, with automatic Essential/Lifestyle/Savings classification and an optional 50/30/20 guideline comparison.',
    whenToUse: 'Use this to build a real budget — see exactly where your money goes each month, whether you\'re over or under budget, and how your spending compares to a standard budgeting guideline.',
    steps: [
      { title: 'Add your income sources', body: 'Salary, business income, freelance income, bonuses, or anything else — name and amount each one.' },
      { title: 'Choose your income period', body: 'Daily, Weekly, Monthly, or Yearly — all figures convert automatically.' },
      { title: 'Fill in your expense categories', body: '13 common categories are pre-loaded (Housing, Food, Transport, and more) — enter each as a fixed amount or % of income, add your own categories, and remove any you don\'t need.' },
      { title: 'Review your Budget Status', body: 'A color-coded status from Over Budget to Healthy Surplus, based on your remaining balance.' },
      { title: 'Check the 50/30/20 comparison (optional)', body: 'See how your Needs/Wants/Savings split compares to the standard budgeting guideline.' },
    ],
    tips: [
      'Name your Savings/Investment category with a word like "saving" or "invest" so the tool correctly counts it in your Savings Rate and the Income Allocation breakdown.',
      'Use the Period Conversion table to see your budget at a Weekly, Monthly, or Yearly view without re-entering anything.',
      'The 50/30/20 comparison is a general guideline, not a rule you must follow — use it as a reference point, not a requirement.',
    ],
    mistakes: [
      'Naming an expense category something generic and expecting it to be correctly classified as Essential, Lifestyle, or Savings — classification is based on keywords in the name you choose.',
      'Forgetting that Disposable Income and Remaining Balance are different figures — Remaining Balance also nets out anything named as savings, while Disposable Income doesn\'t.',
      'Not using the ↺ Reset All button when starting a fresh budget — leftover categories from a previous scenario can skew your new numbers.',
    ],
    quickFaqs: [
      { q: 'What\'s the difference between Remaining Balance and Disposable Income?', a: 'Remaining Balance is income minus all expenses including savings. Disposable Income is income minus non-savings spending only — the two differ whenever you have a savings/investment category.' },
      { q: 'Is there a What-If Simulator on this tool?', a: 'No — unlike some of the other calculators, this tool doesn\'t include a What-If Simulator.' },
      { q: 'Is my financial data stored anywhere?', a: 'No — everything is calculated entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🎯', prompt: 'Ready to plan toward a specific savings target?', slug: 'savings-goal-calculator', label: 'Try Savings Goal Calculator' },
    relatedTools: [
      { slug: 'savings-goal-calculator', icon: '🎯' },
      { slug: 'salary-calculator', icon: '💰' },
      { slug: 'loan-calculator', icon: '🏦' },
      { slug: 'profit-margin', icon: '📈' },
    ],
  },

  'break-even-calculator': {
    title: 'Break-even Calculator Guide',
    what: 'Works out exactly how many units you need to sell to cover your costs, your margin of safety, and how changes in price or costs shift your break-even point.',
    whenToUse: 'Use this when pricing a product, planning production volumes, or checking how much room you have before a drop in sales pushes you into a loss.',
    steps: [
      { title: 'Enter your selling price and expected units sold', body: 'Expected units is optional but unlocks extra results like expected profit and margin of safety.' },
      { title: 'List your Fixed Costs', body: 'Rent, salaries, utilities, insurance, and more — added up live as you go.' },
      { title: 'List your Variable Costs per unit', body: 'Raw materials, packaging, delivery, commission, and more — summed per unit.' },
      { title: 'Review your break-even point', body: 'See the Cost vs Revenue chart and exactly how many units you need to sell to cover your costs.' },
      { title: 'Try the What-If Simulator', body: 'Test changes in selling price, variable costs, fixed costs, or projected units sold without touching your real figures.' },
    ],
    tips: [
      'If Expected Units Sold is entered, check your Margin of Safety — it tells you how far sales could drop before you fall below break-even.',
      'Watch for the warning banner if your variable cost per unit exceeds your selling price — break-even isn\'t reachable in that case, no matter how many units you sell.',
      'The chart always stretches to show both your break-even point and your expected-sales point, so you can see how the two relate at a glance.',
    ],
    mistakes: [
      'Leaving out a real cost from either Fixed or Variable Costs — an incomplete cost list will understate your true break-even point.',
      'Confusing a fixed cost (rent, salaries — doesn\'t change with volume) with a variable cost (materials, packaging — scales per unit) when entering a line item.',
      'Ignoring the "not reachable" warning when variable cost per unit exceeds selling price — no volume of sales will reach break-even until pricing or costs change.',
    ],
    quickFaqs: [
      { q: 'What is "margin of safety"?', a: 'How far your expected sales can drop, in units or percentage, before you fall below your break-even point.' },
      { q: 'Can I test different pricing scenarios?', a: 'Yes — the What-If Simulator lets you adjust selling price, variable costs, fixed costs, and projected units sold without changing your actual entered figures.' },
      { q: 'Is my data stored anywhere?', a: 'No — everything is calculated entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📈', prompt: 'Need a full profit & loss picture too?', slug: 'profit-margin', label: 'Try Profit & Loss Calculator' },
    relatedTools: [
      { slug: 'profit-margin', icon: '📈' },
      { slug: 'expense-budget-calculator', icon: '💵' },
      { slug: 'vat-calculator', icon: '🧾' },
      { slug: 'loan-calculator', icon: '🏦' },
    ],
  },

  'savings-goal-calculator': {
    title: 'Savings Goal Calculator Guide',
    what: 'Works out either how much you need to save regularly to hit a target, or how long it will take to reach your goal at your current savings pace, with interest included.',
    whenToUse: 'Use this to plan toward any savings target — an emergency fund, a big purchase, a deposit — whether you know your deadline and need the required contribution, or know your contribution and want to know your goal date.',
    steps: [
      { title: 'Choose your mode', body: 'Required Contribution (solve for how much to save) or Goal Date (solve for when you\'ll reach your goal).' },
      { title: 'Enter your goal and current savings', body: 'Your target amount and what you\'ve already saved toward it.' },
      { title: 'Set your timeframe or contribution', body: 'In Required Contribution mode, pick a target date or a duration. In Goal Date mode, enter your regular contribution amount and frequency.' },
      { title: 'Add an interest rate if relevant', body: 'Interest compounds monthly regardless of your contribution frequency — an entered annual rate is applied as one-twelfth each month.' },
      { title: 'Try the What-If Simulator', body: 'Test a different contribution amount, extended or shortened timeframe, interest rate change, or a one-time lump sum.' },
    ],
    tips: [
      'Use the "Required Saving — By Frequency" card to see your target contribution as a Daily, Weekly, and Monthly figure side by side, and pick whichever fits how you actually save.',
      'A one-time lump sum can be added at a specific date — just make sure that date falls within your plan\'s timeframe, or it won\'t affect the result.',
      'Remember that any interest rate you enter compounds monthly, not at your contribution frequency — this is a deliberate convention the tool uses consistently.',
    ],
    mistakes: [
      'Assuming interest compounds at your contribution frequency (e.g. daily or weekly) — it always compounds monthly, regardless of how often you contribute.',
      'Adding a lump sum dated outside your plan\'s overall timeframe and expecting it to count — check the warning banner if this happens.',
      'Expecting Goal Date mode to project indefinitely — it caps its search at 100 years and reports "not reachable" beyond that rather than an unbounded number.',
    ],
    quickFaqs: [
      { q: 'How does interest compounding work here?', a: 'Interest always compounds monthly — an entered annual rate is applied as one-twelfth of that rate each month, regardless of how often you contribute.' },
      { q: 'What if my goal isn\'t reachable?', a: 'In Goal Date mode, if the goal wouldn\'t be reached within 100 years, the tool reports it as not reachable rather than showing an unbounded projection.' },
      { q: 'Is my financial data stored anywhere?', a: 'No — everything is calculated entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🏦', prompt: 'Borrowing instead of saving toward this goal?', slug: 'loan-calculator', label: 'Try Loan Calculator' },
    relatedTools: [
      { slug: 'loan-calculator', icon: '🏦' },
      { slug: 'salary-calculator', icon: '💰' },
      { slug: 'expense-budget-calculator', icon: '💵' },
      { slug: 'age-calculator', icon: '🎂' },
    ],
  },
});

Object.assign(toolGuides, {
  // ---------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------
  'qr-code-generator': {
    title: 'QR Code Studio Guide',
    what: 'Creates fully customizable QR codes — website links, text, phone numbers, Wi-Fi credentials, contact cards, and more — with gradients, custom shapes, a logo, and instant scan validation before you download.',
    whenToUse: 'Use this for anything you\'d put a QR code on — a menu, business card, poster, product packaging, or a Wi-Fi sign — whenever you want it to look polished rather than a plain black-and-white grid.',
    steps: [
      { title: 'Choose what the QR code should do', body: 'Website, Text, Phone, WhatsApp, Wi-Fi, or vCard (contact card) — or start from a ready-made preset like Business, Restaurant, Portfolio, Event, or Social.' },
      { title: 'Enter your content', body: 'Fill in the specific fields for your chosen type — a URL, Wi-Fi network name and password, contact details, and so on.' },
      { title: 'Style your QR code', body: 'Pick a module shape (Square, Rounded, Dots, Classy), a corner/eye shape, colors or a gradient, and optionally a background style or your own logo in the center.' },
      { title: 'Add a caption (optional)', body: 'None, a "Scan Me" pill, or your own custom caption text below the code.' },
      { title: 'Check the scan validation', body: 'Convertam checks readability, contrast, and logo placement and rates the result Excellent, Good, or a lower confidence level before you download.' },
      { title: 'Download', body: 'PNG, SVG, or PDF, depending on where you\'ll use it.' },
    ],
    tips: [
      'Always check the scan validation rating before finalizing — a heavily stylized code with a large logo can become unreliable to scan even though it looks fine visually.',
      'Adding a logo automatically increases the QR code\'s error correction level, which helps keep it scannable despite the extra graphic in the center.',
      'Use SVG if you need to print the code at a large size (posters, banners) — it stays sharp at any size, unlike PNG.',
    ],
    mistakes: [
      'Choosing a heavy gradient or busy background style and skipping the scan validation check — always confirm it still rates Good or Excellent before printing or publishing it.',
      'Using a logo that\'s too large relative to the code, which can push the scan rating down even with a high error-correction level.',
      'Entering Wi-Fi details incorrectly (wrong encryption type or password) — double-check by scanning the code yourself with a phone before sharing it publicly.',
    ],
    quickFaqs: [
      { q: 'Will my QR code always be scannable?', a: 'The built-in scan validation checks readability, contrast, and logo placement and rates it before download — always check this rating, especially with heavy styling or a logo.' },
      { q: 'What file formats can I download?', a: 'PNG, SVG (best for large print sizes), or PDF.' },
      { q: 'Can I add my own logo?', a: 'Yes — uploading a logo automatically increases the error correction level to help keep the code scannable.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🔐', prompt: 'Need a secure password too?', slug: 'password-generator', label: 'Try Password Studio' },
    relatedTools: [
      { slug: 'password-generator', icon: '🔐' },
      { slug: 'watermark-image', icon: '💧' },
      { slug: 'meme-generator', icon: '😂' },
      { slug: 'id-card-generator', icon: '🪪' },
    ],
  },

  'password-generator': {
    title: 'Password Studio Guide',
    what: 'Generates secure passwords in three modes — Random, Smart Word Builder, and Passphrase — with a live strength analysis showing entropy and estimated crack time.',
    whenToUse: 'Use this any time you need a new password: a plain random one for a password manager, a memorable one built from words you choose, or a passphrase-style password that\'s both strong and easier to type or remember.',
    steps: [
      { title: 'Choose a mode', body: 'Random Password (fully random characters), Smart Word Builder (build from your own words), or Passphrase (a string of random dictionary words).' },
      { title: 'Set your options', body: 'Random: length, character types, and options to exclude similar or ambiguous characters. Smart Word Builder: your own words plus target length. Passphrase: word count, separator, and capitalization.' },
      { title: 'Generate one or several at once', body: 'Use the count selector to generate multiple passwords in a single batch.' },
      { title: 'Check the strength analysis', body: 'Every result shows its entropy in bits, a strength label (Weak to Very Strong), and an estimated crack time.' },
      { title: 'Copy your password', body: 'Copy the one you want to use.' },
    ],
    tips: [
      'For a password you\'ll need to type manually or remember, try Smart Word Builder or Passphrase mode instead of Random — they\'re built to stay strong while being easier to recall.',
      'Turn on "Exclude similar characters" for passwords you\'ll need to type by hand, so you\'re not second-guessing an "l" vs "1" or "O" vs "0".',
      'Aim for a Strong or Very Strong rating in the analysis — Fair or Weak passwords are shown honestly so you know to adjust your settings.',
    ],
    mistakes: [
      'Assuming a longer passphrase is automatically weaker than a shorter random password — check the actual entropy figure rather than judging by character count alone.',
      'Reusing the same generated password across multiple accounts — generate a fresh one for each account regardless of mode.',
      'Choosing Smart Word Builder with easily-guessable personal words (like your own name or birth year) — the strength of this mode depends on the words you actually choose.',
    ],
    quickFaqs: [
      { q: 'What\'s the difference between the three modes?', a: 'Random Password uses fully random characters. Smart Word Builder combines words you provide into a password at your target length. Passphrase strings together random dictionary words with a separator, which is often easier to remember or type.' },
      { q: 'How is password strength measured?', a: 'By entropy in bits, which drives both the strength label and the estimated crack time shown with every result.' },
      { q: 'Is my generated password stored anywhere?', a: 'No — everything is generated entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '📱', prompt: 'Need to share a Wi-Fi password easily?', slug: 'qr-code-generator', label: 'Try QR Code Studio' },
    relatedTools: [
      { slug: 'qr-code-generator', icon: '📱' },
      { slug: 'protect-pdf', icon: '🔒' },
      { slug: 'text-case-converter', icon: '🔤' },
      { slug: 'sign-documents', icon: '✍️' },
    ],
  },

  'text-case-converter': {
    title: 'Text Case Converter Guide',
    what: 'Instantly converts your text into seven different letter cases at once — UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case, and kebab-case.',
    whenToUse: 'Use this when you need the same text reformatted into a specific case — a heading in Title Case, a variable name in camelCase, a URL slug or database key in snake_case or kebab-case.',
    steps: [
      { title: 'Paste your text', body: 'Type or paste the text you want reformatted.' },
      { title: 'See every case at once', body: 'All seven conversions — UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case, and kebab-case — appear together, no need to pick one first.' },
      { title: 'Copy what you need', body: 'Copy any individual case conversion result with one click.' },
    ],
    tips: [
      'Use Title Case for headings — it correctly keeps small words like "a," "the," and "of" lowercase unless they start the text.',
      'camelCase and snake_case are useful for turning a phrase directly into a variable name or a database-friendly key without manual retyping.',
      'kebab-case is the conventional format for URL slugs — paste a page title in to get a clean, URL-safe version instantly.',
    ],
    mistakes: [
      'Using Sentence case on text that\'s already partly capitalized (like acronyms) and expecting those to be preserved — it lowercases everything first, then capitalizes sentence starts.',
      'Forgetting that snake_case and kebab-case strip out punctuation and special characters, not just spaces — check the result before using it as an identifier.',
    ],
    quickFaqs: [
      { q: 'Is my text stored anywhere?', a: 'No — everything is processed entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
      { q: 'Can I convert the same text into multiple cases without redoing it each time?', a: 'Yes — all seven case conversions appear at once from a single paste, so you can copy whichever one you need without switching modes.' },
    ],
    recommendation: { icon: '🔐', prompt: 'Need a secure password too?', slug: 'password-generator', label: 'Try Password Studio' },
    relatedTools: [
      { slug: 'password-generator', icon: '🔐' },
      { slug: 'qr-code-generator', icon: '📱' },
      { slug: 'summarize-pdf', icon: '📚' },
      { slug: 'cv-improver', icon: '📄' },
    ],
  },

  'morse-code-translator': {
    title: 'Morse Code Translator Guide',
    what: 'Translates text to Morse code and back, live as you type, with real audio playback you can speed up or slow down and download as a WAV file — plus Learn, Practice, and Challenge modes for actually learning Morse rather than just converting a single message.',
    whenToUse: 'Use Translate mode for a quick message — a Scouts badge, a puzzle, a ham radio exercise. Switch to Learn, Practice, or Challenge mode if you actually want to learn Morse code rather than convert one line of text.',
    steps: [
      { title: 'Type in either box', body: 'In Translate mode, type in the Text box or the Morse box — the other one updates instantly as you type, in either direction, no button needed.' },
      { title: 'Play it back', body: 'Press Play to hear real Morse audio at your chosen speed (5 to 30 WPM), or download it as a WAV file if you need the audio itself.' },
      { title: 'Learn a letter', body: 'Switch to Learn mode and tap any letter or number to hear it played while its dots and dashes light up on screen.' },
      { title: 'Practice a direction', body: 'Switch to Practice mode and pick a direction: hear it and type the letter, see the code and type the letter, or see the letter and type the code.' },
      { title: 'Test yourself', body: 'Switch to Challenge mode for a timed, 10-question quiz with a final score and time.' },
    ],
    tips: [
      'Training for an actual radio exam? Use the "Hear It" direction in Practice or Challenge — recognizing the sound is the real skill, not just reading dots and dashes.',
      'Use Share in Translate mode to copy a link with your message already filled in, so someone else opens the page with your translation ready to go.',
      'Start Learn mode at a slower speed while memorizing the alphabet, then move to Practice once individual letters feel familiar.',
    ],
    mistakes: [
      'Jumping straight into Challenge mode before spending time in Learn mode — recognizing letters by sound takes repetition, and Challenge tests that skill rather than building it.',
      'Expecting Practice and Challenge to quiz punctuation — those modes focus on letters and digits, since that\'s the core skill real Morse practice centers on. Translate mode itself does support common punctuation.',
      'Not checking the pool setting (Letters, Numbers, or Both) before starting a Challenge round — it\'s easy to start on the wrong pool by accident.',
    ],
    quickFaqs: [
      { q: 'Can I hear the Morse code, not just read it?', a: 'Yes — press Play in Translate mode to hear your translation as real Morse audio, or tap any letter in Learn mode to hear it individually.' },
      { q: 'Can I download the audio?', a: 'Yes — Download WAV in Translate mode saves your current translation as an audio file.' },
      { q: 'Does this handle punctuation, not just letters?', a: "Translation supports common punctuation, but Learn, Practice, and Challenge focus on letters and digits, since that's the core Morse skill." },
      { q: 'Is my text stored anywhere?', a: 'No — everything translates and plays entirely in your browser.' },
      { q: 'Is this tool free?', a: 'Yes, completely free with no login required.' },
    ],
    recommendation: { icon: '🔐', prompt: 'Need a secure password too?', slug: 'password-generator', label: 'Try Password Studio' },
    relatedTools: [
      { slug: 'password-generator', icon: '🔐' },
      { slug: 'qr-code-generator', icon: '📱' },
      { slug: 'text-case-converter', icon: '🔤' },
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
