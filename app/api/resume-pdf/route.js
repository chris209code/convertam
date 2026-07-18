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

// The templates each bake their own visual margin into their own top-level
// CSS padding (same padding both on-screen and here, since the PDF reuses
// the exact same components) — that padding is a property of one
// continuous div, so it only ever actually appears once, at the very top
// of the whole flow, not fresh on every physical page a long CV overflows
// onto. Puppeteer's own page.pdf() margin option is what applies fresh
// margin to every physical page, so it's added here for the 3 templates
// whose own top-level design doesn't rely on bleeding color to the exact
// page edge — giving continuation pages the same breathing room as page 1
// without visibly changing page 1's current appearance (a few extra
// pixels of margin on top of what the template's own padding already
// draws). mpSidebar and mpHeaderBand are deliberately excluded: both have
// a full-bleed colored panel meant to touch the page edge with zero gap on
// page 1, and any nonzero page.pdf() margin would show as an unwanted
// white strip around that panel — a real visual regression these two
// specific templates don't currently have. Their continuation pages
// (2nd/3rd page of a long CV) keep the pre-existing flush-top layout; see
// the final report for why this is disclosed as a known limitation rather
// than forced.
const BLEED_TEMPLATES = new Set(['mpSidebar', 'mpHeaderBand']);
function marginForTemplate(templateKey) {
  if (BLEED_TEMPLATES.has(templateKey)) {
    return { top: '0', bottom: '0', left: '0', right: '0' };
  }
  return { top: '24px', bottom: '24px', left: '0', right: '0' };
}

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

      let html;
      try {
        html = await renderResumeHtml(templateKey, templateData);
      } catch (err) {
        console.error('[resume-pdf] HTML render failed:', err);
        throw Object.assign(new Error('Could not build the CV document. Please check the CV content and try again.'), { status: 400 });
      }
      log('HTML rendered');

      // Same serverless-Chromium setup as app/api/invoice-pdf/route.js —
      // see that file's comments for why LD_LIBRARY_PATH must not be
      // touched here and why setGraphicsMode isn't called.
      let executablePath;
      try {
        const chromium = (await import('@sparticuz/chromium')).default;
        const puppeteer = await import('puppeteer-core');
        executablePath = await chromium.executablePath();
        log('chromium binary resolved');

        browser = await puppeteer.launch({
          args: chromium.args,
          executablePath,
          headless: chromium.headless,
        });
        log('browser launched');
      } catch (err) {
        console.error('[resume-pdf] Chromium launch failed:', err);
        throw new Error('The PDF renderer could not start. Please try again in a moment.');
      }

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      log('content set (DOM ready)');

      await Promise.race([
        page.evaluate(() => document.fonts.ready),
        new Promise((resolve) => setTimeout(resolve, FONT_WAIT_TIMEOUT_MS)),
      ]);
      log('fonts settled (or timeout reached)');

      let pdfBytes;
      try {
        pdfBytes = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: marginForTemplate(templateKey),
          // Explicit, not just relying on Puppeteer's own default of false:
          // this is the actual fix for the browser header/footer bug — a
          // server-rendered PDF has no print dialog for a client machine to
          // have "Headers and footers" enabled on in the first place.
          displayHeaderFooter: false,
        });
      } catch (err) {
        console.error('[resume-pdf] PDF generation failed:', err);
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
