// One shared, professional multi-page PDF report engine for every
// calculator in the Business & Finance suite — replaces the old
// screenshot-of-the-page approach (html2canvas + jsPDF image) with a
// real, native jsPDF document: proper A4 pages, real margins, readable
// vector text at any zoom level, and tables that paginate correctly with
// their header row repeated on every page (via jspdf-autotable) instead
// of being clipped at a page edge.
//
// Every calculator feeds its own numbers into the same generic shape
// below rather than each building its own PDF layout — that's what makes
// every exported report look like it belongs to the same product.

const BRAND_BLUE = [37, 99, 235];   // #2563EB
const BRAND_DARK = [15, 23, 42];    // #0F172A
const INK_SOFT = [100, 116, 139];   // #64748B
const BORDER = [226, 232, 240];     // #E2E8F0
const LOSS_RED = [220, 38, 38];     // #DC2626

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const HEADER_H = 24;   // reserved space every page, top
const FOOTER_H = 14;   // reserved space every page, bottom

// Rasterizes a doughnut chart to a PNG data URL using the browser's own
// canvas — this is the client-side equivalent of the on-screen
// DoughnutChart component (same segment order/colors), just drawn once
// into a bitmap so it can be embedded in the PDF. jsPDF has no native
// arc/pie primitive, so this is the standard way to get chart-shaped
// output into a PDF without pulling in a full charting library.
function renderDoughnutPng(segments, size = 480) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - size * 0.04;
  const innerR = outerR * 0.6;
  const total = (segments || []).reduce((sum, s) => sum + Math.max(0, s.value), 0);

  ctx.clearRect(0, 0, size, size);
  if (total > 0) {
    let start = -Math.PI / 2;
    for (const seg of segments) {
      if (seg.value <= 0) continue;
      const angle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outerR, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      start += angle;
    }
  } else {
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.fillStyle = '#F1F5F9';
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';

  return canvas.toDataURL('image/png');
}

// Idempotent per physical page: autoTable's didDrawPage fires once for
// every page a table touches, INCLUDING the page it started on (which
// almost always already has a header from the step before it) — without
// this guard, a page holding two short tables back to back would get its
// header drawn three times, stacked exactly on top of itself. Page
// number is tracked as a property on the jsPDF instance itself rather
// than threading a Set through every draw* function's signature.
function drawHeader(doc, toolName, generatedDate) {
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
  doc.text(toolName, MARGIN, 20.5);

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
  doc.text('Convertam — free, no-login financial tools', MARGIN, y);
  doc.text(`Page ${pageNum} of ${pageCount}`, PAGE_W - MARGIN, y, { align: 'right' });
}

// Advances past the header on a freshly added page, and adds a new page
// (redrawing the header) if the next block of `needed` mm won't fit
// above the footer reserve.
function ensureSpace(doc, y, needed, toolName, generatedDate) {
  if (y + needed > PAGE_H - FOOTER_H) {
    doc.addPage();
    drawHeader(doc, toolName, generatedDate);
    return HEADER_H + 6;
  }
  return y;
}

function drawHero(doc, y, { label, value, sub, tone }) {
  const h = 26;
  const [r, g, b] = tone === 'loss' ? LOSS_RED : BRAND_BLUE;
  doc.setFillColor(r, g, b);
  doc.roundedRect(MARGIN, y, CONTENT_W, h, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text(String(label || '').toUpperCase(), MARGIN + 8, y + 9);

  doc.setFontSize(19);
  doc.text(String(value ?? ''), MARGIN + 8, y + 19);

  if (sub) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(String(sub), MARGIN + 8, y + 24);
  }
  return y + h + 8;
}

function drawStatCards(doc, y, cards, toolName, generatedDate) {
  if (!cards || cards.length === 0) return y;
  const cols = 2;
  const gap = 6;
  const cardW = (CONTENT_W - gap * (cols - 1)) / cols;
  const cardH = 16;
  let x = MARGIN;
  let rowStartY = y;
  let col = 0;

  for (const card of cards) {
    rowStartY = ensureSpace(doc, rowStartY, cardH + 4, toolName, generatedDate);
    if (col === 0) x = MARGIN; else x = MARGIN + (cardW + gap) * col;

    doc.setDrawColor(...BORDER);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, rowStartY, cardW, cardH, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...INK_SOFT);
    doc.text(String(card.label), x + 5, rowStartY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...BRAND_DARK);
    doc.text(String(card.value), x + 5, rowStartY + 12.5);

    col++;
    if (col >= cols) { col = 0; rowStartY += cardH + 4; }
  }
  if (col !== 0) rowStartY += cardH + 4;
  return rowStartY + 2;
}

