// Builds semantic HTML (h1/h2/p/ul/li) from a summary's normalized
// sections (lib/pdfSummarize/formatSummary.js) for html-to-docx, the same
// pattern lib/resume/renderResumeDocxHtml.js already established —
// semantic HTML in, real headings/paragraphs/bullet lists out, no CSS
// flexbox (unsupported by that library) and no table trickery needed here
// since a summary document has no multi-column layout to preserve.

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderSummaryDocxHtml(title, sourceFileName, sections) {
  let html = `<h1>${esc(title || 'Summary')}</h1>`;
  if (sourceFileName) html += `<p><em>${esc(sourceFileName)}</em></p>`;
  for (const section of sections) {
    html += `<h2>${esc(section.heading)}</h2>`;
    if (section.kind === 'list') {
      html += `<ul>${section.items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
    } else {
      html += `<p>${esc(section.items[0])}</p>`;
    }
  }
  return html;
}
