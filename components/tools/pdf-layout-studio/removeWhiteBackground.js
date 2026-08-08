'use client';

// Strips a near-white background from an uploaded letterhead/logo image by
// flood-filling inward from its four edges — only pixels connected to the
// border get made transparent, so a white pixel *inside* the design (the
// counter of a letter, a white stripe in a logo) is left alone. This is the
// same "magic wand from the edges" trick most background-removal tools use
// for a plain-color background; it can't separate a subject from a
// background that isn't a single connected color region (that needs real
// segmentation, which no client-side canvas trick can do) — so a photo, a
// gradient background, or a background that isn't close to white won't be
// handled well here. `feather` softens the cutoff into partial transparency
// near the threshold so the edge doesn't come out with hard aliased pixels.
export function removeWhiteBackground(srcDataUrl, { threshold = 235, feather = 30 } = {}) {
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
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const visited = new Uint8Array(width * height);
        const stack = [];
        const pushSeed = (x, y) => { stack.push(x); stack.push(y); };
        for (let x = 0; x < width; x++) { pushSeed(x, 0); pushSeed(x, height - 1); }
        for (let y = 0; y < height; y++) { pushSeed(0, y); pushSeed(width - 1, y); }

        while (stack.length) {
          const y = stack.pop();
          const x = stack.pop();
          if (x < 0 || y < 0 || x >= width || y >= height) continue;
          const idx = y * width + x;
          if (visited[idx]) continue;
          visited[idx] = 1;
          const i = idx * 4;
          const minChannel = Math.min(data[i], data[i + 1], data[i + 2]);
          if (minChannel < threshold - feather) continue; // not white enough — flood stops here
          if (minChannel >= threshold) {
            data[i + 3] = 0;
          } else {
            const t = (minChannel - (threshold - feather)) / feather; // 0..1, closer to 1 = whiter
            data[i + 3] = Math.round(data[i + 3] * (1 - t));
          }
          pushSeed(x + 1, y); pushSeed(x - 1, y); pushSeed(x, y + 1); pushSeed(x, y - 1);
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };
    img.src = srcDataUrl;
  });
}
