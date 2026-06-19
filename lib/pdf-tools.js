import { PDFDocument, degrees } from 'pdf-lib';

export async function mergePdfs(files) {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const src = await PDFDocument.load(bytes);
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}

export async function splitPdf(file) {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const count = src.getPageCount();
  const results = [];
  for (let i = 0; i < count; i++) {
    const doc = await PDFDocument.create();
    const [page] = await doc.copyPages(src, [i]);
    doc.addPage(page);
    const bytesOut = await doc.save();
    results.push({ name: `page-${i + 1}.pdf`, bytes: bytesOut });
  }
  return results;
}

export async function rotatePdf(file, degreesAmount) {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  doc.getPages().forEach((page) => {
    const current = page.getRotation().angle;
    page.setRotation(degrees(current + degreesAmount));
  });
  return doc.save();
}

export function parseRange(rangeStr, totalPages) {
  const indices = new Set();
  rangeStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      if (part.includes('-')) {
        let [a, b] = part.split('-').map((n) => parseInt(n.trim(), 10));
        if (Number.isNaN(a)) a = 1;
        if (Number.isNaN(b)) b = totalPages;
        for (let i = a; i <= b; i++) {
          if (i >= 1 && i <= totalPages) indices.add(i - 1);
        }
      } else {
        const n = parseInt(part, 10);
        if (!Number.isNaN(n) && n >= 1 && n <= totalPages) indices.add(n - 1);
      }
    });
  return Array.from(indices).sort((a, b) => a - b);
}

export async function extractPages(file, rangeStr, totalPages) {
  const bytes = await file.arrayBuffer();
  const src = await PDFDocument.load(bytes);
  const indices = parseRange(rangeStr, totalPages);
  if (indices.length === 0) {
    throw new Error('No valid pages matched that range.');
  }
  const doc = await PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}

export async function imagesToPdf(files) {
  const doc = await PDFDocument.create();
  for (const file of files) {
    const bytes = await file.arrayBuffer();
    const isPng = file.type.includes('png');
    const img = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
    const page = doc.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
  }
  return doc.save();
}

export async function getPdfPageCount(file) {
  const bytes = await file.arrayBuffer();
  const doc = await PDFDocument.load(bytes);
  return doc.getPageCount();
}
