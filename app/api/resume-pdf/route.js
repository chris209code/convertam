export const runtime = 'nodejs';
export const maxDuration = 60; // launching a real browser + rendering + PDF export genuinely takes a few seconds, longer than a typical API call

import { renderResumeHtml } from '@/lib/resume/renderResumeHtml';

// Bounded wait for the real webfont to finish loading before the PDF is
// captured — see the matching comment in app/api/invoice-pdf/route.js for
// why this needs an explicit bound rather than page.setContent's own
// networkidle0 (which has no bound of its own and risks running into this
// route's maxDuration on a slow/unreachable connection to Google Fonts).
const FONT_WAIT_TIMEOUT_MS = 4000;

// Comfortably under maxDuration so a genuinely stuck render surfaces here
// as a clean, reported timeout instead of Vercel's hard kill doing it for
// us with no response body at all.
const EXPORT_TIMEOUT_MS = 45000;

// Per-instance only (Vercel functions are ephemeral/isolated) — a
// diagnostic signal for whether concurrent requests are landing on the
// same warm container, not an authoritative global count.
let activeJobs = 0;

function timer() {
  const t0 = Date.now();
  return (stage) => console.log(`[resume-pdf] ${stage} at ${Date.now() - t0}ms (active jobs on this instance: ${activeJobs})`);
}

export async function POST(request) {
  let browser;
  activeJobs++;
  const log = timer();
  log('request start');

  let timedOut = false;
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => { timedOut = true; reject(new Error('Export timed out.')); }, EXPORT_TIMEOUT_MS);
  });

  try {
    const work = (async () => {
      const { templateKey, templateData } = await request.json();
      if (!templateKey || !templateData) {
        throw Object.assign(new Error('Missing resume data.'), { status: 400 });
      }
      log('document prepared');

      const html = await renderResumeHtml(templateKey, templateData);
      log('HTML rendered');

      // Same serverless-Chromium setup as app/api/invoice-pdf/route.js —
      // see that file's comments for why LD_LIBRARY_PATH must not be
      // touched here and why setGraphicsMode isn't called.
      const chromium = (await import('@sparticuz/chromium')).default;
      const puppeteer = await import('puppeteer-core');

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

      await Promise.race([
        page.evaluate(() => document.fonts.ready),
        new Promise((resolve) => setTimeout(resolve, FONT_WAIT_TIMEOUT_MS)),
      ]);
      log('fonts settled (or timeout reached)');

      const pdfBytes = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
        // Explicit, not just relying on Puppeteer's own default of false:
        // this is the actual fix for the browser header/footer bug — a
        // server-rendered PDF has no print dialog for a client machine to
        // have "Headers and footers" enabled on in the first place.
        displayHeaderFooter: false,
      });
      log('PDF generated');

      await browser.close();
      browser = undefined;
      log('browser closed');

      return pdfBytes;
    })();

    // puppeteer-core has no AbortSignal support, so a timed-out work()
    // can't actually be cancelled — only raced against and, once it
    // eventually settles on its own, cleaned up here so a leaked browser
    // process doesn't linger in this container for whichever invocation
    // reuses it next.
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
    console.error('Resume PDF generation error:', err);
    const status = err?.status || (timedOut ? 504 : 500);
    const message = timedOut ? 'PDF generation timed out. Please try again.' : (err?.message || 'Could not generate the PDF.');
    return Response.json({ error: message }, { status });
  } finally {
    activeJobs--;
  }
}
