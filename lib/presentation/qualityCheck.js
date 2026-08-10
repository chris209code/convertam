// Local (non-AI) quality validation, run entirely client-side against the
// current object array before export. Every check here is deterministic
// geometry/text math — no Gemini call is ever appropriate for this, per
// the cost-control architecture. "Fix Automatically" only ever applies
// fixes that are safe and unambiguous: shrink oversized text, clamp
// out-of-bounds objects back onto the slide, and reposition overlapping
// objects — but only when a genuinely non-overlapping placement actually
// fits on the slide (two large boxes, e.g. right after duplicating a
// full-width content box, often can't both fit without shrinking one, so
// that case is reported as autoFixable:false rather than "fixed" into a
// smaller but still-overlapping result). Findings with no safe
// deterministic fix (missing title, missing visual hierarchy, oversized
// overlaps) are reported but left for the user to resolve by hand.

import { SLIDE_W, SLIDE_H } from './layoutEngine';

const MIN_FONT_SIZE = 10;
const CHARS_PER_INCH_PER_PT = 1.9; // rough monospace-ish estimate, deliberately conservative
const LINE_HEIGHT_FACTOR = 1.35;
const OVERLAP_GAP = 0.1;
// A repositioning-only fix (no shrinking) is only offered when the
// resulting strip is still wide/tall enough to be useful — otherwise two
// large objects (e.g. a just-duplicated full-width content box, which
// realistically can't fit beside itself on a 10x5.63 slide) get reported
// for the user to resize/move by hand rather than "fixed" into a sliver.
const MIN_USABLE_STRIP = 0.8;

function estimateTextHeightIn(obj) {
  const text = obj.bulleted ? (obj.lines || []).join(' ') : (obj.text || '');
  if (!text) return 0;
  const charsPerLine = Math.max(1, (obj.w * CHARS_PER_INCH_PER_PT * 72) / obj.fontSize);
  const lineCount = obj.bulleted
    ? (obj.lines || []).reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0)
    : Math.max(1, Math.ceil(text.length / charsPerLine));
  const lineHeightIn = (obj.fontSize / 72) * LINE_HEIGHT_FACTOR;
  return lineCount * lineHeightIn;
}

function boundsOf(obj) {
  return { left: obj.x, top: obj.y, right: obj.x + obj.w, bottom: obj.y + obj.h };
}
function intersects(a, b) {
  const ab = boundsOf(a), bb = boundsOf(b);
  return ab.left < bb.right && ab.right > bb.left && ab.top < bb.bottom && ab.bottom > bb.top;
}

