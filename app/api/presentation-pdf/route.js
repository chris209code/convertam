export const runtime = 'nodejs';
export const maxDuration = 60;

import { buildPresentationHtml } from '@/lib/presentation/buildPresentationPdf';
import { generatePdf } from '@/lib/pdf/launchPdfBrowser';
import { SLIDE_W, SLIDE_H } from '@/lib/presentation/layoutEngine';

export async function POST(request) {
  let slidesMeta, objects, theme, title;
  try {
    ({ slidesMeta, objects, theme, title } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!Array.isArray(slidesMeta) || !slidesMeta.length || !Array.isArray(objects) || !theme) {
    return Response.json({ error: 'Missing presentation data.' }, { status: 400 });
  }

  try {
    const pdfBytes = await generatePdf({
      label: 'presentation-pdf',
      buildHtml: async (log) => {
        const html = buildPresentationHtml({ slidesMeta, objects, theme, title });
        log('HTML built');
        return html;
      },
      pdfOptions: {
        width: `${SLIDE_W}in`,
        height: `${SLIDE_H}in`,
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      },
    });

    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (err) {
    console.error('Presentation PDF generation error:', err);
    const status = err?.status || (err?.timedOut ? 504 : 500);
    const message = err?.timedOut ? 'PDF generation timed out. Please try again.' : (err?.message || 'Could not generate the PDF.');
    return Response.json({ error: message }, { status });
  }
}
