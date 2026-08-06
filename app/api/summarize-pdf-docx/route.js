export const runtime = 'nodejs';
export const maxDuration = 30;

import HTMLtoDOCX from 'html-to-docx';
import { renderSummaryDocxHtml } from '@/lib/pdfSummarize/renderSummaryDocxHtml';

// Generates a real, editable .docx directly from the already-generated
// summary's normalized sections — mirrors app/api/resume-docx/route.js's
// semantic-HTML-to-html-to-docx pattern exactly.
export async function POST(request) {
  let title, sourceFileName, sections;
  try {
    ({ title, sourceFileName, sections } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!Array.isArray(sections) || sections.length === 0) {
    return Response.json({ error: 'Missing summary data.' }, { status: 400 });
  }

  try {
    const bodyHtml = renderSummaryDocxHtml(title, sourceFileName, sections);
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${bodyHtml}</body></html>`;
    const buffer = await HTMLtoDOCX(html, null, { title: title || 'Summary', font: 'Calibri' });

    return new Response(buffer, {
      status: 200,
      headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    });
  } catch (err) {
    console.error('Summary DOCX generation error:', err);
    return Response.json({ error: 'Could not generate the Word document. Please try again.' }, { status: 500 });
  }
}
