// The always-visible "educational resource" section shown below every tool
// — distinct from the interactive Quick Guide (lib/toolGuides.js), which is
// a collapsible panel most visitors never open. This content is deliberately
// written at a different altitude: the Quick Guide is a procedural manual
// ("how do I use this interface"); this is subject-matter education ("what
// is this task, why does it work the way it does, what should I actually
// know before doing it"). A tool can — and often should — touch the same
// underlying caveat (e.g. "scanned PDFs need OCR") in both places, but the
// framing, depth, and supporting detail here should never just reword what
// the guide already says.
//
// Shape per entry:
//   about          — { intro, paragraphs: [string] } — what the tool does and who it's for
//   whyUseThis     — [string] practical benefits, real use cases
//   bestPractices  — [string], 5–8 items
//   commonMistakes — [string], realistic mistakes distinct from the guide's `mistakes`
//   whatNext       — [{ label, slug?, body }] — a workflow chain; omit slug for a
//                    non-navigable step (e.g. "edit the file in Word")
//   expandedFaqs   — optional override for the tool's fullFaqs in toolGuides.js,
//                    written deeper/longer than the panel's quickFaqs

export const toolEducation = {
  'pdf-to-word': {
    about: {
      paragraphs: [
        "A PDF is a fixed, print-ready snapshot of a page — the text, images, and layout are locked in place so the document looks identical no matter what device or printer opens it. That's exactly what makes PDFs reliable for sharing, and exactly why they're frustrating to edit: there's no \"paragraph\" or \"heading\" underneath, just positioned shapes and characters. Converting to Word (.docx) reconstructs that snapshot back into a real, flowing document — one with actual paragraphs, headings, and editable text — so you can change a sentence without retyping the whole page.",
        "That reconstruction depends entirely on what's inside the PDF to begin with. A PDF exported from Word, Google Docs, or similar software carries a genuine text layer — actual character and font data — so Convertam can map it back to Word with high fidelity. A scanned or photographed page, by contrast, is really just a picture of text; there's no character data to extract at all, only pixels. If that's what you're converting, OCR (optical character recognition) has to recognize the letters in the image first — a fundamentally different, less exact process than converting real text. Convertam's PDF to Word is built for the first case; for scans, running the file through OCR PDF first will get noticeably better results.",
        "In practice, this tool is reached for by people who need to keep working on content that only exists as a PDF: someone updating a resume they no longer have the original file for, a paralegal revising a clause in an old contract, a student pulling text from a report into a new one, or a small business owner correcting a typo in a document a client sent back as PDF instead of Word.",
      ],
    },
    whyUseThis: [
      'Edit a contract, letter, or agreement you only have as a PDF, without retyping it from scratch.',
      'Update an old resume, CV, or cover letter that exists only as a flattened PDF export.',
      'Pull text or tables out of a report so you can reuse them in a new document.',
      'Fix a typo or outdated detail in a document someone else sent you as a PDF.',
      'Hand a client or colleague something they can actually mark up with track changes, instead of comments on a PDF.',
    ],
    bestPractices: [
      "Start from a digitally-created PDF where possible — one exported from Word, Google Docs, or design software converts far more accurately than a scan.",
      "If your file is a scan or a photo of a page, run it through OCR PDF first so there's real text to convert, not just an image.",
      'Keep an eye on tables after conversion — simple tables map cleanly, but merged cells or unusual layouts sometimes need a quick manual fix in Word.',
      "Convert the whole document even if you only need one section — it's easy to delete the parts you don't need afterward in Word, and Extract PDF Pages first is only worth it for very long files.",
      'Skim the first page of the result before you rely on it — headings and fonts usually carry over correctly, but it takes seconds to confirm.',
      "If the PDF is password-protected, you'll need the password (or to remove it) before conversion can read the file at all.",
      'For a highly designed, multi-column layout (a flyer or brochure rather than a plain document), expect more manual cleanup — that kind of layout is a hard case for any PDF-to-Word conversion, not specific to this tool.',
      "Make your edits in the new Word file, not the original PDF — once you've converted, the PDF and the Word document are two separate files that no longer stay in sync.",
    ],
    commonMistakes: [
      "Converting a scanned or photographed page and expecting clean, structured text — without OCR first, there's no real text for the converter to find, only an image of one.",
      'Expecting a handwritten signature or note to become editable text — signatures and handwriting stay as images even after conversion; they were never text to begin with.',
      "Editing the original PDF after already converting it — changes made to the source PDF won't appear in the Word document you already downloaded.",
      'Sending the converted document out without a quick read-through — most conversions need zero fixes, but the rare one that needs a small tweak is easy to miss if you skip this step.',
      'Trying to convert a password-protected PDF without the password on hand — the tool needs to open the file to read it, the same as any PDF viewer would.',
      "Re-converting the entire file for a one-line correction — for a small fix, it's often faster to just edit that line directly in the Word document you already have.",
    ],
    whatNext: [
      { label: 'PDF to Word', slug: 'pdf-to-word', body: 'Convert your document.' },
      { label: 'Edit in Word', body: 'Make your changes in Microsoft Word, Google Docs, or a compatible editor.' },
      { label: 'Word to PDF', slug: 'word-to-pdf', body: 'Turn your edited document back into a shareable PDF.' },
      { label: 'Compress PDF', slug: 'compress-pdf', body: 'Shrink the file size before sending it on.' },
      { label: 'Protect PDF', slug: 'protect-pdf', body: 'Add a password if the document is sensitive.' },
    ],
    expandedFaqs: [
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
  },
};
