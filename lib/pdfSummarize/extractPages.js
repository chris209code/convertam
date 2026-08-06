// Client-side, per-page PDF text extraction for Summarize PDF's pipeline —
// a sibling to lib/extractDocText.js's extractTextFromFile(), which
// flattens everything into one string and loses page boundaries.
// Summarize PDF needs those boundaries for header/footer detection, the
// large-document page-range chooser, and per-chunk page attribution.
// Uses the same pdf.js CDN version/worker setup already established there.

// pdf.js text items carry no line-break information of their own — joining
// them with a plain space (as lib/extractDocText.js does, fine for its use
// case) collapses an entire page into one line, which breaks clean.js's
// line-based header/footer detection and chunk.js's paragraph splitting.
// Each item's transform matrix's 5th value is its baseline Y position, so a
// meaningful jump between consecutive items' Y marks a real line break.
function joinTextItemsWithLineBreaks(items) {
  let text = '';
  let lastY = null;
  for (const item of items) {
    const y = Array.isArray(item.transform) ? item.transform[5] : null;
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 1) {
      text += '\n';
    } else if (text && !text.endsWith('\n')) {
      text += ' ';
    }
    text += item.str;
    lastY = y;
  }
  return text;
}

export async function extractPdfPages(file) {
  if (!window.pdfjsLib) {
    throw new Error('PDF reader is still loading — please wait a moment and try again.');
  }
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = joinTextItemsWithLineBreaks(content.items).trim();
    pages.push({ number: i, text });
  }
  return { pages, pageCount: pdf.numPages };
}
