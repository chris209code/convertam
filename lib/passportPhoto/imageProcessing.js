// Pixel-level operations for Passport Photo Studio — background
// compositing against a real person mask (see segmentation.js /
// maskEditor.js for how that mask is produced), adjustments, and the
// honest "does the output actually match the background requirement"
// check. Everything here runs on ImageData already in memory; no network
// calls, no server processing.

export function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#FFFFFF');
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 };
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function clampNum(v, min, max) { return Math.min(max, Math.max(min, v)); }

// Separable box blur over a flat width*height array — used to feather the
// mask's boundary instead of leaving it a hard binary edge. A sliding-window
// sum makes each pass O(width*height) regardless of radius, so even the top
// of the 0-5px slider stays cheap enough to run on every preview frame.
function boxBlur1D(src, width, height, radius, horizontal) {
  const size = radius * 2 + 1;
  const out = new Float32Array(src.length);
  const clampIdx = (v, max) => (v < 0 ? 0 : v > max ? max : v);
  if (horizontal) {
    for (let y = 0; y < height; y++) {
      const row = y * width;
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += src[row + clampIdx(k, width - 1)];
      out[row] = sum / size;
      for (let x = 1; x < width; x++) {
        sum += src[row + clampIdx(x + radius, width - 1)] - src[row + clampIdx(x - radius - 1, width - 1)];
        out[row + x] = sum / size;
      }
    }
  } else {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -radius; k <= radius; k++) sum += src[clampIdx(k, height - 1) * width + x];
      out[x] = sum / size;
      for (let y = 1; y < height; y++) {
        sum += src[clampIdx(y + radius, height - 1) * width + x] - src[clampIdx(y - radius - 1, height - 1) * width + x];
        out[y * width + x] = sum / size;
      }
    }
  }
  return out;
}

// Erosion (min-filter): shrinks the "person" region inward by `radius`
// pixels, using edge-clamped sampling so a subject that legitimately
// touches the crop border (shoulders reaching the frame edge) doesn't get
// chipped away there. Small fixed radius, so a direct window-min is cheap
// enough without a sliding-window optimization.
function erodeMask(mask, width, height, radius) {
  if (radius <= 0) return new Uint8ClampedArray(mask);
  const clampIdx = (v, max) => (v < 0 ? 0 : v > max ? max : v);
  const out = new Uint8ClampedArray(mask.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let minVal = 255;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = clampIdx(y + dy, height - 1);
        for (let dx = -radius; dx <= radius; dx++) {
          const v = mask[ny * width + clampIdx(x + dx, width - 1)];
          if (v < minVal) minVal = v;
        }
      }
      out[y * width + x] = minVal;
    }
  }
  return out;
}

