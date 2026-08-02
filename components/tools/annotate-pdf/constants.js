// Shared constants for the Annotate PDF workspace (components/tools/annotate-pdf/*).
export const RENDER_SCALE = 1.5;

export const HIGHLIGHT_COLORS = ['#FDE047', '#86EFAC', '#93C5FD', '#F9A8D4'];
export const INK_COLORS = ['#DC2626', '#2563EB', '#059669', '#0F172A'];

// The tool strip's tabs. Each id maps 1:1 to an annotation object `type`,
// except 'select' (pure selection/marquee/move — no object type of its own).
export const TOOLS = [
  { id: 'select', label: 'Select', icon: '🖱️' },
  { id: 'highlight', label: 'Highlight', icon: '🖍️' },
  { id: 'underline', label: 'Underline', icon: '𝐔' },
  { id: 'strikethrough', label: 'Strikethrough', icon: 'S̶' },
  { id: 'draw', label: 'Draw', icon: '✏️' },
  { id: 'text', label: 'Text', icon: '🅰️' },
  { id: 'note', label: 'Sticky Note', icon: '📝' },
  { id: 'callout', label: 'Callout', icon: '💬' },
  { id: 'shape', label: 'Shape', icon: '⬛' },
  { id: 'image', label: 'Image', icon: '🖼️' },
  { id: 'numbering', label: 'Numbering', icon: '🔢' },
  { id: 'stamp', label: 'Stamp', icon: '🖋️' },
  { id: 'signature', label: 'Signature', icon: '✍️' },
];

export const SHAPE_KIND_ICONS = {
  rectangle: '▭',
  circle: '⬭',
  arrow: '↗',
  line: '╱',
  cloud: '☁️',
  polygon: '⬠',
};

// Tools pinned to the front of the toolbar by default (the plan's
// "Favourite Tools" feature) — user pins/unpins persist to localStorage
// from there, this is only the first-run default.
export const DEFAULT_FAVORITE_TOOLS = ['select', 'highlight', 'draw', 'text'];
export const FAVORITES_STORAGE_KEY = 'annotate-pdf:favorite-tools';
