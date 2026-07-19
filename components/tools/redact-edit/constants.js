// A deliberately small, curated set of fonts: each one maps to a
// universally-available system font, so what's rendered on screen (CSS)
// and what's rasterized into the exported PDF (canvas 2D, same browser
// engine) always match. Offering arbitrary web fonts would break that
// guarantee, since the exported PDF has no way to load them.
export const FONT_OPTIONS = [
  { id: 'sans', label: 'Helvetica', css: 'Helvetica, Arial, sans-serif' },
  { id: 'serif', label: 'Times New Roman', css: '"Times New Roman", Times, serif' },
  { id: 'mono', label: 'Courier New', css: '"Courier New", Courier, monospace' },
];

export const FONT_CSS = FONT_OPTIONS.reduce((acc, f) => { acc[f.id] = f.css; return acc; }, {});

export function cssFontFamily(id) {
  return FONT_CSS[id] || FONT_CSS.sans;
}

export const DEFAULT_TEXT_STYLE = {
  fontFamily: 'sans',
  fontSizePx: 24,
  bold: false,
  italic: false,
  underline: false,
  color: '#111827',
  align: 'left',
  lineHeight: 1.25,
  letterSpacing: 0,
};
