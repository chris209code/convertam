// Structured data for the Universal Tool Guide framework — the floating
// "Quick Guide" slide-out, plus the Full FAQ / Related Tools sections
// rendered below the tool. Only tools with an entry here get the new
// guide UI (see components/ToolPageClient.js); every other tool keeps its
// existing steps/tips/related rendering untouched.
//
// Shape each tool entry should eventually provide:
//   title        — panel header, e.g. "PDF to Word Guide"
//   what         — one paragraph: what the tool does
//   steps        — "How it works", 3-4 short numbered steps
//   tips         — "Tips for best results", short bullet list
//   quickFaqs    — 2-3 short Q&A shown in the slide-out accordion
//   fullFaqs     — the full Q&A list shown below the tool (can be longer)
//   recommendation — { icon, prompt, slug, label } single related-tool nudge
//   relatedTools — [{ slug, icon }] shown in the Related Tools card below

export const toolGuides = {
  'pdf-to-word': {
    title: 'PDF to Word Guide',
    what: 'Converts your PDF files into fully editable Word documents (.docx) while preserving formatting.',
    steps: [
      'Upload your PDF file.',
      'Convertam converts it securely.',
      'Download your editable DOCX file instantly.',
    ],
    tips: [
      'Text-based PDFs work best.',
      'Tables and headings are preserved where possible.',
      'Maximum file size: 100MB per file.',
    ],
    quickFaqs: [
      {
        q: 'Is my file secure?',
        a: 'Yes. Your file is automatically deleted after processing and is never shared with third parties.',
      },
      {
        q: 'Will formatting be preserved?',
        a: 'Headings, paragraphs and tables carry over wherever possible. Very complex, multi-column layouts may shift slightly, since PDF and Word use different layout models.',
      },
      {
        q: 'What is the maximum file size?',
        a: '100MB per file.',
      },
    ],
    fullFaqs: [
      {
        q: 'Is my file secure?',
        a: 'Yes. Your file is automatically deleted after processing and is never shared with third parties.',
      },
      {
        q: 'Will formatting be preserved?',
        a: 'Headings, paragraphs and tables carry over wherever possible. Very complex, multi-column layouts may shift slightly, since PDF and Word use different layout models.',
      },
      {
        q: 'What is the maximum file size?',
        a: '100MB per file.',
      },
      {
        q: 'Is this tool really free?',
        a: 'PDF to Word starts from ₦500 (about $1) per conversion. The price can increase slightly for very large, scanned, or high-page-count files, and you always see the exact price before you pay — no subscription, no login required.',
      },
    ],
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
