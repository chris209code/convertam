// Single source of truth for how an annotation object is described in the
// Review Panel and in export summaries (PDF/Word) — kept here, not
// duplicated in ReviewPanel.js and reviewSummaryExport.js, so the on-screen
// list and the exported rows can never drift apart.

// Types whose whole purpose is carrying a comment/message — these are the
// ones the Review Dashboard's "unresolved" count and per-row resolve toggle
// apply to. Everything else (highlight, shapes, drawings...) defaults
// `resolved: false` too (see objectTypes/index.js#stampShared) but that
// value is purely decorative for them; the dashboard only counts it here.
export const COMMENT_BEARING_TYPES = new Set(['note', 'text', 'callout', 'signature']);

export function isCommentBearing(o) {
  return COMMENT_BEARING_TYPES.has(o.type);
}

const TYPE_GROUP_LABELS = {
  highlight: 'Highlights',
  underline: 'Underlines',
  strikethrough: 'Strikethroughs',
  draw: 'Drawings',
  note: 'Notes',
  text: 'Text',
  callout: 'Callouts',
  shape: 'Shapes',
  image: 'Images',
  numbering: 'Numbered markers',
  signature: 'Signatures',
  stamp: 'Stamps',
};

// The dashboard's per-type breakdown groups on this label (collapsing all 6
// shape kinds into one "Shapes" bucket, matching how the toolbar itself
// treats shape-kind as a sub-choice of one tool, not a separate type).
export function typeGroupLabel(o) {
  return TYPE_GROUP_LABELS[o.type] || o.type;
}

function cap(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

// One-line snippet: the Review Panel row text and the exported summary's
// "Comment" column both call this directly.
export function describeObject(o) {
  if (o.type === 'note' || o.type === 'text' || o.type === 'callout') {
    return o.text?.trim() || '(empty)';
  }
  if (o.type === 'shape') return `${cap(o.shapeKind)} shape`;
  if (o.type === 'stamp') return o.label ? `"${o.label}" stamp` : 'Stamp';
  if (o.type === 'signature') return o.kind === 'initials' ? 'Initials' : 'Signature';
  if (o.type === 'image') return 'Inserted image';
  if (o.type === 'numbering') return `Marker #${o.number ?? ''}`;
  if (o.type === 'highlight') return 'Highlighted text';
  if (o.type === 'underline') return 'Underlined text';
  if (o.type === 'strikethrough') return 'Struck-through text';
  if (o.type === 'draw') return 'Freehand drawing';
  return cap(o.type);
}
