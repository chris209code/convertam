import { mmToPx } from './presets';

// Standard photo-print sheet sizes, tried in order until the requested grid
// fits without cells overlapping — 4x6in covers most passport-photo sizes
// for both 4-up and 8-up counts, with 5x7in and A4 as fallbacks for larger
// presets (e.g. Canada's 50x70mm) where 4x6in genuinely isn't big enough.
const SHEET_CANDIDATES_MM = [
  { w: 102, h: 152 }, { w: 152, h: 102 }, // 4x6in
  { w: 127, h: 178 }, { w: 178, h: 127 }, // 5x7in
  { w: 210, h: 297 }, { w: 297, h: 210 }, // A4
];
const MARGIN_MM = 4;
const GUTTER_MM = 2;

function divisorPairs(n) {
  const pairs = [];
  for (let rows = 1; rows <= n; rows++) {
    if (n % rows === 0) pairs.push({ rows, cols: n / rows });
  }
  return pairs;
}

export function computeSheetLayout(photoWmm, photoHmm, count) {
  for (const sheet of SHEET_CANDIDATES_MM) {
    for (const { rows, cols } of divisorPairs(count)) {
      const neededW = cols * photoWmm + (cols - 1) * GUTTER_MM + MARGIN_MM * 2;
      const neededH = rows * photoHmm + (rows - 1) * GUTTER_MM + MARGIN_MM * 2;
      if (neededW <= sheet.w && neededH <= sheet.h) {
        return { sheetWmm: sheet.w, sheetHmm: sheet.h, rows, cols, photoWmm, photoHmm };
      }
    }
  }
  // Ultimate fallback: a generously sized custom sheet that always fits.
  const { rows, cols } = divisorPairs(count)[Math.floor(divisorPairs(count).length / 2)];
  return {
    sheetWmm: cols * photoWmm + (cols - 1) * GUTTER_MM + MARGIN_MM * 2,
    sheetHmm: rows * photoHmm + (rows - 1) * GUTTER_MM + MARGIN_MM * 2,
    rows, cols, photoWmm, photoHmm,
  };
}

// Renders the tiled sheet (photo repeated `rows*cols` times with light
// dashed cut-guides) as a new canvas at the given dpi.
export function renderSheetCanvas(photoCanvas, layout, dpi) {
  const { sheetWmm, sheetHmm, rows, cols, photoWmm, photoHmm } = layout;
  const canvas = document.createElement('canvas');
  canvas.width = mmToPx(sheetWmm, dpi);
  canvas.height = mmToPx(sheetHmm, dpi);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const marginPx = mmToPx(MARGIN_MM, dpi);
  const gutterPx = mmToPx(GUTTER_MM, dpi);
  const cellWpx = mmToPx(photoWmm, dpi);
  const cellHpx = mmToPx(photoHmm, dpi);
  const gridWpx = cols * cellWpx + (cols - 1) * gutterPx;
  const gridHpx = rows * cellHpx + (rows - 1) * gutterPx;
  const offsetX = (canvas.width - gridWpx) / 2;
  const offsetY = (canvas.height - gridHpx) / 2;

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * (cellWpx + gutterPx);
      const y = offsetY + r * (cellHpx + gutterPx);
      ctx.drawImage(photoCanvas, x, y, cellWpx, cellHpx);
      ctx.strokeRect(x, y, cellWpx, cellHpx);
    }
  }
  return canvas;
}

export function downloadCanvasAsImage(canvas, format, filename) {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg';
  const url = canvas.toDataURL(mime, 0.95);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
}

export async function downloadCanvasAsPdf(canvas, widthMm, heightMm, filename) {
  const { PDFDocument } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
  const jpgBytes = await (await fetch(jpgUrl)).arrayBuffer();
  const image = await doc.embedJpg(jpgBytes);
  // pdf-lib pages are sized in points (1/72in) — convert from mm.
  const widthPt = (widthMm / 25.4) * 72;
  const heightPt = (heightMm / 25.4) * 72;
  const page = doc.addPage([widthPt, heightPt]);
  page.drawImage(image, { x: 0, y: 0, width: widthPt, height: heightPt });
  const bytes = await doc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
