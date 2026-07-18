// Server-side HTML for the CV/Resume PDF export. This deliberately reuses
// the exact same template components the live editor renders
// (components/tools/resumeTemplates.js) via ReactDOMServer instead of
// hand-porting each of the 5 templates into a second, parallel HTML string
// implementation — there is exactly one place that knows what a resume
// looks like, so the PDF can never visually drift from the on-screen
// preview the way two independently maintained renderers could.
import fs from 'fs';
import path from 'path';
import { TEMPLATES } from '@/components/tools/resumeTemplates';

// The templates' Modern Professional variants set no font-family of their
// own — on-screen they inherit it from the site's Tailwind `font-body`
// utility (IBM Plex Sans, applied to <body> in app/layout.js). This
// standalone document has no Tailwind stylesheet, so that inheritance path
// doesn't exist here; the same font is loaded and applied explicitly
// instead. Classic/Executive already set their own explicit font-family
// and are unaffected either way.
//
// The font itself is embedded as a base64 data URI (lib/resume/fonts/) —
// not linked from Google's CDN — so PDF generation has zero network
// dependency of its own: no possibility of a slow/unreachable font fetch
// silently falling back to a different font on some requests but not
// others. This one file is IBM Plex Sans's variable font instance; Chrome
// resolves the 400/500/600 weights used below from its own weight axis,
// which is also why Google's CDN serves the same file for all three
// weights (confirmed by inspecting its actual CSS response).
let cachedFontBase64;
function loadFontBase64() {
  if (!cachedFontBase64) {
    const fontPath = path.join(process.cwd(), 'lib/resume/fonts/IBMPlexSans-latin.woff2');
    cachedFontBase64 = fs.readFileSync(fontPath).toString('base64');
  }
  return cachedFontBase64;
}

export async function renderResumeHtml(templateKey, data) {
  // Dynamically imported (rather than a static top-level import) because
  // Next.js's App Router build statically forbids importing react-dom/server
  // anywhere in a Route Handler's module graph — it wants Route Handlers to
  // return content directly rather than drive their own React render pass.
  // A runtime-only import isn't visible to that static check and gets us
  // the real benefit this file exists for: reusing the actual template
  // components instead of hand-porting a second, driftable copy of them.
  const [{ default: React }, { renderToStaticMarkup }] = await Promise.all([
    import('react'),
    import('react-dom/server'),
  ]);
  const Component = TEMPLATES[templateKey] || TEMPLATES.mpSidebar;
  const markup = renderToStaticMarkup(React.createElement(Component, { data }));
  const fontBase64 = loadFontBase64();

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'IBM Plex Sans';
    font-weight: 400;
    font-style: normal;
    src: url(data:font/woff2;base64,${fontBase64}) format('woff2');
  }
  @font-face {
    font-family: 'IBM Plex Sans';
    font-weight: 500;
    font-style: normal;
    src: url(data:font/woff2;base64,${fontBase64}) format('woff2');
  }
  @font-face {
    font-family: 'IBM Plex Sans';
    font-weight: 600;
    font-style: normal;
    src: url(data:font/woff2;base64,${fontBase64}) format('woff2');
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'IBM Plex Sans', Arial, Helvetica, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { size: A4; }
</style>
</head>
<body>
<div style="width:210mm;background:#fff;">${markup}</div>
</body>
</html>`;
}
