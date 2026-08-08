'use client';

// Looks at a letterhead image's actual alpha channel to tell "a plain
// header graphic" apart from "a bordered design with header art up top,
// footer art at the bottom, and a transparent gap in between meant for the
// real letter content" — Push Down mode (pdfExport.js) uses this so a
// bordered letterhead only reserves its real header height instead of its
// entire bounding box, letting content land in that gap instead of being
// squeezed into whatever sliver is left below the whole image.
//
// Returns null when the image has no meaningful transparency anywhere
// (a plain opaque JPG/PNG that was never run through background removal,
// or a real transparent PNG with no gap) — callers should fall back to
// treating the whole image height as one solid band, which is the
// existing, still-correct behavior for a simple header-only letterhead.
export function detectContentBands(srcDataUrl, { alphaThreshold = 10 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('Could not load image'));
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const { width, height } = canvas;
        const { data } = ctx.getImageData(0, 0, width, height);

        const rowHasContent = new Uint8Array(height);
        let anyTransparency = false;
        for (let y = 0; y < height; y++) {
          let hasContent = false;
          const rowStart = y * width * 4;
          for (let x = 0; x < width; x++) {
            const alpha = data[rowStart + x * 4 + 3];
            if (alpha < 255) anyTransparency = true;
            if (alpha > alphaThreshold) { hasContent = true; break; }
          }
          rowHasContent[y] = hasContent ? 1 : 0;
        }

        if (!anyTransparency) { resolve(null); return; }

        // A gap has to be a meaningful fraction of the image (not a couple
        // of anti-aliased rows) before it counts as "there's real blank
        // space here," so scans down (or up) a run of opaque rows until
        // that many consecutive empty rows show up.
        const gapThreshold = Math.max(16, Math.round(height * 0.04));

        function scanFrom(start, step) {
          let lastContentRow = -1;
          let gapRun = 0;
          for (let i = start; i >= 0 && i < height; i += step) {
            if (rowHasContent[i]) { lastContentRow = i; gapRun = 0; } else {
              gapRun++;
              if (lastContentRow !== -1 && gapRun >= gapThreshold) break;
            }
          }
          return lastContentRow;
        }

        const topLastRow = scanFrom(0, 1);
        const bottomLastRow = scanFrom(height - 1, -1);

        // No real gap separating a top region from a bottom region (the
        // "content" found scanning from each end overlaps or touches) —
        // there's nothing to split, so treat it as one plain band like a
        // non-transparent image would be.
        if (topLastRow === -1 || bottomLastRow === -1 || topLastRow >= bottomLastRow) {
          resolve({ topContentHeight: height, bottomContentHeight: 0, naturalWidth: width, naturalHeight: height });
          return;
        }

        resolve({
          topContentHeight: topLastRow + 1,
          bottomContentHeight: height - bottomLastRow,
          naturalWidth: width,
          naturalHeight: height,
        });
      } catch (err) {
        reject(err);
      }
    };
    img.src = srcDataUrl;
  });
}
