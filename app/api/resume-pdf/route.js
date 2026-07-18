export const runtime = 'nodejs';
export const maxDuration = 60; // launching a real browser + rendering + PDF export genuinely takes a few seconds, longer than a typical API call

import { renderResumeHtml } from '@/lib/resume/renderResumeHtml';
import { generatePdf } from '@/lib/pdf/launchPdfBrowser';

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
    const pdfBytes = await generatePdf({
      label: 'resume-pdf',
      buildHtml: async (log) => {
        try {
          const html = await renderResumeHtml(templateKey, templateData);
          log('HTML rendered');
          return html;
        } catch (err) {
          console.error('[resume-pdf] HTML render failed:', err);
          throw Object.assign(new Error('Could not build the CV document. Please check the CV content and try again.'), { status: 400 });
        }
      },
      pdfOptions: {
        format: 'A4',
        printBackground: true,
        // No margin option here — page margin is controlled entirely by
        // the @page / @page :first CSS rules in renderResumeHtml.js,
        // which can express "zero margin on page 1, real margin on every
        // later page" per template design. A page.pdf() margin option
        // can't express that at all (one fixed value applies to every
        // page), which is why this used to be a per-template compromise.
        displayHeaderFooter: false,
      },
    });

    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (err) {
    console.error('Resume PDF generation error:', err);
    const status = err?.status || (err?.timedOut ? 504 : 500);
    const message = err?.timedOut ? 'PDF generation timed out. Please try again.' : (err?.message || 'Could not generate the PDF.');
    return Response.json({ error: message }, { status });
  }
}
