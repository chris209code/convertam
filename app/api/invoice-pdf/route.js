export const runtime = 'nodejs';
export const maxDuration = 60; // launching a real browser + rendering + PDF export genuinely takes a few seconds, longer than a typical API call

import { renderInvoiceHtml } from '@/lib/invoice-studio/htmlRenderer';
import { generatePdf } from '@/lib/pdf/launchPdfBrowser';

export async function POST(request) {
  try {
    const pdfBytes = await generatePdf({
      label: 'invoice-pdf',
      buildHtml: async (log) => {
        const { doc, style, totals, wordsText } = await request.json();
        if (!doc || !doc.sections || !style) {
          throw Object.assign(new Error('Missing invoice data.'), { status: 400 });
        }
        log('document prepared');
        const html = renderInvoiceHtml(doc, style, totals, wordsText);
        log('HTML rendered');
        return html;
      },
      pdfOptions: {
        format: 'A4',
        printBackground: true,
        // Margin lives here, not as CSS padding on the content div — a
        // page.pdf() margin applies fresh to EVERY physical page the
        // browser's print pagination produces, whereas padding on one
        // continuous content div only ever appears once, at the very top
        // and bottom of the whole flow. That was the actual cause of page
        // 2+ starting flush against the paper edge with no top margin:
        // there was never a page 2 margin to begin with, only ever a
        // margin on the single tall box page 2 happened to be sliced out
        // of. See the matching comment in htmlRenderer.js.
        margin: { top: '40px', bottom: '40px', left: '40px', right: '40px' },
      },
    });

    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (err) {
    console.error('Invoice PDF generation error:', err);
    const status = err?.status || (err?.timedOut ? 504 : 500);
    const message = err?.timedOut ? 'PDF generation timed out. Please try again.' : (err?.message || 'Could not generate the PDF.');
    return Response.json({ error: message }, { status });
  }
}
