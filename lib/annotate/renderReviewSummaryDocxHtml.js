// Builds the Review Summary .docx body — mirrors renderResumeDocxHtml.js's
// pattern (semantic HTML in, html-to-docx out) rather than screenshotting
// the on-screen Review Panel. Uses the same describeObject()/typeGroupLabel()/
// isCommentBearing() helpers the Review Panel renders from, so the exported
// rows can never drift from what's shown on screen.
import { describeObject, isCommentBearing, typeGroupLabel } from './reviewLabel';

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// objects: full cross-page array; pageOrder: display-order list of original
// page indices (same shapes ReviewPanel.js and AnnotatePdfWorkspace.js use).
export function renderReviewSummaryDocxHtml({ documentName, generatedDate, objects, pageOrder }) {
  const total = objects.length;
  const unresolved = objects.filter((o) => isCommentBearing(o) && !o.resolved).length;

  const byGroup = new Map();
  objects.forEach((o) => {
    const label = typeGroupLabel(o);
    byGroup.set(label, (byGroup.get(label) || 0) + 1);
  });
  const groups = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);

  const byPage = new Map();
  objects.forEach((o) => {
    if (!byPage.has(o.page)) byPage.set(o.page, []);
    byPage.get(o.page).push(o);
  });

  const parts = [];
  parts.push(`<h1>Review Summary</h1>`);
  parts.push(`<p>${esc(documentName || 'document.pdf')} — generated ${esc(generatedDate)}</p>`);

  parts.push(`<h2>Summary</h2>`);
  parts.push(`<p><strong>${total} annotation${total === 1 ? '' : 's'}</strong></p>`);
  if (groups.length) {
    parts.push('<ul>' + groups.map(([label, count]) => `<li>${esc(label)}: ${count}</li>`).join('') + '</ul>');
  }
  parts.push(`<p>${unresolved > 0 ? `${unresolved} unresolved` : 'All resolved'}</p>`);

  pageOrder.forEach((origIdx, position) => {
    const pageObjs = byPage.get(origIdx);
    if (!pageObjs || !pageObjs.length) return;
    parts.push(`<h2>Page ${position + 1}</h2>`);
    const rows = [...pageObjs]
      .sort((a, b) => a.z - b.z)
      .map((o) => {
        const resolvedCell = isCommentBearing(o) ? (o.resolved ? 'Resolved' : 'Unresolved') : '—';
        return `<tr><td>${esc(typeGroupLabel(o))}</td><td>${esc(describeObject(o))}</td><td>${resolvedCell}</td></tr>`;
      })
      .join('');
    parts.push(`
      <table style="width:640px;border-collapse:collapse;">
        <tr><th style="width:140px;text-align:left;">Type</th><th style="width:340px;text-align:left;">Comment</th><th style="width:120px;text-align:left;">Status</th></tr>
        ${rows}
      </table>
    `);
  });

  return parts.join('\n');
}
