// Rasterizes PDF pages to <canvas>-backed images for the side-by-side,
// page-by-page, and overlay views, and provides a bounded "visual layout"
// difference check — this is intentionally NOT a full geometric/image diff
// engine. It downsamples each page to a small fixed grid and compares
// average luminance per cell, which reliably catches gross layout/image
// changes (a moved paragraph, an inserted image, reflowed content) without
// pretending to detect subtle rendering artifacts it can't reliably see.
const RENDER_SCALE = 1.4;
const DIFF_GRID_W = 48;
const DIFF_GRID_H = 64;

export async function renderPageImages(pdf, maxPages) {
  const images = [];
  const pageCount = Math.min(pdf.numPages, maxPages);
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: RENDER_SCALE });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    images.push({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: canvas.width, height: canvas.height });
  }
  return images;
}

function downsampleLuminance(dataUrl, width, height) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = DIFF_GRID_W;
      canvas.height = DIFF_GRID_H;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, DIFF_GRID_W, DIFF_GRID_H);
      // Preserve aspect ratio within the grid so pages of slightly different
      // dimensions still compare meaningfully cell-for-cell.
      const scale = Math.min(DIFF_GRID_W / width, DIFF_GRID_H / height);
      const w = width * scale, h = height * scale;
      ctx.drawImage(img, (DIFF_GRID_W - w) / 2, (DIFF_GRID_H - h) / 2, w, h);
      const { data } = ctx.getImageData(0, 0, DIFF_GRID_W, DIFF_GRID_H);
      const gray = new Float32Array(DIFF_GRID_W * DIFF_GRID_H);
      for (let p = 0; p < gray.length; p++) {
        const o = p * 4;
        gray[p] = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
      }
      resolve(gray);
    };
    img.src = dataUrl;
  });
}

// Returns a 0-100 "visual difference" score for one page pair, plus the
// grid cells that differ meaningfully (for an optional heat-map overlay).
export async function pageVisualDiff(imageA, imageB) {
  const [grayA, grayB] = await Promise.all([
    downsampleLuminance(imageA.dataUrl, imageA.width, imageA.height),
    downsampleLuminance(imageB.dataUrl, imageB.width, imageB.height),
  ]);
  let diffCells = 0;
  const cells = [];
  for (let p = 0; p < grayA.length; p++) {
    const delta = Math.abs(grayA[p] - grayB[p]);
    const differs = delta > 28; // ~11% of the 0-255 range, tuned to skip anti-aliasing noise
    if (differs) { diffCells++; cells.push(p); }
  }
  const score = Math.round((diffCells / grayA.length) * 100);
  return { score, differs: score >= 2, cells, gridW: DIFF_GRID_W, gridH: DIFF_GRID_H };
}
