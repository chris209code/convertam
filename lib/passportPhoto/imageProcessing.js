// Pure pixel-level operations for Passport Photo Studio — background
// removal, adjustments, and the honest "does the output actually match the
// background requirement" check. Everything here runs on ImageData already
// in memory; no network calls, no server processing.

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#FFFFFF');
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 };
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

// Flood-fills from the four corners — a BFS over pixels connected to a seed
// AND close in color to that seed's ORIGINAL reference color (not to
// whatever pixel happens to be adjacent). Comparing to a stable reference
// color, rather than neighbor-to-neighbor, matters because real photos are
// full of soft gradients and anti-aliased edges: a neighbor-to-neighbor
// comparison "drifts" through those gradients one small step at a time and
// can leak straight through the subject's own edge into the rest of the
// photo. Requiring closeness to the seed color keeps the fill honestly
// limited to pixels that actually look like the background.
export function detectBackgroundMask(imageData, { tolerance = 38 } = {}) {
  const { width, height, data } = imageData;
  const mask = new Uint8ClampedArray(width * height); // 255 = background
  const visited = new Uint8Array(width * height);
  const seedPoints = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [Math.floor(width / 2), 0], [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
  ];

  // One shared reference color per connected-component run: each seed
  // starts its own BFS using its own corner/edge color as the reference,
  // so a light background and a slightly different-toned corner still both
  // get picked up without needing one single global average.
  const queue = [];
  for (const [sx, sy] of seedPoints) {
    const idx = sy * width + sx;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const o = idx * 4;
    queue.push({ idx, refR: data[o], refG: data[o + 1], refB: data[o + 2] });
  }

  while (queue.length) {
    const { idx, refR, refG, refB } = queue.pop();
    const x = idx % width;
    const y = (idx / width) | 0;
    mask[idx] = 255;

    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nIdx = ny * width + nx;
      if (visited[nIdx]) continue;
      const no = nIdx * 4;
      if (colorDistance(refR, refG, refB, data[no], data[no + 1], data[no + 2]) <= tolerance) {
        visited[nIdx] = 1;
        queue.push({ idx: nIdx, refR, refG, refB });
      }
    }
  }

  // Soft-feather the mask edge with a small box blur so the background swap
  // doesn't leave a hard, obviously-cut-out edge around the subject.
  return boxBlurMask(mask, width, height, 2);
}

function boxBlurMask(mask, width, height, radius) {
  const out = new Uint8ClampedArray(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          sum += mask[ny * width + nx];
          count++;
        }
      }
      out[y * width + x] = sum / count;
    }
  }
  return out;
}

// Blends masked (background) pixels toward the target color, proportional
// to the mask's feathered alpha — foreground pixels (mask ~0) are untouched.
export function applyBackgroundColor(imageData, mask, colorHex) {
  const { r, g, b } = hexToRgb(colorHex);
  const { width, height, data } = imageData;
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < width * height; i++) {
    const alpha = mask[i] / 255;
    if (alpha <= 0) continue;
    const o = i * 4;
    out[o] = out[o] * (1 - alpha) + r * alpha;
    out[o + 1] = out[o + 1] * (1 - alpha) + g * alpha;
    out[o + 2] = out[o + 2] * (1 - alpha) + b * alpha;
  }
  return new ImageData(out, width, height);
}

// brightness/contrast/warmth: -100..100. sharpen: 0..100.
export function applyAdjustments(imageData, { brightness = 0, contrast = 0, warmth = 0, sharpen = 0 } = {}) {
  let { width, height, data } = imageData;
  let out = new Uint8ClampedArray(data);

  const brightOffset = brightness * 1.8;
  const contrastFactor = (259 * (contrast * 2.55 + 255)) / (255 * (259 - contrast * 2.55));
  const warmR = warmth > 0 ? warmth * 0.6 : 0;
  const warmB = warmth < 0 ? -warmth * 0.6 : 0;
  const coolB = warmth > 0 ? -warmth * 0.3 : 0;
  const coolR = warmth < 0 ? warmth * 0.3 : 0;

  for (let i = 0; i < out.length; i += 4) {
    let r = out[i], g = out[i + 1], b = out[i + 2];
    r = contrastFactor * (r - 128) + 128 + brightOffset + warmR + coolR;
    g = contrastFactor * (g - 128) + 128 + brightOffset;
    b = contrastFactor * (b - 128) + 128 + brightOffset + warmB + coolB;
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }

  if (sharpen > 0) {
    out = unsharpMask(out, width, height, sharpen / 100);
  }

  return new ImageData(out, width, height);
}

function unsharpMask(data, width, height, amount) {
  // 3x3 blur, then push each pixel away from its blurred value — a cheap,
  // dependency-free approximation of an unsharp mask, adequate for the
  // gentle sharpening a headshot needs (not a general-purpose filter).
  const blurred = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0, count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            sum += data[(ny * width + nx) * 4 + c];
            count++;
          }
        }
        blurred[(y * width + x) * 4 + c] = sum / count;
      }
    }
  }
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = data[i + c];
      const blur = blurred[i + c];
      out[i + c] = orig + (orig - blur) * amount * 2;
    }
  }
  return out;
}

// Genuinely checks the FINAL composited output against the required
// background color by sampling its margins — this is what lets the UI say
// "background verified" instead of just assuming the removal worked.
export function checkBackgroundMatch(imageData, targetHex, marginFraction = 0.04) {
  const { width, height, data } = imageData;
  const target = hexToRgb(targetHex);
  const marginX = Math.max(2, Math.round(width * marginFraction));
  const marginY = Math.max(2, Math.round(height * marginFraction));
  let sumR = 0, sumG = 0, sumB = 0, count = 0, maxDelta = 0;

  function sample(x, y) {
    const o = (y * width + x) * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    sumR += r; sumG += g; sumB += b; count++;
    maxDelta = Math.max(maxDelta, colorDistance(r, g, b, target.r, target.g, target.b));
  }

  for (let x = 0; x < width; x += 3) {
    sample(x, 0); sample(x, marginY - 1 >= 0 ? marginY - 1 : 0);
    sample(x, height - 1); sample(x, Math.max(0, height - marginY));
  }
  for (let y = 0; y < height; y += 3) {
    sample(0, y); sample(Math.min(width - 1, marginX - 1 >= 0 ? marginX - 1 : 0), y);
    sample(width - 1, y); sample(Math.max(0, width - marginX), y);
  }

  const avg = { r: Math.round(sumR / count), g: Math.round(sumG / count), b: Math.round(sumB / count) };
  const avgDistance = colorDistance(avg.r, avg.g, avg.b, target.r, target.g, target.b);
  return { avgHex: `#${[avg.r, avg.g, avg.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`, avgDistance, maxDelta, matches: avgDistance <= 24 };
}