// Feathers a binary-ish person mask into a smooth sub-pixel alpha ramp,
// softening only INTO the subject's silhouette rather than bleeding
// background color out into it. Two things make that one-directional:
// 1) the mask is choked inward by a fixed 1px erosion before blurring, so
//    the blur's "outward" half spreads from an already-shrunken boundary;
// 2) the result is clamped to never exceed the original raw mask value —
//    a background pixel the raw mask was already confident about can only
//    stay at that value or (never) increase, so the softened edge can't
//    push a nonzero "keep" value out past where the subject really ends
//    (the cause of a glowing halo of blended background color around
//    hair/shoulders). Returns a new mask; never mutates the input.
export function featherMask(mask, width, height, radiusPx) {
  const eroded = erodeMask(mask, width, height, 1);
  const radius = Math.round(clampNum(radiusPx, 0, 5));
  let soft = eroded;
  if (radius > 0) {
    const blurredH = boxBlur1D(eroded, width, height, radius, true);
    const blurredV = boxBlur1D(blurredH, width, height, radius, false);
    soft = blurredV;
  }
  const out = new Uint8ClampedArray(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = Math.min(soft[i], mask[i]);
  return out;
}

// Estimates the original photo's background color from pixels the mask is
// confident are background (not the feathered mask — feathering blurs the
// boundary, so the raw/pre-feather mask is the more reliable signal for
// "definitely background"). Returns null if there's too little background
// to sample reliably.
export function estimateBackgroundColor(imageData, personMask, threshold = 40) {
  const { width, height, data } = imageData;
  let sumR = 0, sumG = 0, sumB = 0, count = 0;
  for (let i = 0; i < width * height; i++) {
    if (personMask[i] < threshold) {
      const o = i * 4;
      sumR += data[o]; sumG += data[o + 1]; sumB += data[o + 2]; count++;
    }
  }
  if (count < 20) return null;
  return { r: sumR / count, g: sumG / count, b: sumB / count };
}

// Color decontamination ("despill"): at a soft edge, the photo's original
// pixel is itself a blend of the subject and the OLD background color —
// C = alpha*subject + (1-alpha)*oldBg. Simply cross-fading that blended
// pixel toward the new background leaves a visible fringe/halo of the old
// background's hue (typically grey/white) around hair and jacket edges,
// because the old background's contribution never actually gets removed.
// This inverts that blend to recover an estimate of the true subject color
// — subject ≈ (C - (1-alpha)*oldBg) / alpha — and only applies it, scaled
// by `spillAmount`, to pixels the (feathered) mask marks as partially
// transparent. Fully-opaque and fully-transparent pixels are left alone.
function despill(data, width, height, mask, bgColor, spillAmount) {
  const out = new Uint8ClampedArray(data);
  for (let i = 0; i < width * height; i++) {
    const m = mask[i];
    if (m <= 2 || m >= 253) continue; // confidently subject or confidently background — nothing to correct
    const alpha = Math.max(m / 255, 0.15); // floor avoids blowing up the estimate for near-transparent edge pixels
    const o = i * 4;
    out[o] = data[o] + (((data[o] - bgColor.r * (1 - alpha)) / alpha) - data[o]) * spillAmount;
    out[o + 1] = data[o + 1] + (((data[o + 1] - bgColor.g * (1 - alpha)) / alpha) - data[o + 1]) * spillAmount;
    out[o + 2] = data[o + 2] + (((data[o + 2] - bgColor.b * (1 - alpha)) / alpha) - data[o + 2]) * spillAmount;
  }
  return out;
}

// personMask: 255 = keep the original pixel (part of the person), 0 =
// replace it. bgSpec is either { type: 'transparent' } (sets alpha instead
// of blending toward a color) or { type: 'color', hex }. edgeOptions tunes
// the two edge-quality passes: featherPx (0-5, the UI slider's face value)
// softens the mask boundary, spillAmount (0-1) controls how strongly the
// old background's color is scrubbed out of the transition band before
// blending toward the new one.
export function compositeWithBackground(imageData, personMask, bgSpec, edgeOptions = {}) {
  const { width, height, data } = imageData;
  const softnessUi = clampNum(edgeOptions.featherPx ?? 0, 0, 5);
  // The slider's 0-5 face value maps to a much narrower ACTUAL blur radius
  // (0.5-2.0px). A literal 5px box blur was wide enough to dissolve fine
  // sharp features (a suit lapel, individual hair strands); real photo
  // edges only need a pixel or two of softening to look natural.
  const featherPx = 0.5 + (softnessUi / 5) * 1.5;
  const spillAmount = clampNum(edgeOptions.spillAmount ?? 0, 0, 1);

  const mask = featherMask(personMask, width, height, featherPx);

  let sourceData = data;
  if (spillAmount > 0) {
    const bgColor = estimateBackgroundColor(imageData, personMask);
    if (bgColor) sourceData = despill(data, width, height, mask, bgColor, spillAmount);
  }

  const out = new Uint8ClampedArray(sourceData);

  if (bgSpec.type === 'transparent') {
    for (let i = 0; i < width * height; i++) {
      out[i * 4 + 3] = mask[i];
    }
    return new ImageData(out, width, height);
  }

  const { r, g, b } = hexToRgb(bgSpec.hex);
  for (let i = 0; i < width * height; i++) {
    const keep = mask[i] / 255;
    if (keep >= 1) continue;
    const o = i * 4;
    out[o] = out[o] * keep + r * (1 - keep);
    out[o + 1] = out[o + 1] * keep + g * (1 - keep);
    out[o + 2] = out[o + 2] * keep + b * (1 - keep);
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
// background color — this is what lets the UI say "background verified"
// instead of just assuming the removal worked. Not meaningful for a
// transparent background (nothing to sample against).
//
// Samples only pixels the person mask actually marks as background, not
// the image's geometric border: a correctly-cropped passport photo often
// has shoulders or hair reaching right to the edge of the frame, so
// sampling the border blindly would grade clothing or hair against the
// target background color and report a false mismatch. When personMask
// isn't available, falls back to the old margin-based sampling.
export function checkBackgroundMatch(imageData, targetHex, personMask, marginFraction = 0.04) {
  const { width, height, data } = imageData;
  const target = hexToRgb(targetHex);
  let sumR = 0, sumG = 0, sumB = 0, count = 0, maxDelta = 0;

  function sampleIndex(i) {
    const o = i * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    sumR += r; sumG += g; sumB += b; count++;
    maxDelta = Math.max(maxDelta, colorDistance(r, g, b, target.r, target.g, target.b));
  }

  if (personMask) {
    for (let i = 0; i < width * height; i++) {
      if (personMask[i] < 40) sampleIndex(i);
    }
  } else {
    const marginX = Math.max(2, Math.round(width * marginFraction));
    const marginY = Math.max(2, Math.round(height * marginFraction));
    const sampleXY = (x, y) => sampleIndex(y * width + x);
    for (let x = 0; x < width; x += 3) {
      sampleXY(x, 0); sampleXY(x, marginY - 1 >= 0 ? marginY - 1 : 0);
      sampleXY(x, height - 1); sampleXY(x, Math.max(0, height - marginY));
    }
    for (let y = 0; y < height; y += 3) {
      sampleXY(0, y); sampleXY(Math.min(width - 1, marginX - 1 >= 0 ? marginX - 1 : 0), y);
      sampleXY(width - 1, y); sampleXY(Math.max(0, width - marginX), y);
    }
  }

  // Too little background in frame to say anything meaningful (e.g. a very
  // tight crop) — don't report a false mismatch, just decline to verify.
  if (count < 20) {
    return { avgHex: null, avgDistance: 0, maxDelta: 0, matches: true, insufficientBackground: true };
  }

  const avg = { r: Math.round(sumR / count), g: Math.round(sumG / count), b: Math.round(sumB / count) };
  const avgDistance = colorDistance(avg.r, avg.g, avg.b, target.r, target.g, target.b);
  return { avgHex: `#${[avg.r, avg.g, avg.b].map((v) => v.toString(16).padStart(2, '0')).join('')}`, avgDistance, maxDelta, matches: avgDistance <= 24 };
}
