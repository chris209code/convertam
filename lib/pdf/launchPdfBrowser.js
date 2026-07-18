// Shared serverless-Chromium PDF generation, used by both
// app/api/invoice-pdf/route.js and app/api/resume-pdf/route.js. This is
// where the actual browser lifecycle, timeout, and cleanup logic lives —
// each route only supplies the HTML to render and the page.pdf() options,
// so there's exactly one place to fix if the Chromium launch/timeout
// behavior ever needs to change again, rather than two routes that have to
// be kept in sync by hand.

// Bounded wait for real webfonts to finish loading before the PDF is
// captured. page.setContent's own waitUntil:'networkidle0' blocks until
// any external font/asset request settles with NO bound of its own — on a
// slow or unreachable connection that could run long enough to approach
// maxDuration, at which point Vercel kills the function mid-flight and the
// client's fetch() sees an abrupt connection drop (an opaque "Failed to
// fetch", not a real error response). This bound keeps that dependency
// from ever blocking the whole export.
const FONT_WAIT_TIMEOUT_MS = 4000;

// Comfortably under each route's maxDuration=60 so a genuinely stuck
// render surfaces here as a clean, reported timeout — with time left to
// actually send that response — instead of Vercel's hard kill doing it
// for us with no response body at all.
const EXPORT_TIMEOUT_MS = 45000;

// Per-instance only (Vercel functions are ephemeral/isolated; this has no
// visibility into other instances), keyed per caller label so invoice and
// resume traffic don't get conflated in the same counter — a diagnostic
// signal for whether concurrent requests are landing on the same warm
// container, not an authoritative global count.
const activeJobsByLabel = new Map();

function timer(label) {
  const t0 = Date.now();
  return (stage) => console.log(`[${label}] ${stage} at ${Date.now() - t0}ms (active jobs on this instance: ${activeJobsByLabel.get(label) || 0})`);
}

/**
 * @param {string} label - log/diagnostic prefix, e.g. 'invoice-pdf'
 * @param {(log: (stage: string) => void) => Promise<string>} buildHtml -
 *   returns the HTML to render; receives the same diagnostic logger so
 *   callers can log their own checkpoints (e.g. "HTML rendered") on the
 *   same timeline. May throw an Error with a `.status` property for a
 *   caller-specific 4xx (e.g. invalid input) instead of the generic 500.
 * @param {object} pdfOptions - passed directly to page.pdf()
 * @returns {Promise<Buffer>} pdfBytes
 * @throws Error, with `.status` (if set by buildHtml) and `.timedOut`
 *   (true if the EXPORT_TIMEOUT_MS budget was exceeded) for the caller to
 *   map to an HTTP response.
 */
export async function generatePdf({ label, buildHtml, pdfOptions }) {
  let browser;
  activeJobsByLabel.set(label, (activeJobsByLabel.get(label) || 0) + 1);
  const log = timer(label);
  log('request start');

  let timedOut = false;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => { timedOut = true; reject(new Error('Export timed out.')); }, EXPORT_TIMEOUT_MS);
  });

  try {
    const work = (async () => {
      const html = await buildHtml(log);

      // @sparticuz/chromium ships a Chromium binary specifically packaged
      // to fit within Vercel/AWS Lambda's serverless function size
      // limits; puppeteer-core is the lightweight Puppeteer client with
      // no bundled browser of its own, pointed at that binary instead.
      let executablePath;
      try {
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteer = await import('puppeteer-core');

        // Do NOT set LD_LIBRARY_PATH manually here. @sparticuz/chromium
        // already does this correctly at import time (build/index.js
        // calls setupLambdaEnvironment("/tmp/al2023/lib") once it detects
        // the Node 20 Lambda runtime via AWS_LAMBDA_JS_RUNTIME, set in the
        // Vercel dashboard), and chromium.executablePath() below extracts
        // al2023.tar.br — the archive that actually contains libnss3.so —
        // into that exact directory. Overwriting LD_LIBRARY_PATH
        // afterwards with the chromium binary's own directory (/tmp, not
        // /tmp/al2023/lib) clobbers that correct value and was the actual
        // cause of the "libnss3.so: cannot open shared object file"
        // launch failure — a previous version of this file did exactly
        // that.
        //
        // Similarly, there's no working way to disable graphics mode on
        // the currently installed @sparticuz/chromium version: its
        // setGraphicsMode setter is neutered upstream (blocked by
        // https://github.com/Sparticuz/chromium/issues/247) and always
        // forces graphics mode back on regardless of what's passed in, so
        // it isn't called here.
        executablePath = await chromium.executablePath();
        log('chromium binary resolved');

        browser = await puppeteer.launch({
          args: chromium.args,
          executablePath,
          headless: chromium.headless,
        });
        log('browser launched');
      } catch (err) {
        console.error(`[${label}] Chromium launch failed:`, err);
        throw new Error('The PDF renderer could not start. Please try again in a moment.');
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      log('content set (DOM ready)');

      // Real fonts get a bounded chance to load (see FONT_WAIT_TIMEOUT_MS
      // above); any asset images are expected to already be base64 data
      // URLs baked into the HTML by the caller, so they need no network
      // wait of their own and aren't affected by this.
      await Promise.race([
        page.evaluate(() => document.fonts.ready),
        new Promise((resolve) => setTimeout(resolve, FONT_WAIT_TIMEOUT_MS)),
      ]);
      log('fonts settled (or timeout reached)');

      let pdfBytes;
      try {
        pdfBytes = await page.pdf(pdfOptions);
      } catch (err) {
        console.error(`[${label}] PDF generation failed:`, err);
        throw new Error('The PDF could not be generated. Please try again.');
      }
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
    // whichever invocation reuses it next. This is separate from the race
    // below so it still runs even when the timeout wins and the response
    // has already gone out.
    work.catch(() => {}).finally(() => {
      if (browser) { browser.close().catch(() => {}); browser = undefined; }
    });

    const pdfBytes = await Promise.race([work, timeoutPromise]);
    log('request success');
    return pdfBytes;
  } catch (err) {
    log(`request failed: ${err?.message || err}`);
    err.timedOut = timedOut;
    throw err;
  } finally {
    activeJobsByLabel.set(label, (activeJobsByLabel.get(label) || 1) - 1);
  }
}
