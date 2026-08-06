// Self-contained client-side PDF export for Summarize PDF. Mirrors the
// header/footer/pagination conventions established in
// components/tools/financial-shared/FinancialReport.js (drawHeader/
// drawFooter/ensureSpace) without importing or modifying that shared
// file — this tool's content shape (prose + bullet sections from
// lib/pdfSummarize/formatSummary.js) is different enough from the
// financial calculators' stat-card/table shape to warrant its own small
// renderer rather than forcing a shared abstraction across both.

const BRAND_BLUE = [37, 99, 235];
const BRAND_DARK = [15, 23, 42];
const INK_SOFT = [100, 116, 139];
const BORDER = [226, 232, 240];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 24;
const FOOTER_H = 14;

function drawHeader(doc, title, generatedDate) {
  const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
  doc.__headeredPages = doc.__headeredPages || new Set();
  if (doc.__headeredPages.has(pageNumber)) return;
  doc.__headeredPages.add(pageNumber);

  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, PAGE_W, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...BRAND_DARK);
  doc.text('Convertam', MARGIN, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK_SOFT);
  doc.text(title, MARGIN, 20.5);

  doc.setFontSize(8.5);
  doc.text(`Generated ${generatedDate}`, PAGE_W - MARGIN, 15, { align: 'right' });
  doc.text('convertam.app', PAGE_W - MARGIN, 20.5, { align: 'right' });

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, HEADER_H - 2, PAGE_W - MARGIN, HEADER_H - 2);
}

function drawFooter(doc, pageNum, pageCount) {
  const y = PAGE_H - FOOTER_H + 4;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y - 4, PAGE_W - MARGIN, y - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...INK_SOFT);
  doc.text('Convertam — free, no-login AI tools', MARGIN, y);
  doc.text(`Page ${pageNum} of ${pageCount}`, PAGE_W - MARGIN, y, { align: 'right' });
}

function ensureSpace(doc, y, needed, title, generatedDate) {
  if (y + needed > PAGE_H - FOOTER_H) {
    doc.addPage();
    drawHeader(doc, title, generatedDate);
    return HEADER_H + 6;
  }
  return y;
}

function drawSection(doc, y, section, title, generatedDate) {
  y = ensureSpace(doc, y, 10, title, generatedDate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_DARK);
  doc.text(section.heading, MARGIN, y);
  y += 6;

  if (section.kind === 'list') {
    for (const item of section.items) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      const lines = doc.splitTextToSize(item, CONTENT_W - 6);
      y = ensureSpace(doc, y, lines.length * 4.6 + 2, title, generatedDate);
      doc.setFillColor(...BRAND_BLUE);
      doc.circle(MARGIN + 1, y - 1.2, 1, 'F');
      doc.setTextColor(...BRAND_DARK);
      doc.text(lines, MARGIN + 5, y);
      y += lines.length * 4.6 + 2;
    }
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND_DARK);
    const lines = doc.splitTextToSize(section.items[0], CONTENT_W);
    y = ensureSpace(doc, y, lines.length * 4.8, title, generatedDate);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4.8;
  }
  return y + 4;
}

// generateSummaryReportPdf({ title, sourceFileName, sections, privacyNote, fileName })
// `sections` is the normalized shape from lib/pdfSummarize/formatSummary.js.
// Runs entirely client-side (dynamic jsPDF import, same as
// FinancialReport.js's generateFinancialReportPdf) — no server round trip.
export async function generateSummaryReportPdf({ title, sourceFileName, sections, privacyNote, fileName }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const generatedDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  drawHeader(doc, title, generatedDate);
  let y = HEADER_H + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...BRAND_DARK);
  doc.text(title, MARGIN, y);
  y += sourceFileName ? 6 : 10;
  if (sourceFileName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK_SOFT);
    doc.text(sourceFileName, MARGIN, y);
    y += 8;
  }

  for (const section of sections) {
    y = drawSection(doc, y, section, title, generatedDate);
  }

  if (privacyNote) {
    y = ensureSpace(doc, y, 10, title, generatedDate);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...INK_SOFT);
    doc.text(doc.splitTextToSize(privacyNote, CONTENT_W), MARGIN, y);
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(doc, i, pageCount);
  }

  doc.save(fileName || 'summary.pdf');
}
