'use client';

import { sampleStyleNear } from '../redact-edit/fontMatch';
import { RENDER_SCALE } from './constants';

const FAMILY_LABEL = { sans: 'Helvetica', serif: 'Times Roman', mono: 'Courier' };

// Tier 2/3 font matching: given a click position and the page's cached
// pdf.js textContent/canvas, returns a detected style patch plus honest
// chip copy — never "Font matched" (that implies the exact font was found
// and reused, which isn't what's happening — see fontMatch.js's own header
// comment on what pdf.js's public API can and can't reliably tell us).
// Three outcomes:
//  - a scanned/image-only page (no usable text layer at all): says so
//    plainly rather than staying silent about why nothing was detected.
//  - a nearby text item was found: "Closest match: {Family}{ Bold}{ Italic}
//    · {size}pt".
//  - nothing nearby (a blank part of a normal page): no chip at all — a
//    silent default is honest here, there's nothing to report.
export function detectStyleAt(posPage, page) {
  if (!page.textContent || !page.textContent.items?.length) {
    return { style: null, chipText: 'No embedded text detected — using a close default' };
  }
  const guess = sampleStyleNear(posPage, page.textContent, page.canvas, page.height, RENDER_SCALE);
  if (!guess) return { style: null, chipText: null };
  const familyLabel = FAMILY_LABEL[guess.fontFamily] || 'Helvetica';
  const weightStyle = [guess.bold && 'Bold', guess.italic && 'Italic'].filter(Boolean).join(' ');
  // guess.fontSizePx is in page-space px (RENDER_SCALE-multiplied, the unit
  // every placed object's own fontSize is authored in) — dividing back out
  // here is display-only, so the chip reports the source PDF's actual point
  // size instead of a render-scale-inflated number.
  const displayPt = Math.round((guess.fontSizePx / RENDER_SCALE) * 10) / 10;
  const chipText = `Closest match: ${familyLabel}${weightStyle ? ' ' + weightStyle : ''} · ${displayPt}pt`;
  return { style: guess, chipText };
}

// Reads a single real pixel from the rendered page just above the matched
// text's own box — used by the "Cover and replace visually" click-menu
// option to pick a patch color that actually matches the local page
// background, rather than assuming white. Deliberately simple (one pixel,
// not a region average): honest about being an approximation, and a single
// sample from just outside the text's own ink is usually background.
export function sampleBackgroundColor(canvas, box) {
  try {
    const ctx = canvas.getContext('2d');
    const x = Math.max(0, Math.round(box.x + box.w / 2));
    const y = Math.max(0, Math.round(box.y - 3));
    const d = ctx.getImageData(x, y, 1, 1).data;
    return '#' + [d[0], d[1], d[2]].map((c) => c.toString(16).padStart(2, '0')).join('');
  } catch {
    return '#FFFFFF';
  }
}

// Small floating badge shown right after a click, before typing starts.
// Positioned in the same page-space coordinates as everything else in
// Stage.js — no separate conversion needed, since it lives inside the same
// CSS `transform: scale()` wrapper and gets scaled along with it.
export function StyleMatchChip({ text, x, y }) {
  if (!text) return null;
  return (
    <div
      style={{
        position: 'absolute', left: x, top: y, transform: 'translateY(-100%)',
        background: '#0F172A', color: 'white', fontSize: 12, fontWeight: 600,
        padding: '4px 8px', borderRadius: 6, whiteSpace: 'nowrap', pointerEvents: 'none',
        boxShadow: '0 2px 8px rgba(15,23,42,0.25)', zIndex: 30,
      }}
    >
      {text}
    </div>
  );
}
