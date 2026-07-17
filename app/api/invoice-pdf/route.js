export const runtime = 'nodejs';
export const maxDuration = 60; // launching a real browser + rendering + PDF export genuinely takes a few seconds, longer than a typical API call

import { renderInvoiceHtml } from '@/lib/invoice-studio/htmlRenderer';

// Bounded wait for real webfonts to finish loading before the PDF is
// captured. The previous version used page.setContent's own
// waitUntil:'networkidle0', which blocks until Google Fonts' external CDN
// request settles with NO explicit bound of its own — on a slow or
// unreachable connection that could run long enough to approach this
// route's 60s maxDuration, at which point Vercel kills the function
// mid-flight and the client's fetch() sees an abrupt connection drop
// (surfaced in the browser as an opaque "Failed to fetch", not a real
// error response). This bound keeps that dependency from ever blocking the
// whole export: real fonts still get used when the CDN responds quickly,
// but generation proceeds regardless once this elapses.
const FONT_WAIT_TIMEOUT_MS = 4000;

// Comfortably under maxDuration so a genuinely stuck render surfaces here
// as a clean, reported timeout — with time left to actually send that
// response — instead of Vercel's hard kill doing it for us with no
// response body at all.
const EXPORT_TIMEOUT_MS = 45000;

// Per-instance only (Vercel functions are ephemeral/isolated; this has no
// visibility into other instances) — a diagnostic signal for whether
// concurrent requests are landing on the same warm container, not an
// authoritative global count.
let activeJobs = 0;

function timer() {
  const t0 = Date.now();
  return (stage) => console.log(`[invoice-pdf] ${stage} at ${Date.now() - t0}ms (active jobs on this instance: ${activeJobs})`);
}

export async function POST(request) {
  let browser;
  activeJobs++;
  const log = timer();
  log(`request start`);

  let timedOut = false;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => { timedOut = true; reject(new Error('Export timed out.')); }, EXPORT_TIMEOUT_MS);
  });

  try {
    const work = (async () => {
      const { doc, style, totals, wordsText } = await request.json();
      if (!doc || !doc.sections || !style) {
        throw Object.assign(new Error('Missing invoice data.'), { status: 400 });
      }
      log('document prepared');

      const html = renderInvoiceHtml(doc, style, totals, wordsText);
      log('HTML rendered');

      // @sparticuz/chromium ships a Chromium binary specifically packaged to
      // fit within Vercel/AWS Lambda's serverless function size limits;
      // puppeteer-core is the lightweight Puppeteer client with no bundled
      // browser of its own, pointed at that binary instead.
      const chromium = (await import('@sparticuz/chromium')).default;
      const puppeteer = await import('puppeteer-core');

      // Do NOT set LD_LIBRARY_PATH manually here. @sparticuz/chromium already
      // does this correctly at import time (build/index.js calls
      // setupLambdaEnvironment("/tmp/al2023/lib") once it detects the Node 20
      // Lambda runtime via AWS_LAMBDA_JS_RUNTIME, which is set in the Vercel
      // dashboard), and chromium.executablePath() below extracts al2023.tar.br
      // — the archive that actually contains libnss3.so — into that exact
      // directory. Overwriting LD_LIBRARY_PATH afterwards with the chromium
      // binary's own directory (/tmp, not /tmp/al2023/lib) clobbers that
      // correct value and was the actual cause of the "libnss3.so: cannot
      // open shared object file" launch failure — a previous version of this
      // file did exactly that.
      //
      // Similarly, there's no working way to disable graphics mode on the
      // currently installed @sparticuz/chromium version: its setGraphicsMode
      // setter is neutered upstream (blocked by
      // https://github.com/Sparticuz/chromium/issues/247) and always forces
      // graphics mode back on regardless of what's passed in, so it isn't
      // called here.
      const executablePath = await chromium.executablePath();
      log('chromium binary resolved');

      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath,
        headless: chromium.headless,
      });
      log('browser launched');

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      log('content set (DOM ready)');

      // Real fonts get a bounded chance to load (see FONT_WAIT_TIMEOUT_MS
      // above); asset images (logo, signature, product photos, QR) are
      // already base64 data URLs baked into the HTML, so they need no
      // network wait of their own and aren't affected by this.
      await Promise.race([
        page.evaluate(() => document.fonts.ready),
        new Promise((resolve) => setTimeout(resolve, FONT_WAIT_TIMEOUT_MS)),
      ]);
      log('fonts settled (or timeout reached)');

      const pdfBytes = await page.pdf({
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
      });
      log('PDF generated');

      await browser.close();
      browser = undefined;
      log('browser closed');

      return pdfBytes;
    })();

    // puppeteer-core has no AbortSignal support, so a timed-out work()
    // can't actually be cancelled — only raced against and, once it
    // eventually settles on its own (success or failure), cleaned up here
    // so a leaked browser process doesn't linger in this container for
    // whichever invocation reuses it next. This is separate from the
    // race below so it still runs even when the timeout wins and the
    // response has already gone out.
    work.catch(() => {}).finally(() => {
      if (browser) { browser.close().catch(() => {}); browser = undefined; }
    });

    const pdfBytes = await Promise.race([work, timeoutPromise]);
    log('request success');

    return new Response(pdfBytes, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (err) {
    log(`request failed: ${err?.message || err}`);
    console.error('Invoice PDF generation error:', err);
    const status = err?.status || (timedOut ? 504 : 500);
    const message = timedOut ? 'PDF generation timed out. Please try again.' : (err?.message || 'Could not generate the PDF.');
    return Response.json({ error: message }, { status });
  } finally {
    activeJobs--;
  }
}
