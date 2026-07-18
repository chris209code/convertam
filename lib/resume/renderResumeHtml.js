// Server-side HTML for the CV/Resume PDF export. This deliberately reuses
// the exact same template components the live editor renders
// (components/tools/resumeTemplates.js) via ReactDOMServer instead of
// hand-porting each of the 5 templates into a second, parallel HTML string
// implementation — there is exactly one place that knows what a resume
// looks like, so the PDF can never visually drift from the on-screen
// preview the way two independently maintained renderers could.
import { TEMPLATES } from '@/components/tools/resumeTemplates';

// The templates' Modern Professional variants set no font-family of their
// own — on-screen they inherit it from the site's Tailwind `font-body`
// utility (IBM Plex Sans, applied to <body> in app/layout.js). This
// standalone document has no Tailwind stylesheet, so that inheritance path
// doesn't exist here; the same font is loaded and applied explicitly
// instead. Classic/Executive already set their own explicit font-family
// and are unaffected either way.
const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&display=swap';

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

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="${GOOGLE_FONTS_HREF}" />
<style>
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
