export const runtime = 'nodejs';
export const maxDuration = 60;

import { generatePdf } from '@/lib/pdf/launchPdfBrowser';

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Fast/Accurate modes only produce flat translated text, so this is a plain,
// paragraphs-only document — not the structured, headings/tables-preserving
// render that Preserve Formatting mode (Phase 2+) will produce from a real
// block structure. Good enough for "download something readable," honestly
// scoped as that rather than pretending it reproduces the source layout.
function buildHtml(text, title) {
  const paragraphs = text.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`).join('\n');
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 25mm 20mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a1a1a; line-height: 1.6; font-size: 12pt; }
  h1 { font-size: 14pt; margin-bottom: 18px; color: #333; }
  p { margin: 0 0 12px 0; white-space: pre-wrap; }
</style>
</head>
<body>
<h1>${escapeHtml(title || 'Translated document')}</h1>
${paragraphs}
</body>
</html>`;
}

export async function POST(request) {
  let text, title;
  try {
    ({ text, title } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!text || !text.trim()) {
    return Response.json({ error: 'No text to render.' }, { status: 400 });
  }

  try {
    const pdfBytes = await generatePdf({
      label: 'document-translate-pdf',
      buildHtml: async () => buildHtml(text, title),
      pdfOptions: { format: 'A4', printBackground: true },
    });

    return new Response(pdfBytes, { status: 200, headers: { 'Content-Type': 'application/pdf' } });
  } catch (err) {
    console.error('Document Translator PDF export error:', err);
    const status = err?.timedOut ? 504 : 500;
    const message = err?.timedOut ? 'PDF generation timed out. Please try again.' : (err?.message || 'Could not generate the PDF.');
    return Response.json({ error: message }, { status });
  }
}
