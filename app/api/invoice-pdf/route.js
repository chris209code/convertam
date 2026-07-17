export const runtime = 'nodejs';
export const maxDuration = 60; // launching a real browser + rendering + PDF export genuinely takes a few seconds, longer than a typical API call

import path from 'path';
import { renderInvoiceHtml } from '@/lib/invoice-studio/htmlRenderer';

export async function POST(request) {
  let browser;
  try {
    const { doc, style, totals, wordsText } = await request.json();
    if (!doc || !doc.sections || !style) {
      return Response.json({ error: 'Missing invoice data.' }, { status: 400 });
    }

    const html = renderInvoiceHtml(doc, style, totals, wordsText);

    // @sparticuz/chromium ships a Chromium binary specifically packaged to
    // fit within Vercel/AWS Lambda's serverless function size limits;
    // puppeteer-core is the lightweight Puppeteer client with no bundled
    // browser of its own, pointed at that binary instead.
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteer = await import('puppeteer-core');

    // Serverless has no GPU, so graphics-mode Chromium features have
    // nothing to run against — leaving this on has caused silent launch
    // failures on Vercel.
    if (typeof chromium.setGraphicsMode === 'function') {
      chromium.setGraphicsMode(false);
    }

    const executablePath = await chromium.executablePath();
    // chromium's shared libraries (libnss3.so etc.) get extracted next to
    // the binary, but the system loader won't find them there unless
    // LD_LIBRARY_PATH points at that directory — this has to be set before
    // puppeteer.launch() actually spawns the process.
    process.env.LD_LIBRARY_PATH = path.dirname(executablePath);

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    // networkidle0 waits for the Google Fonts stylesheet (and any images —
    // logo, signature, stamp, QR — which are already base64 data URLs, so
    // they don't need a network wait, but the fonts request does) to
    // finish loading before the PDF is captured, so text isn't rendered in
    // a fallback font before the real one arrives.
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBytes = await page.pdf({
      format: 'A4',
      printBackground: true,
      // No margin here — the invoice's own internal padding (built into
      // where each element is positioned) already provides visual margin,
      // matching the same reasoning that fixed the earlier double-margin
      // clipping bug.
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });

    await browser.close();

    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (err) {
    if (browser) { try { await browser.close(); } catch { /* already closed or failed to launch */ } }
    console.error('Invoice PDF generation error:', err);
    return Response.json({ error: err?.message || 'Could not generate the PDF.' }, { status: 500 });
  }
}
