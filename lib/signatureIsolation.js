// Automatic signature isolation — lifted from SignDocumentsWorkspace.js so
// Annotate PDF's SignaturePad can offer the same "upload a photo of your
// signature, we isolate just the ink" experience without duplicating the
// pixel logic. Unlike SignDocumentsWorkspace, there's no manual-crop
// fallback UI here — when automatic isolation isn't confident, callers just
// fall back to using the uploaded image as-is (see SignaturePad.js), a
// smaller but honest scope for a secondary capture mode inside a broader
// annotation tool.

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// Makes near-white pixels transparent so only the dark ink remains.
function removeWhiteBackground(ctx, w, h) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const brightness = (r + g + b) / 3;
    if (brightness > 180) {
      const alpha = Math.max(0, 255 - (brightness - 180) * 8);
      data[i + 3] = alpha;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return imageData;
}

function findInkBoundingBox(imageData, w, h) {
  const data = imageData.data;
  const ALPHA_THRESHOLD = 40;
  let minX = w, minY = h, maxX = -1, maxY = -1, inkCount = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a > ALPHA_THRESHOLD) {
        inkCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY, inkCount };
}

function evaluateExtraction(box, w, h) {
  if (!box) return { reliable: false };
  const totalPixels = w * h;
  const bboxW = box.maxX - box.minX + 1;
  const bboxH = box.maxY - box.minY + 1;
  const bboxAreaRatio = (bboxW * bboxH) / totalPixels;
  const inkRatio = box.inkCount / totalPixels;
  if (box.inkCount < 120) return { reliable: false };
  if (bboxAreaRatio > 0.92) return { reliable: false };
  if (inkRatio / bboxAreaRatio > 0.55) return { reliable: false };
  return { reliable: true };
}

function cropCanvasToBox(canvas, box, padRatio = 0.14) {
  const w = canvas.width, h = canvas.height;
  const bboxW = box.maxX - box.minX + 1;
  const bboxH = box.maxY - box.minY + 1;
  const padX = Math.max(6, bboxW * padRatio);
  const padY = Math.max(6, bboxH * padRatio);
  const x0 = clamp(box.minX - padX, 0, w);
  const y0 = clamp(box.minY - padY, 0, h);
  const x1 = clamp(box.maxX + padX, 0, w);
  const y1 = clamp(box.maxY + padY, 0, h);
  const cw = Math.max(1, Math.round(x1 - x0));
  const ch = Math.max(1, Math.round(y1 - y0));
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, x0, y0, cw, ch, 0, 0, cw, ch);
  return out;
}

// Given a loaded <img>, returns { dataUrl, reliable, width, height } — a
// cropped, background-removed PNG when isolation is confident, or the
// original image untouched (still as a PNG data URL) when it isn't.
export function isolateSignature(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  removeWhiteBackground(ctx, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const box = findInkBoundingBox(imageData, canvas.width, canvas.height);
  const result = evaluateExtraction(box, canvas.width, canvas.height);

  if (result.reliable) {
    const cropped = cropCanvasToBox(canvas, box);
    return { dataUrl: cropped.toDataURL('image/png'), reliable: true, width: cropped.width, height: cropped.height };
  }
  return { dataUrl: canvas.toDataURL('image/png'), reliable: false, width: canvas.width, height: canvas.height };
}
