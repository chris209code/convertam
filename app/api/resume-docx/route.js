export const runtime = 'nodejs';
export const maxDuration = 30;

import HTMLtoDOCX from 'html-to-docx';
import { renderResumeDocxHtml } from '@/lib/resume/renderResumeDocxHtml';

// Generates a real, editable .docx directly from the CV's structured data —
// see lib/resume/renderResumeDocxHtml.js for why this exists instead of
// routing the CV through the generic PDF-to-Word tool (that round-trip
// through PDF is what was silently losing the sidebar/column layout).
export async function POST(request) {
  let templateKey, templateData;
  try {
    ({ templateKey, templateData } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!templateKey || !templateData) {
    return Response.json({ error: 'Missing resume data.' }, { status: 400 });
  }

  try {
    const bodyHtml = renderResumeDocxHtml(templateKey, templateData);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${bodyHtml}</body></html>`;
    const buffer = await HTMLtoDOCX(html, null, {
      title: 'CV',
      font: 'Calibri',
      table: { row: { cantSplit: true } },
    });

    return new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    });
  } catch (err) {
    console.error('Resume DOCX generation error:', err);
    return Response.json({ error: 'Could not generate the Word document. Please try again.' }, { status: 500 });
  }
}
