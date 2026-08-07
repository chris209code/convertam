import { StandardFonts } from 'pdf-lib';
import { cssFontFamily } from '@/components/tools/redact-edit/constants';

// Maps {family bucket, bold, italic} to a pdf-lib StandardFonts entry for
// export, and (via the re-exported cssFontFamily) to a CSS font-family
// string for on-screen DOM rendering. This is deliberately "closest
// available standard font," not real embedded-font reuse — a PDF's actual
// embedded font program is typically subsetted and isn't practically
// re-extractable via pdf.js/pdf-lib's public APIs, so promising exact-font
// reuse would be dishonest. Matching the source document's family/weight/
// style bucket this closely is the realistic ceiling, and it's exactly the
// fallback behavior real font-matching tools describe as the common case.
//
// Originally built for Write on PDF, moved here (matching the precedent
// already set by useObjectHistory.js/useKeyboardShortcuts.js/
// coordinateTransform.js/ThumbnailRail.js) once PDF Layout Studio needed
// the identical resolver. The one thing that varies by caller — each tool's
// own page-render scale — is now a parameter instead of an import, so this
// module has no dependency on any one tool's constants.
const STANDARD_FONT_TABLE = {
  sans: {
    regular: StandardFonts.Helvetica, bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique, boldItalic: StandardFonts.HelveticaBoldOblique,
  },
  serif: {
    regular: StandardFonts.TimesRoman, bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic, boldItalic: StandardFonts.TimesRomanBoldItalic,
  },
  mono: {
    regular: StandardFonts.Courier, bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique, boldItalic: StandardFonts.CourierBoldOblique,
  },
};

export function standardFontFor({ fontFamily = 'sans', bold = false, italic = false }) {
  const family = STANDARD_FONT_TABLE[fontFamily] || STANDARD_FONT_TABLE.sans;
  const key = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
  return family[key];
}

// A small embed cache keyed by StandardFonts value — export can place many
// text objects that all resolve to the same font, and pdf-lib only needs
// (and should only pay the cost of) embedding each distinct one once per
// document.
export function createFontEmbedCache(pdfDoc) {
  const cache = new Map();
  return async function embedFor(style) {
    const std = standardFontFor(style);
    if (!cache.has(std)) cache.set(std, await pdfDoc.embedFont(std));
    return cache.get(std);
  };
}

// Preview/export metric consistency: on-screen layout decisions (auto-fit,
// center/right alignment offsets, initial box sizing) must use the same
// widths pdf-lib will use at export, not the browser's own font-rendering
// metrics — those can diverge enough (different name, different hinting)
// to shift centering or blow an auto-fit threshold between what's shown
// and what's downloaded. A StandardFonts entry's glyph widths are a fixed
// table baked into pdf-lib, not dependent on which PDFDocument embedded it,
// so a single lightweight "measurement" document — created once, never
// exported — can supply the exact same numbers export will later use, all
// synchronously after one warm-up pass.
let _measureDocPromise = null;
const _measureFontCache = new Map(); // StandardFonts value -> embedded PDFFont

async function getMeasureDoc() {
  if (!_measureDocPromise) {
    _measureDocPromise = (async () => {
      const { PDFDocument } = await import('pdf-lib');
      return PDFDocument.create();
    })();
  }
  return _measureDocPromise;
}

// Embeds all 12 family x weight x style combinations once, up front, so
// later layout decisions (made per-keystroke, per-click) can look them up
// synchronously via getCachedMeasureFont instead of awaiting per call.
export async function warmMeasurementFonts() {
  const doc = await getMeasureDoc();
  const allStd = new Set();
  ['sans', 'serif', 'mono'].forEach((fontFamily) => {
    [false, true].forEach((bold) => {
      [false, true].forEach((italic) => {
        allStd.add(standardFontFor({ fontFamily, bold, italic }));
      });
    });
  });
  await Promise.all([...allStd].map(async (std) => {
    if (!_measureFontCache.has(std)) _measureFontCache.set(std, await doc.embedFont(std));
  }));
}

// Synchronous lookup — returns null if warmMeasurementFonts() hasn't
// resolved yet (a brief window right after a PDF loads); callers should
// treat a null return as "skip metric-driven positioning this render,"
// not as an error, since the next re-render (moments later) will have it.
export function getCachedMeasureFont(style) {
  return _measureFontCache.get(standardFontFor(style)) || null;
}

// The single source of truth for "how wide is this text," in page-space
// (renderScale-multiplied) pixels — used identically by the on-screen
// preview (via getCachedMeasureFont) and the real export path (via the
// document-specific font from createFontEmbedCache), since a StandardFonts
// entry's metrics don't vary by which document embedded it. `renderScale`
// defaults to 1.5 (every current caller's page-render scale) but is a
// parameter, not an import, so this module stays caller-agnostic.
export function measureTextWidthPagePx(font, text, fontSizePagePx, renderScale = 1.5) {
  if (!font || !text) return 0;
  const sizePt = fontSizePagePx / renderScale;
  return font.widthOfTextAtSize(text, sizePt) * renderScale;
}

export { cssFontFamily };