function drawChart(doc, y, { segments, centerLabel, centerSubLabel }, toolName, generatedDate) {
  if (!segments || segments.length === 0) return y;
  const chartSize = 42;
  y = ensureSpace(doc, y, chartSize + 6, toolName, generatedDate);

  const png = renderDoughnutPng(segments);
  doc.addImage(png, 'PNG', MARGIN, y, chartSize, chartSize);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...BRAND_DARK);
  const legendX = MARGIN + chartSize + 8;
  let legendY = y + 4;
  if (centerLabel) {
    doc.text(`${centerLabel}${centerSubLabel ? ` ${centerSubLabel}` : ''}`, legendX, legendY);
    legendY += 6;
  }
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  for (const seg of segments) {
    if (seg.value <= 0) continue;
    const pct = total > 0 ? (seg.value / total) * 100 : 0;
    const [r, g, b] = hexToRgb(seg.color);
    doc.setFillColor(r, g, b);
    doc.circle(legendX + 1, legendY - 1.3, 1.3, 'F');
    doc.setTextColor(...BRAND_DARK);
    doc.text(`${seg.label} — ${seg.displayValue || ''} (${pct.toFixed(1)}%)`, legendX + 5, legendY);
    legendY += 5.5;
  }
  return Math.max(y + chartSize, legendY) + 8;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#2563EB');
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [37, 99, 235];
}

function drawInsights(doc, y, insights, toolName, generatedDate) {
  if (!insights || insights.length === 0) return y;
  y = ensureSpace(doc, y, 10, toolName, generatedDate);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...BRAND_DARK);
  doc.text('Insights', MARGIN, y);
  y += 6;

  for (const ins of insights) {
    const textLines = doc.setFont('helvetica', 'bold').setFontSize(9.5).splitTextToSize(ins.text, CONTENT_W - 6);
    const detailLines = ins.detail ? doc.setFont('helvetica', 'normal').setFontSize(8.5).splitTextToSize(ins.detail, CONTENT_W - 6) : [];
    const blockH = textLines.length * 4.6 + detailLines.length * 4 + 4;
    y = ensureSpace(doc, y, blockH, toolName, generatedDate);

    doc.setFillColor(...BRAND_BLUE);
    doc.circle(MARGIN + 1, y - 1.2, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND_DARK);
    doc.text(textLines, MARGIN + 5, y);
    y += textLines.length * 4.6;

    if (detailLines.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(...INK_SOFT);
      doc.text(detailLines, MARGIN + 5, y);
      y += detailLines.length * 4;
    }
    y += 3;
  }
  return y + 2;
}

// tables: [{ title, head: [colLabels], rows: [[cell,...]], activeRowIndex? }]
async function drawTables(doc, autoTable, y, tables, toolName, generatedDate) {
  if (!tables || tables.length === 0) return y;
  for (const table of tables) {
    y = ensureSpace(doc, y, 14, toolName, generatedDate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_DARK);
    doc.text(table.title, MARGIN, y);
    y += 5;

    autoTable(doc, {
      head: [table.head],
      body: table.rows,
      startY: y,
      margin: { top: HEADER_H + 4, bottom: FOOTER_H + 4, left: MARGIN, right: MARGIN },
      styles: { font: 'helvetica', fontSize: 8.5, textColor: BRAND_DARK, lineColor: BORDER, lineWidth: 0.2, cellPadding: 2.2 },
      headStyles: { fillColor: BRAND_BLUE, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (table.activeRowIndex != null && data.row.index === table.activeRowIndex && data.section === 'body') {
          data.cell.styles.fillColor = [239, 246, 255];
          data.cell.styles.textColor = BRAND_BLUE;
          data.cell.styles.fontStyle = 'bold';
        }
      },
      didDrawPage: () => drawHeader(doc, toolName, generatedDate),
    });
    y = doc.lastAutoTable.finalY + 10;
  }
  return y;
}

// The single entry point every calculator's ExportBar wires "Download
// PDF" into. `hero`/`statCards`/`chart`/`insights`/`tables` are all
// optional — a calculator only passes what it actually has, and nothing
// invented is ever rendered (an omitted section just doesn't appear).
export async function generateFinancialReportPdf({
  toolName, fileName, generatedDate, hero, statCards, chart, insights, tables, privacyNote,
}) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const date = generatedDate || new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  drawHeader(doc, toolName, date);
  let y = HEADER_H + 6;

  if (hero) y = drawHero(doc, y, hero);
  y = drawStatCards(doc, y, statCards, toolName, date);
  if (chart) y = drawChart(doc, y, chart, toolName, date);
  y = drawInsights(doc, y, insights, toolName, date);
  y = await drawTables(doc, autoTable, y, tables, toolName, date);

  if (privacyNote) {
    y = ensureSpace(doc, y, 10, toolName, date);
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

  doc.save(fileName || 'convertam-report.pdf');
}
