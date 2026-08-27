// Client-side OCR for scanned/photographed payslips — Tesseract.js runs
// entirely as WASM in the browser, so a page's actual pixel content never
// leaves it; only the OCR engine itself (like pdf.js's worker elsewhere in
// this codebase) loads from a CDN once, not the user's document. Returns
// each page's recognized words with their own (x, y) position — the same
// {str, x, y} shape pdfLayout-style text items use — so layoutExtract.js
// can run its row/column reconstruction on OCR output exactly the same way
// it does on a real PDF text layer.
export class OcrError extends Error {}

// One worker reused across every page of a single upload rather than
// spun up per page — loading the engine/traineddata is the slow part.
export async function ocrPages(canvases, { onPageStart } = {}) {
  const { createWorker } = await import('tesseract.js');
  let worker;
  try {
    worker = await createWorker('eng');
  } catch (err) {
    console.error('OCR engine failed to load:', err);
    throw new OcrError('Could not load the OCR engine. Check your connection and try again, or use the AI extraction fallback.');
  }

  const pagesItems = [];
  try {
    for (let i = 0; i < canvases.length; i++) {
      onPageStart?.(i + 1, canvases.length);
      const { data } = await worker.recognize(canvases[i]);
      const words = (data?.words || []).map((w) => ({
        str: w.text || '',
        x: (w.bbox.x0 + w.bbox.x1) / 2,
        y: (w.bbox.y0 + w.bbox.y1) / 2,
      })).filter((w) => w.str.trim());
      pagesItems.push(words);
    }
  } catch (err) {
    console.error('OCR recognition failed:', err);
    throw new OcrError('Could not read this document with OCR. Try a clearer photo/scan, or use the AI extraction fallback.');
  } finally {
    await worker.terminate();
  }
  return pagesItems;
}