export function runQualityChecks(objects, slidesMeta, theme) {
  const findings = [];

  slidesMeta.forEach((meta, slideIndex) => {
    const slideObjects = objects.filter((o) => o.slideIndex === slideIndex);

    if (!meta.title || !meta.title.trim()) {
      findings.push({ id: `missing-title-${slideIndex}`, slideIndex, severity: 'warning', type: 'missing-title', autoFixable: false, message: `Slide ${slideIndex + 1} has no title.` });
    }

    slideObjects.forEach((obj) => {
      if (obj.background) return; // full-slide fills are intentional, not "out of bounds"

      const b = boundsOf(obj);
      if (b.left < -0.01 || b.top < -0.01 || b.right > SLIDE_W + 0.01 || b.bottom > SLIDE_H + 0.01) {
        findings.push({ id: `oob-${obj.id}`, slideIndex, objectId: obj.id, severity: 'error', type: 'out-of-bounds', autoFixable: true, message: `Slide ${slideIndex + 1}: an object extends past the edge of the slide.` });
      }

      if (obj.type === 'text' && obj.fontSize) {
        const estimatedH = estimateTextHeightIn(obj);
        if (estimatedH > obj.h * 1.15) {
          findings.push({ id: `overflow-${obj.id}`, slideIndex, objectId: obj.id, severity: 'error', type: 'text-overflow', autoFixable: true, message: `Slide ${slideIndex + 1}: text looks too long for its box and may overflow.` });
        }
        if (obj.bulleted && (obj.lines || []).length > 6) {
          findings.push({ id: `density-${obj.id}`, slideIndex, objectId: obj.id, severity: 'warning', type: 'excessive-text', autoFixable: false, message: `Slide ${slideIndex + 1}: more than 6 bullet points — consider splitting this slide.` });
        }
        const knownSizes = Object.values(theme.fontSizes);
        if (!knownSizes.includes(obj.fontSize)) {
          findings.push({ id: `fontsize-${obj.id}`, slideIndex, objectId: obj.id, severity: 'warning', type: 'inconsistent-font-size', autoFixable: false, message: `Slide ${slideIndex + 1}: a text box uses a font size outside the theme's scale.` });
        }
      }
    });

    for (let i = 0; i < slideObjects.length; i++) {
      for (let j = i + 1; j < slideObjects.length; j++) {
        const a = slideObjects[i], b = slideObjects[j];
        if (a.background || b.background) continue;
        if (intersects(a, b)) {
          const belowSpace = SLIDE_H - (a.y + a.h) - OVERLAP_GAP;
          const rightSpace = SLIDE_W - (a.x + a.w) - OVERLAP_GAP;
          const canReposition = belowSpace >= Math.min(b.h, MIN_USABLE_STRIP) || rightSpace >= Math.min(b.w, MIN_USABLE_STRIP);
          findings.push({
            id: `overlap-${a.id}-${b.id}`, slideIndex, objectId: a.id, otherObjectId: b.id, severity: 'warning', type: 'overlap',
            autoFixable: canReposition,
            message: canReposition
              ? `Slide ${slideIndex + 1}: two objects overlap.`
              : `Slide ${slideIndex + 1}: two objects overlap and are too large to reposition automatically — move or resize one by hand.`,
          });
        }
      }
    }

    const hasHeadingSize = slideObjects.some((o) => o.type === 'text' && o.fontSize >= theme.fontSizes.heading);
    if (slideObjects.some((o) => o.type === 'text') && !hasHeadingSize) {
      findings.push({ id: `hierarchy-${slideIndex}`, slideIndex, severity: 'warning', type: 'missing-hierarchy', autoFixable: false, message: `Slide ${slideIndex + 1}: no clearly larger heading — visual hierarchy may be flat.` });
    }
  });

  return findings;
}

export function applyAutoFixes(objects, findings) {
  let next = [...objects];

  findings.filter((f) => f.autoFixable).forEach((f) => {
    if (f.type === 'out-of-bounds') {
      next = next.map((o) => {
        if (o.id !== f.objectId) return o;
        const w = Math.min(o.w, SLIDE_W);
        const h = Math.min(o.h, SLIDE_H);
        const x = Math.min(Math.max(o.x, 0), SLIDE_W - w);
        const y = Math.min(Math.max(o.y, 0), SLIDE_H - h);
        return { ...o, x, y, w, h };
      });
    }
    if (f.type === 'text-overflow') {
      next = next.map((o) => {
        if (o.id !== f.objectId) return o;
        const shrunk = Math.max(MIN_FONT_SIZE, Math.round(o.fontSize * 0.85));
        return { ...o, fontSize: shrunk };
      });
    }
    if (f.type === 'overlap') {
      // Only reached when runQualityChecks already confirmed a genuinely
      // non-overlapping placement fits (autoFixable is false otherwise) —
      // so this always fully separates the two objects, never leaves a
      // partial/cosmetic overlap behind. A fixed small nudge doesn't work
      // here: the common trigger is a freshly duplicated object sitting
      // only ~0.2in off its original, which a tiny nudge won't clear.
      const a = next.find((o) => o.id === f.objectId);
      const b = next.find((o) => o.id === f.otherObjectId);
      if (a && b) {
        const belowSpace = SLIDE_H - (a.y + a.h) - OVERLAP_GAP;
        const rightSpace = SLIDE_W - (a.x + a.w) - OVERLAP_GAP;
        let x = b.x, y = b.y;
        if (belowSpace >= Math.min(b.h, MIN_USABLE_STRIP)) {
          y = a.y + a.h + OVERLAP_GAP;
        } else {
          x = a.x + a.w + OVERLAP_GAP;
        }
        next = next.map((o) => (o.id === f.otherObjectId ? { ...o, x, y } : o));
      }
    }
  });

  return next;
}
