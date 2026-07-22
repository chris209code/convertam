export const runtime = 'nodejs';
export const maxDuration = 60;

import HTMLtoDOCX from 'html-to-docx';

// Turns the translated HTML (produced client-side by reinjecting
// translated text back into the DOM mammoth.convertToHtml originally
// parsed from the uploaded DOCX — see lib/documentTranslate/htmlBlocks.js)
// into a real, downloadable .docx. Every heading/paragraph/bold/italic/
// underline/list/table/hyperlink/image tag survived that reinjection
// untouched, so html-to-docx is converting genuine structured HTML, not a
// flat-text approximation of it.
export async function POST(request) {
  let html, title;
  try {
    ({ html, title } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!html || !html.trim()) {
    return Response.json({ error: 'No document content to convert.' }, { status: 400 });
  }

  try {
    const buffer = await HTMLtoDOCX(html, null, {
      title: title || 'Translated document',
      font: 'Calibri',
      table: { row: { cantSplit: true } },
    });

    return new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    });
  } catch (err) {
    console.error('Document Translator DOCX export error:', err);
    return Response.json({ error: 'Could not generate the Word document. Please try again.' }, { status: 500 });
  }
}
