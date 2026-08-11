import { getCachedMeasureFont, measureTextWidthPagePx } from '@/components/shared/fontResolver';
import { RENDER_SCALE } from './constants';

const MIN_FIT_FONT_SIZE = 8;

// Auto Text Fit: shrink-to-fit against a detected underline-blank's own
// width, using the exact same measurement-font cache Phase 2's style
// matching already warms (see fontResolver.js) — never the browser's own
// canvas/CSS text metrics, which is what keeps this in agreement with both
// the on-screen preview and the real pdf-lib export. Only text objects
// placed against a *specific* matched blank carry a `fitWidth` (set in
// Stage.js's placeStyledText/handleCoverAndReplace from the match's own
// box.w) — free-positioned text was never asked to fit anything, so it's
// returned unmodified.
export function fitFontSize(obj) {
  if (!obj.fitWidth || !obj.text) return obj.fontSize;
  const font = getCachedMeasureFont(obj);
  if (!font) return obj.fontSize; // measurement fonts not warmed yet — next render has it
  const displayText = obj.uppercase ? obj.text.toUpperCase() : obj.text;
  let size = obj.fontSize;
  while (size > MIN_FIT_FONT_SIZE) {
    const width = measureTextWidthPagePx(font, displayText, size, RENDER_SCALE);
    if (width <= obj.fitWidth) break;
    size -= 1;
  }
  return size;
}
