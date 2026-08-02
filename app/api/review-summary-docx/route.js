export const runtime = 'nodejs';
export const maxDuration = 30;

import HTMLtoDOCX from 'html-to-docx';
import { renderReviewSummaryDocxHtml } from '@/lib/annotate/renderReviewSummaryDocxHtml';

// Generates the Annotate PDF "Review Summary" as a real, editable .docx —
// see lib/annotate/renderReviewSummaryDocxHtml.js for the HTML build, and
// app/api/resume-docx/route.js for the identical html-to-docx pattern this
// mirrors.
export async function POST(request) {
  let documentName, generatedDate, objects, pageOrder;
  try {
    ({ documentName, generatedDate, objects, pageOrder } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!Array.isArray(objects) || !Array.isArray(pageOrder)) {
    return Response.json({ error: 'Missing review data.' }, { status: 400 });
  }

  try {
    const bodyHtml = renderReviewSummaryDocxHtml({ documentName, generatedDate, objects, pageOrder });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${bodyHtml}</body></html>`;
    const buffer = await HTMLtoDOCX(html, null, {
      title: 'Review Summary',
      font: 'Calibri',
      table: { row: { cantSplit: true } },
    });

    return new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    });
  } catch (err) {
    console.error('Review summary DOCX generation error:', err);
    return Response.json({ error: 'Could not generate the Word document. Please try again.' }, { status: 500 });
  }
}
