// Structured data for the Universal Tool Guide framework — the floating
// "Quick Guide" (split-screen panel on desktop, bottom sheet on mobile),
// plus the Full FAQ / Related Tools sections rendered below the tool. Only
// tools with an entry here get the new guide UI (see
// components/ToolPageClient.js); every other tool keeps its existing
// steps/tips/related rendering untouched.
//
// Shape each tool entry should eventually provide:
//   title        — panel header, e.g. "PDF to Word Guide"
//   what         — opening paragraph: what the tool does
//   steps        — "Step-by-step guide", [{ title, body }]
//   pdfTypes     — "What kind of files convert best", [{ label, body }]
//   quickFaqs    — "Common Questions" shown in the guide panel
//   fullFaqs     — the full Q&A list shown below the tool (can be longer)
//   whenToUse    — closing paragraph: when this tool is the right choice
//   recommendation — { icon, prompt, slug, label } single related-tool nudge
//   relatedTools — [{ slug, icon }] shown in the Related Tools card below

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
    pdfTypes: [
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
};

toolGuides['pdf-to-word'].fullFaqs = toolGuides['pdf-to-word'].quickFaqs;
